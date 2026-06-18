import fs from 'fs';
import path from 'path';
import readline from 'readline';

const STREAMS_DIR = path.join(process.cwd(), 'iptv-master', 'streams');
const SERVER1_PATH = path.join(process.cwd(), 'iptv-master', 'server1_streams.json');
const SERVER3_PATH = path.join(process.cwd(), 'iptv-master', 'server3.m3u');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'static-api');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function detectCountryByName(name: string, url: string): string {
  const nameLc = name.toLowerCase();
  const urlLc = url.toLowerCase();
  
  if (nameLc.includes('🇧🇩') || nameLc.includes('bangla') || nameLc.includes('btv') || nameLc.includes('somoy') || nameLc.includes('jamuna') || nameLc.includes('ekattor') || nameLc.includes('independent') || nameLc.includes('ntv') || nameLc.includes('deepto') || nameLc.includes('rajdhani') || nameLc.includes('bengali') || nameLc.includes('projapoti') || nameLc.includes('t sports') || urlLc.includes('tsports')) {
    return 'bd';
  } else if (nameLc.includes('🇮🇳') || nameLc.includes('star sports') || nameLc.includes('sony sports') || nameLc.includes('willow') || nameLc.includes('fancode') || nameLc.includes('criclife')) {
    return 'in';
  } else if (nameLc.includes('🇺🇸') || nameLc.includes('fox') || nameLc.includes('nbc') || nameLc.includes('telemundo') || nameLc.includes('fubo') || nameLc.includes('nba') || nameLc.includes('dazn')) {
    return 'us';
  } else if (nameLc.includes('🇧🇷') || nameLc.includes('caze')) {
    return 'br';
  } else if (nameLc.includes('🇪🇸') || nameLc.includes('laliga')) {
    return 'es';
  } else if (nameLc.includes('🇦🇺')) {
    return 'au';
  } else if (nameLc.includes('🇹🇷') || nameLc.includes('idman')) {
    return 'tr';
  } else if (nameLc.includes('🇵🇰') || nameLc.includes('ptv')) {
    return 'pk';
  } else if (nameLc.includes('🇬🇧') || nameLc.includes('sky sport')) {
    return 'uk';
  } else if (nameLc.includes('🇵🇹')) {
    return 'pt';
  } else if (nameLc.includes('ru') || nameLc.includes('🇷🇺') || nameLc.includes('матч')) {
    return 'ru';
  } else if (nameLc.includes('fr') || nameLc.includes('🇫🇷') || nameLc.includes('eurosport')) {
    return 'fr';
  } else if (nameLc.includes('colombia') || nameLc.includes('🇨🇴') || nameLc.includes('caracol') || nameLc.includes('rcn') || nameLc.includes('win sport')) {
    return 'co';
  } else if (nameLc.includes('🇦🇱') || nameLc.includes('super sport')) {
    return 'al';
  } else if (nameLc.includes('🇨🇿') || nameLc.includes('sport 1 hd') || nameLc.includes('sport 2 hd')) {
    return 'cz';
  } else if (nameLc.includes('🇧🇬') || nameLc.includes('max sport')) {
    return 'bg';
  } else if (nameLc.includes('🇭🇺') || nameLc.includes('m4 sport')) {
    return 'hu';
  } else if (nameLc.includes('🇳🇱') || nameLc.includes('ziggo')) {
    return 'nl';
  } else if (nameLc.includes('🇦🇹') || nameLc.includes('orf')) {
    return 'at';
  } else if (nameLc.includes('🇺🇦') || nameLc.includes('suspilne') || nameLc.includes('setanta')) {
    return 'ua';
  }
  return 'int';
}

