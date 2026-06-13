import fs from 'fs';
import path from 'path';

const STREAMS_DIR = path.join(process.cwd(), 'iptv-master', 'streams');
const SERVER1_PATH = path.join(process.cwd(), 'iptv-master', 'server1_streams.json');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'static-api');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. Generate channels.json (list of countries)
try {
  const files = fs.readdirSync(STREAMS_DIR).filter(f => f.endsWith('.m3u'));
  const countries = files.map(f => f.replace('.m3u', ''));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'channels.json'), JSON.stringify(countries));
  console.log('Generated channels.json');

  // 2. Generate channels/[country].json
  const server1Data = fs.existsSync(SERVER1_PATH) ? JSON.parse(fs.readFileSync(SERVER1_PATH, 'utf-8')) : {};

  countries.forEach(country => {
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
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let currentItem: any = {};
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
          const parts = line.split(',');
          currentItem.name = parts.length > 1 ? parts[parts.length - 1].trim() : 'Unknown';
          const logoMatch = line.match(/tvg-logo="([^"]+)"/);
          if (logoMatch) currentItem.logo = logoMatch[1];
        } else if (line.startsWith('http')) {
          if (currentItem.name) {
            channels.push({
              name: currentItem.name,
              url: line,
              logo: currentItem.logo || "",
              source: 'global'
            });
            currentItem = {};
          }
        }
      }
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, `${country}.json`), JSON.stringify(channels));
  });
  console.log(`Generated ${countries.length} country channel files.`);

} catch (error) {
  console.error('Error generating static data:', error);
  process.exit(1);
}
