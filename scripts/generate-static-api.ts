import fs from 'fs';
import path from 'path';
import readline from 'readline';

const STREAMS_DIR = path.join(process.cwd(), 'iptv-master', 'streams');
const SERVER1_PATH = path.join(process.cwd(), 'iptv-master', 'server1_streams.json');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'static-api');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  try {
    const files = fs.readdirSync(STREAMS_DIR).filter(f => f.endsWith('.m3u'));
    const countries = files.map(f => f.replace('.m3u', ''));

    const server1Data = fs.existsSync(SERVER1_PATH) ? JSON.parse(fs.readFileSync(SERVER1_PATH, 'utf-8')) : {};
    
    // Get unique list of countries from both sources
    const allCountryKeys = new Set([...countries, ...Object.keys(server1Data)]);
    const finalCountries = Array.from(allCountryKeys).sort();

    fs.writeFileSync(path.join(OUTPUT_DIR, 'channels.json'), JSON.stringify(finalCountries));
    console.log('Generated channels.json');

    for (const country of finalCountries) {
      const channels: any[] = [];
      
      // Server 1
      if (server1Data[country]) {
        server1Data[country].forEach((ch: any) => {
          channels.push({
            name: ch.name,
            url: ch.url,
            logo: ch.logo || "",
            source: 'server1'
          });
        });
      }

      // Server 2 (M3U File)
      const filePath = path.join(STREAMS_DIR, `${country}.m3u`);
      if (fs.existsSync(filePath)) {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });
        
        let currentItem: any = {};
        for await (const line of rl) {
          const tLine = line.trim();
          if (tLine.startsWith('#EXTINF:')) {
            const parts = tLine.split(',');
            currentItem.name = parts.length > 1 ? parts[parts.length - 1].trim() : 'Unknown';
            const logoMatch = tLine.match(/tvg-logo="([^"]+)"/);
            if (logoMatch) currentItem.logo = logoMatch[1];
          } else if (tLine.startsWith('http')) {
            if (currentItem.name) {
              channels.push({
                name: currentItem.name,
                url: tLine,
                logo: currentItem.logo || "",
                source: 'global'
              });
              currentItem = {};
            }
          }
        }
      }

      fs.writeFileSync(path.join(OUTPUT_DIR, `${country}.json`), JSON.stringify(channels));
    }
    console.log(`Generated ${countries.length} country channel files.`);

  } catch (error) {
    console.error('Error generating static data:', error);
    process.exit(1);
  }
}

run();