async function run() {
  try {
    const files = fs.readdirSync(STREAMS_DIR).filter(f => f.endsWith('.m3u'));
    const countries = files.map(f => f.replace('.m3u', ''));

    const server1Data = fs.existsSync(SERVER1_PATH) ? JSON.parse(fs.readFileSync(SERVER1_PATH, 'utf-8')) : {};
    
    // Process Server 3
    const server3ChannelsByCountry: Record<string, any[]> = {};
    if (fs.existsSync(SERVER3_PATH)) {
      const content = fs.readFileSync(SERVER3_PATH, 'utf-8');
      const lines = content.split('\n');
      let currentItem: any = {};
      for (const line of lines) {
        const tLine = line.trim();
        if (tLine.startsWith('#EXTINF:')) {
          const parts = tLine.split(',');
          currentItem.name = parts.length > 1 ? parts[parts.length - 1].trim() : 'Unknown';
          const logoMatch = tLine.match(/tvg-logo="([^"]+)"/);
          if (logoMatch) currentItem.logo = logoMatch[1];
        } else if (tLine.startsWith('http')) {
          if (currentItem.name) {
            const country = detectCountryByName(currentItem.name, tLine);
            if (!server3ChannelsByCountry[country]) server3ChannelsByCountry[country] = [];
            server3ChannelsByCountry[country].push({
              name: currentItem.name,
              url: tLine,
              logo: currentItem.logo || "",
              source: '3',
              country
            });
            currentItem = {};
          }
        }
      }
    }

    // Get unique list of countries from all sources
    const allCountryKeys = new Set([...countries, ...Object.keys(server1Data), ...Object.keys(server3ChannelsByCountry)]);
    const finalCountries = Array.from(allCountryKeys).sort();

    fs.writeFileSync(path.join(OUTPUT_DIR, 'channels.json'), JSON.stringify(finalCountries));
    console.log('Generated channels.json');

    const allChannels: any[] = [];
    for (const country of finalCountries) {
      const countryChannels: any[] = [];
      
      // Server 1
      if (server1Data[country]) {
        server1Data[country].forEach((ch: any) => {
          const item = {
            name: ch.name,
            url: ch.url,
            urls: ch.urls || undefined,
            logo: ch.logo || "",
            source: '1',
            country
          };
          countryChannels.push(item);
          allChannels.push(item);
        });
      }

      // Server 2 (M3U File)
      const filePath = path.join(STREAMS_DIR, `${country}.m3u`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        let currentItem: any = {};
        for (const line of lines) {
          const tLine = line.trim();
          if (tLine.startsWith('#EXTINF:')) {
            const parts = tLine.split(',');
            currentItem.name = parts.length > 1 ? parts[parts.length - 1].trim() : 'Unknown';
            const logoMatch = tLine.match(/tvg-logo="([^"]+)"/);
            if (logoMatch) currentItem.logo = logoMatch[1];
          } else if (tLine.startsWith('http')) {
            if (currentItem.name) {
              const item = {
                name: currentItem.name,
                url: tLine,
                logo: currentItem.logo || "",
                source: '2',
                country
              };
              countryChannels.push(item);
              allChannels.push(item);
              currentItem = {};
            }
          }
        }
      }

      // Server 3
      if (server3ChannelsByCountry[country]) {
        server3ChannelsByCountry[country].forEach((ch: any) => {
          countryChannels.push(ch);
          allChannels.push(ch);
        });
      }

      // Sort country channels alphabetically by name
      countryChannels.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      fs.writeFileSync(path.join(OUTPUT_DIR, `${country}.json`), JSON.stringify(countryChannels));
    }

    // Generate Special Categories
    const fifaKeywords = [
      'fifa', 'world cup', 'worldcup', 'copa américa', 'copa america', 'euro 202', 'euro202', 'live football', 
      'live match', 'live tournament', 'fifaplus', 'fifa plus'
    ];
    const sportsKeywords = [
      'sport', 'sports', 'cricket', 'football', 'soccer', 'tennis', 'espn', 'bein', 'realsport', 'beout',
      'tsports', 't_sports', 'gtv', 'gazi', 'sony ten', 'sony sports', 'ten sports', 'willow', 'supersport',
      'astro super', 'eurosport', 'bt sport', 'tnt sport', 'pvs', 'directv', 'fox sport', 'dstv', 'kwese',
      'polsat', 'canal+', 'canal plus', 'arena sport', 'novasports', 'ad sports', 'dubai sports', 'ssc',
      'alkass', 'jazera', 'cctv5', 'cctv-5', 'rai sport', 'tvp sport', 'la1', 'la 1', 'tf1', 'm6', 'w9',
      'abc sports', 'cbssports', 'nbc sports', 'caze', 'coze', 'cazetv', 'pishow', 'bwtv', 'olympics',
      'wfaf', 'match tv', 'fanatiz', 'optus', 'sky sport', 'willow sports', 'willow cricket',
      'star sports', 'starsports', 'starsports1'
    ];

    const fifaChannels = allChannels.filter(ch => 
      fifaKeywords.some(kw => ch.name.toLowerCase().includes(kw)) || ch.name.toLowerCase().includes('bein sports 1')
    );
    fifaChannels.sort((a, b) => {
      const isA_beIn1 = a.name.toLowerCase().includes('bein sports 1');
      const isB_beIn1 = b.name.toLowerCase().includes('bein sports 1');
      if (isA_beIn1 && !isB_beIn1) return -1;
      if (!isA_beIn1 && isB_beIn1) return 1;

      const priorityKeywords = ['fifa', 'world cup', 'plus', 'star'];
      const aPriority = priorityKeywords.some(k => a.name.toLowerCase().includes(k)) ? 0 : 1;
      const bPriority = priorityKeywords.some(k => b.name.toLowerCase().includes(k)) ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.name.localeCompare(b.name);
    });
    const sportsChannelsRaw = allChannels.filter(ch =>
      sportsKeywords.some(kw => ch.name.toLowerCase().includes(kw))
    );

    // Deduplicate sports channels by URL
    const uniqueSportsMap = new Map<string, any>();
    for (const ch of sportsChannelsRaw) {
      const existing = uniqueSportsMap.get(ch.url);
      if (!existing) {
        uniqueSportsMap.set(ch.url, ch);
      } else {
        // If duplicate, keep the one with "(New)" or longer name
        const currentIsNew = ch.name.toLowerCase().includes('(new)');
        const existingIsNew = existing.name.toLowerCase().includes('(new)');
        if (currentIsNew && !existingIsNew) {
          uniqueSportsMap.set(ch.url, ch);
        } else if (!existingIsNew && ch.name.length > existing.name.length) {
          uniqueSportsMap.set(ch.url, ch);
        }
      }
    }
    const sportsChannels = Array.from(uniqueSportsMap.values());

    // Premium sorting for the Sports section
    sportsChannels.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();

      // 1. Prioritize "(New)" tags
      const aNew = aLower.includes('(new)');
      const bNew = bLower.includes('(new)');
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;

      // 2. Prioritize premium/highly popular sports networks
      const priorityNetworks = [
        'starsports', 'star sports', 'tsports', 't sports', 'gazi', 'gtv', 'sony ten', 'sony sports', 
        'espn', 'bein', 'willow', 'supersport', 'sky sport', 'eurosport', 'fox sport', 'tnt sport', 'bt sport'
      ];
      const aPriorityIdx = priorityNetworks.findIndex(kw => aLower.includes(kw));
      const bPriorityIdx = priorityNetworks.findIndex(kw => bLower.includes(kw));

      if (aPriorityIdx > -1 && bPriorityIdx > -1) {
        if (aPriorityIdx !== bPriorityIdx) return aPriorityIdx - bPriorityIdx;
      } else if (aPriorityIdx > -1) {
        return -1;
      } else if (bPriorityIdx > -1) {
        return 1;
      }

      // 3. Fallback to alphabetical sorting
      return a.name.localeCompare(b.name);
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'fifa.json'), JSON.stringify(fifaChannels));
    console.log(`Generated fifa.json with ${fifaChannels.length} channels`);

    fs.writeFileSync(path.join(OUTPUT_DIR, 'sports.json'), JSON.stringify(sportsChannels));
    console.log(`Generated sports.json with ${sportsChannels.length} channels`);

    // Generate Universal Search Index
    fs.writeFileSync(path.join(OUTPUT_DIR, 'search-index.json'), JSON.stringify(allChannels));
    console.log('Generated search-index.json with ' + allChannels.length + ' channels.');

    console.log(`Generated ${countries.length} country channel files.`);

  } catch (error) {
    console.error('Error generating static data:', error);
    process.exit(1);
  }
}

run();
