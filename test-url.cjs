const https = require('https');
const http = require('http');

const urls = [
  'https://bozztv.com/rongo/rongo-somoy/index.m3u8',
  'https://bozztv.com/rongo/rongo-JamunaTelevision/index.m3u8',
  'https://owrcovcrpy.gpcdn.net/bpk-tv/1702/output/index.m3u8',
  'https://owrcovcrpy.gpcdn.net/bpk-tv/1709/output/1709.m3u8',
  'https://owrcovcrpy.gpcdn.net/bpk-tv/1703/output/index.m3u8',
  'https://owrcovcrpy.gpcdn.net/bpk-tv/1704/output/1704.m3u8',
  'https://tvsen6.aynaott.com/somoytv/index.m3u8',
  'https://tvsen7.aynaott.com/tsports-hd/index.m3u8',
  'https://tvsen7.aynaott.com/tsportsfhd/index.m3u8',
  'http://alvetv.com/moviebanglatv/8080/index.m3u8'
];

async function checkUrl(urlStr) {
  return new Promise((resolve) => {
    const isHttps = urlStr.startsWith('https');
    const client = isHttps ? https : http;
    
    let resolved = false;
    const req = client.get(urlStr, {
      headers: {
        'User-Agent': 'VLC/3.0.9 LibVLC/3.0.9'
      }
    }, (res) => {
      resolved = true;
      resolve({ url: urlStr, status: res.statusCode });
    });
    
    req.on('error', (err) => {
      resolved = true;
      resolve({ url: urlStr, status: 'ERROR: ' + err.message });
    });
    
    setTimeout(() => {
      if (!resolved) {
        req.destroy();
        resolve({ url: urlStr, status: 'TIMEOUT' });
      }
    }, 4000);
  });
}

async function run() {
  for (const url of urls) {
    const result = await checkUrl(url);
    console.log(`${result.status} -> ${result.url}`);
  }
}

run();

