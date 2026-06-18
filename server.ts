import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import http from "http";
import https from "https";

import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // In-memory cache for resolved subdomains (e.g. 'somoytv' -> 'tvsen12.aynaott.com')
  const resolvedSubdomains: { [channelKey: string]: string } = {};

  const parseServer3M3U = () => {
    const filePath = path.join(process.cwd(), 'iptv-master', 'server3.m3u');
    if (!fs.existsSync(filePath)) return [];
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const channels: any[] = [];
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
          const nameLc = currentItem.name.toLowerCase();
          const urlLc = line.toLowerCase();
          let detectedCountry = 'int'; // default to international
          
          if (nameLc.includes('🇧🇩') || nameLc.includes('bangla') || nameLc.includes('btv') || nameLc.includes('somoy') || nameLc.includes('jamuna') || nameLc.includes('ekattor') || nameLc.includes('independent') || nameLc.includes('ntv') || nameLc.includes('deepto') || nameLc.includes('rajdhani') || nameLc.includes('bengali') || nameLc.includes('projapoti') || nameLc.includes('t sports') || urlLc.includes('tsports')) {
            detectedCountry = 'bd';
          } else if (nameLc.includes('🇮🇳') || nameLc.includes('star sports') || nameLc.includes('sony sports') || nameLc.includes('willow') || nameLc.includes('fancode') || nameLc.includes('criclife')) {
            detectedCountry = 'in';
          } else if (nameLc.includes('🇺🇸') || nameLc.includes('fox') || nameLc.includes('nbc') || nameLc.includes('telemundo') || nameLc.includes('fubo') || nameLc.includes('nba') || nameLc.includes('dazn')) {
            detectedCountry = 'us';
          } else if (nameLc.includes('🇧🇷') || nameLc.includes('caze')) {
            detectedCountry = 'br';
          } else if (nameLc.includes('🇪🇸') || nameLc.includes('laliga')) {
            detectedCountry = 'es';
          } else if (nameLc.includes('🇦🇺')) {
            detectedCountry = 'au';
          } else if (nameLc.includes('🇹🇷') || nameLc.includes('idman')) {
            detectedCountry = 'tr';
          } else if (nameLc.includes('🇵🇰') || nameLc.includes('ptv')) {
            detectedCountry = 'pk';
          } else if (nameLc.includes('🇬🇧') || nameLc.includes('sky sport')) {
            detectedCountry = 'uk';
          } else if (nameLc.includes('🇵🇹')) {
            detectedCountry = 'pt';
          } else if (nameLc.includes('ru') || nameLc.includes('🇷🇺') || nameLc.includes('матч')) {
            detectedCountry = 'ru';
          } else if (nameLc.includes('fr') || nameLc.includes('🇫🇷') || nameLc.includes('eurosport')) {
            detectedCountry = 'fr';
          } else if (nameLc.includes('colombia') || nameLc.includes('🇨🇴') || nameLc.includes('caracol') || nameLc.includes('rcn') || nameLc.includes('win sport')) {
            detectedCountry = 'co';
          } else if (nameLc.includes('🇦🇱') || nameLc.includes('super sport')) {
            detectedCountry = 'al';
          } else if (nameLc.includes('🇨🇿') || nameLc.includes('sport 1 hd') || nameLc.includes('sport 2 hd')) {
            detectedCountry = 'cz';
          } else if (nameLc.includes('🇧🇬') || nameLc.includes('max sport')) {
            detectedCountry = 'bg';
          } else if (nameLc.includes('🇭🇺') || nameLc.includes('m4 sport')) {
            detectedCountry = 'hu';
          } else if (nameLc.includes('🇳🇱') || nameLc.includes('ziggo')) {
            detectedCountry = 'nl';
          } else if (nameLc.includes('🇦🇹') || nameLc.includes('orf')) {
            detectedCountry = 'at';
          } else if (nameLc.includes('🇺🇦') || nameLc.includes('suspilne') || nameLc.includes('setanta')) {
            detectedCountry = 'ua';
          }

          channels.push({
            name: currentItem.name,
            url: line,
            logo: currentItem.logo || "",
            source: '3',
            country: detectedCountry
          });
          currentItem = {};
        }
      }
    }
    return channels;
  };

  let cachedServer3Channels: any[] | null = null;
  const getServer3Channels = () => {
    if (cachedServer3Channels) return cachedServer3Channels;
    try {
      const parsed = parseServer3M3U();
      cachedServer3Channels = parsed;
      return parsed;
    } catch (e) {
      console.error("Error parsing Server 3 channels:", e);
      return [];
    }
  };

  const getChannelKey = (urlStr: string) => {
    try {
      const u = new URL(urlStr);
      const parts = u.pathname.split('/');
      return parts.find(p => p && p.trim() !== '') || '';
    } catch {
      return '';
    }
  };

  // CORS and Preflight middleware for all API endpoints
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API routes go here FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get('/api/proxy', async (req, res) => {
    const originalTargetUrl = req.query.url as string;
    if (!originalTargetUrl) return res.status(400).send('URL required');

    const proxyHost = req.query.proxyHost as string;
    const proxyPort = req.query.proxyPort as string;
    const proxyType = req.query.proxyType as string || 'socks5';

    let agent: any = null;
    if (proxyHost && proxyPort) {
      const proxyUrl = `${proxyType}://${proxyHost}:${proxyPort}`;
      try {
        if (proxyType === 'socks5') {
          agent = new SocksProxyAgent(proxyUrl);
        } else if (proxyType === 'http') {
          agent = originalTargetUrl.startsWith('https') ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
        }
      } catch (err) {
        console.error("Agent creation failed", err);
      }
    }

    // List of reliable tvsen subdomains to try in fallback sequence
    const subdomainsToTry = ['tvsen12', 'tvsen14', 'tvsen11', 'tvsen15', 'tvsen5', 'tvsen7', 'tvsen6', 'tvsen13'];

    // Helper to make a request to a URL and verify if it's working (status 200)
    const tryRequest = (urlStr: string, depth = 0): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; resStream: http.IncomingMessage; finalUrl: string } | null> => {
      if (depth > 5) return Promise.resolve(null); // Max redirects

      return new Promise((resolve) => {
        let isResolved = false;
        const client = urlStr.startsWith('https') ? https : http;

        let targetOrigin = '';
        try {
          const u = new URL(urlStr);
          targetOrigin = u.origin;
        } catch {}

        const reqHeaders: Record<string, string> = {
          'User-Agent': (req.query.userAgent as string) || 'VLC/3.0.9 LibVLC/3.0.9',
          'Accept': '*/*',
          'Connection': 'keep-alive'
        };

        if (req.query.referer) {
          reqHeaders['Referer'] = req.query.referer as string;
        }

        if (req.headers.range) {
          reqHeaders['Range'] = req.headers.range as string;
        }

        if (req.headers['accept-language']) {
          reqHeaders['Accept-Language'] = req.headers['accept-language'] as string;
        }

        const options = {
          agent: agent,
          timeout: 15000,
          headers: reqHeaders
        };

        const clientReq = client.get(urlStr, options, async (clientRes) => {
          isResolved = true;
          
          // Handle Redirects
          if ([301, 302, 307, 308].includes(clientRes.statusCode || 0) && clientRes.headers.location) {
            let redirectUrl = clientRes.headers.location;
            if (!redirectUrl.startsWith('http')) {
              const u = new URL(urlStr);
              redirectUrl = u.origin + (redirectUrl.startsWith('/') ? '' : '/') + redirectUrl;
            }
            clientRes.destroy();
            const nextResult = await tryRequest(redirectUrl, depth + 1);
            resolve(nextResult);
            return;
          }

          resolve({ 
            statusCode: clientRes.statusCode || 200, 
            headers: clientRes.headers, 
            resStream: clientRes,
            finalUrl: urlStr
          });
        });

        clientReq.on('timeout', () => {
          if (!isResolved) {
            isResolved = true;
            clientReq.destroy();
            resolve(null);
          }
        });

        clientReq.on('error', (e) => {
          console.error(`Proxy request error for ${urlStr}:`, e.message);
          if (!isResolved) {
            isResolved = true;
            resolve(null);
          }
        });

        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            clientReq.destroy();
            resolve(null);
          }
        }, 8000); // 8s timeout per attempt
      });
    };

    let targetUrl = originalTargetUrl;
    const isAynaott = targetUrl.includes('aynaott.com');
    const channelKey = getChannelKey(targetUrl);

    // If it's aynaott, attempt to resolve using cached working subdomain
    if (isAynaott && channelKey) {
      if (resolvedSubdomains[channelKey]) {
        try {
          const u = new URL(targetUrl);
          u.host = resolvedSubdomains[channelKey];
          targetUrl = u.toString();
        } catch {}
      }
    }

    // Attempt the current targetUrl
    let result = await tryRequest(targetUrl);

    // If it fails (e.g. 404 or connection error) and it's aynaott, resolve and auto-fall-back!
    if (isAynaott && channelKey && (!result || result.statusCode === 404 || result.statusCode === 403)) {
      if (result && result.resStream) {
        result.resStream.destroy(); // clean up previous response
      }

      console.log(`Smart proxy adjusting dead subdomain for channel: ${channelKey}`);
      let resolvedUrl = '';
      
      for (const subdomain of subdomainsToTry) {
        try {
          const u = new URL(originalTargetUrl);
          u.host = `${subdomain}.aynaott.com`;
          const testUrl = u.toString();
          
          const testResult = await tryRequest(testUrl);
          if (testResult && testResult.statusCode === 200) {
            console.log(`Successfully auto-resolved ${channelKey} to ${subdomain}.aynaott.com`);
            resolvedSubdomains[channelKey] = `${subdomain}.aynaott.com`;
            resolvedUrl = testUrl;
            result = testResult;
            break;
          } else if (testResult && testResult.resStream) {
            testResult.resStream.destroy();
          }
        } catch (err) {
          console.error(`Subdomain ${subdomain} test error:`, err);
        }
      }

      if (resolvedUrl) {
        targetUrl = resolvedUrl;
      }
    }

    if (!result) {
      return res.status(502).send('Error connecting to target stream host');
    }

    const { statusCode, headers, resStream, finalUrl } = result;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    
    if (headers['content-type']) {
      res.setHeader('Content-Type', headers['content-type']);
    }
    if (headers['content-range']) {
      res.setHeader('Content-Range', headers['content-range']);
      res.status(206);
    } else {
      res.status(statusCode || 200);
    }
    if (headers['accept-ranges']) {
      res.setHeader('Accept-Ranges', headers['accept-ranges']);
    }

    const isM3u8 = targetUrl.toLowerCase().includes('.m3u8') || 
                   (headers['content-type'] && (
                     headers['content-type'].includes('mpegurl') || 
                     headers['content-type'].includes('x-mpegURL') || 
                     headers['content-type'].includes('application/vnd.apple.mpegurl')
                   ));
    
    const userAgentParam = req.query.userAgent ? `&userAgent=${encodeURIComponent(req.query.userAgent as string)}` : '';
    const refererParam = req.query.referer ? `&referer=${encodeURIComponent(req.query.referer as string)}` : '';
    const proxyParams = (proxyHost && proxyPort ? `&proxyHost=${proxyHost}&proxyPort=${proxyPort}&proxyType=${proxyType}` : '') + userAgentParam + refererParam;

    if (isM3u8) {
      let body = '';
      resStream.on('data', chunk => body += chunk);
      resStream.on('end', () => {
         const lines = body.split('\n');
         const rewritten = lines.map(line => {
           let trimmed = line.trim();
           if (!trimmed) return line;
           
           // Rewrite segment variant URLs
           if (!trimmed.startsWith('#')) {
              let absoluteUrl = trimmed;
              try {
                if (!trimmed.startsWith('http')) {
                  const urlObj = new URL(finalUrl);
                  const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
                  absoluteUrl = urlObj.origin + basePath + trimmed;
                }
                // Avoid double proxying if something is already proxied
                if (absoluteUrl.includes('/api/proxy?url=')) return line;
                return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}${proxyParams}`;
              } catch (e) {
                return line;
              }
           }
           
           // Rewrite embedded URIs (like EXT-X-KEY)
           if (trimmed.startsWith('#EXT-X-')) {
             return line.replace(/URI="([^"]+)"/g, (match, p1) => {
               try {
                 let absoluteUrl = p1;
                 if (!p1.startsWith('http')) {
                   const urlObj = new URL(finalUrl);
                   const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
                   absoluteUrl = urlObj.origin + basePath + p1;
                 }
                 return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}${proxyParams}"`;
               } catch (e) {
                 return match;
               }
             });
           }
           
           return line;
         }).join('\n');
         res.send(rewritten);
      });
    } else {
      // For video segments (.ts, .aac, etc), pipe directly but ensure proper headers
      if (headers['content-length']) res.setHeader('Content-Length', headers['content-length']);
      resStream.pipe(res);
    }
  });

  app.get('/api/image-proxy', (req, res) => {
    const urlStr = req.query.url as string;
    if (!urlStr) return res.status(400).send('URL required');
    
    // Some basic validation
    if (!urlStr.startsWith('http')) {
      return res.status(400).send('Invalid URL');
    }

    const client = urlStr.startsWith('https') ? https : http;
    const reqProxy = client.get(urlStr, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
    }, (proxyRes) => {
      // Forward status code and content-type
      if (proxyRes.statusCode) {
        res.status(proxyRes.statusCode);
      }
      if (proxyRes.headers['content-type']) {
        res.setHeader('Content-Type', proxyRes.headers['content-type']);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400');
      proxyRes.pipe(res);
    });
    
    reqProxy.on('error', (err) => {
      console.error('Image proxy error:', err.message);
      res.status(500).send('Error proxying image');
    });
  });

  // Universal Global Search Endpoint
  app.get('/api/search', (req, res) => {
    const query = (req.query.q as string || '').toLowerCase().trim();
    if (!query) return res.json([]);

    const server1Path = path.join(process.cwd(), 'iptv-master', 'server1_streams.json');
    const streamsDir = path.join(process.cwd(), 'iptv-master', 'streams');
    
    try {
      const matched: any[] = [];
      const seenUrls = new Set<string>();

      // 1. Search in Server 1 JSON
      if (fs.existsSync(server1Path)) {
        const server1Data = JSON.parse(fs.readFileSync(server1Path, 'utf-8'));
        Object.keys(server1Data).forEach(countryCode => {
          if (Array.isArray(server1Data[countryCode])) {
            server1Data[countryCode].forEach((ch: any) => {
              if (ch.name && ch.name.toLowerCase().includes(query)) {
                const uniqueKey = `${countryCode}_1_${ch.url}`;
                if (!seenUrls.has(uniqueKey)) {
                  seenUrls.add(uniqueKey);
                  matched.push({
                    name: ch.name,
                    url: ch.url,
                    logo: ch.logo || "",
                    source: '1',
                    country: countryCode
                  });
                }
              }
            });
          }
        });
      }

      // 2. Search in Server 2 M3U files
      if (fs.existsSync(streamsDir)) {
        const files = fs.readdirSync(streamsDir).filter(f => f.endsWith('.m3u'));
        for (const file of files) {
          if (matched.length > 200) break; // Limit scans
          const countryCode = file.replace('.m3u', '');
          const filePath = path.join(streamsDir, file);
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
                if (currentItem.name.toLowerCase().includes(query)) {
                  const uniqueKey = `${countryCode}_2_${line}`;
                  if (!seenUrls.has(uniqueKey)) {
                    seenUrls.add(uniqueKey);
                    matched.push({
                      name: currentItem.name,
                      url: line,
                      logo: currentItem.logo || "",
                      source: '2',
                      country: countryCode
                    });
                  }
                }
                currentItem = {};
              }
            }
          }
        }
      }

      // 3. Search in Server 3 M3U
      const server3List = getServer3Channels();
      server3List.forEach(ch => {
        if (ch.name.toLowerCase().includes(query)) {
          const uniqueKey = `${ch.country}_3_${ch.url}`;
          if (!seenUrls.has(uniqueKey)) {
            seenUrls.add(uniqueKey);
            matched.push({
              name: ch.name,
              url: ch.url,
              logo: ch.logo || "",
              source: '3',
              country: ch.country
            });
          }
        }
      });

      // Sort matched results to prioritize exact matches, begins-with, and (new) tags
      matched.sort((a, b) => {
        const aLower = a.name.toLowerCase();
        const bLower = b.name.toLowerCase();
        const cleanQuery = query.replace(/[^a-z0-9]/g, '');
        const cleanA = aLower.replace(/[^a-z0-9]/g, '');
        const cleanB = bLower.replace(/[^a-z0-9]/g, '');

        // 1. Exact alphanumeric match
        const aExact = cleanA.includes(cleanQuery);
        const bExact = cleanB.includes(cleanQuery);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // 2. Starts with query
        const aStarts = aLower.startsWith(query);
        const bStarts = bLower.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // 3. New tag priority
        const aNew = aLower.includes('(new)');
        const bNew = bLower.includes('(new)');
        if (aNew && !bNew) return -1;
        if (!aNew && bNew) return 1;

        return a.name.localeCompare(b.name);
      });

      res.json(matched.slice(0, 120)); // Return top matched channels
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Add the API routes
  app.get('/api/channels', (req, res) => {
    const streamsDir = path.join(process.cwd(), 'iptv-master', 'streams');
    
    try {
      if (!fs.existsSync(streamsDir)) {
          return res.json([]);
      }
      const files = fs.readdirSync(streamsDir).filter(f => f.endsWith('.m3u'));
      const countries = files.map(f => f.replace('.m3u', ''));
      res.json(countries);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/channels/:country', (req, res) => {
    const country = req.params.country;
    const filePath = path.join(process.cwd(), 'iptv-master', 'streams', `${country}.m3u`);
    const server1Path = path.join(process.cwd(), 'iptv-master', 'server1_streams.json');
    
    try {
      let channels: any[] = [];

      // 1. Load Server 1 channels for this country
      if (country === 'fifa' || country === 'sports') {
        const staticPath = path.join(process.cwd(), 'public', 'static-api', `${country}.json`);
        if (fs.existsSync(staticPath)) {
          const staticData = JSON.parse(fs.readFileSync(staticPath, 'utf-8'));
          staticData.forEach((ch: any) => {
            channels.push({
              name: ch.name,
              url: ch.url,
              logo: ch.logo || "",
              source: (ch.source === '2' || ch.source === 'global') ? '2' : '1',
              country: country
            });
          });
        }
      } else {
        if (fs.existsSync(server1Path)) {
          const server1Data = JSON.parse(fs.readFileSync(server1Path, 'utf-8'));
          if (server1Data[country]) {
            server1Data[country].forEach((ch: any) => {
              channels.push({
                name: ch.name,
                url: ch.url,
                logo: ch.logo || "",
                source: '1',
                country: country
              });
            });
          }
        }
      }

      // 2. Load Server 2 (File Channels)
      if (country !== 'fifa' && country !== 'sports') {
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
                  source: '2',
                  country: country
                });
                currentItem = {};
              }
            }
          }
        }
      }

      // 3. Load Server 3 channels
      const server3List = getServer3Channels();
      if (country === 'fifa') {
        // Find channels matching FIFA in Server 3
        const server3Fifa = server3List.filter(ch => {
          const nameLc = ch.name.toLowerCase();
          return nameLc.includes('fifa') || nameLc.includes('world cup') || nameLc.includes('fwc') || nameLc.includes('bein sports 1');
        });
        channels = channels.concat(server3Fifa);
        
        // Custom order for FIFA:
        // - "bein sports 1" goes first
        // - "t sports" from Server 3 goes next
        // - others go last
        channels.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          
          const aBein = aName.includes('bein sports 1');
          const bBein = bName.includes('bein sports 1');
          if (aBein && !bBein) return -1;
          if (!aBein && bBein) return 1;

          const aTS = (a.source === '3' && (aName.includes('t sports') || aName.includes('tsports')));
          const bTS = (b.source === '3' && (bName.includes('t sports') || bName.includes('tsports')));
          if (aTS && !bTS) return -1;
          if (!aTS && bTS) return 1;

          return 0; // maintain relative order
        });

      } else if (country === 'sports') {
        // Find channels matching sports in Server 3
        const server3Sports = server3List.filter(ch => {
          const nameLc = ch.name.toLowerCase();
          const urlLc = ch.url.toLowerCase();
          return nameLc.includes('sports') || nameLc.includes('sport') || nameLc.includes('dazn') || nameLc.includes('football') || nameLc.includes('cup') || nameLc.includes('star sports') || nameLc.includes('sony sports') || nameLc.includes('ptv sports') || nameLc.includes('criclife') || nameLc.includes('fancode') || nameLc.includes('t sports') || urlLc.includes('tsports') || nameLc.includes('fs1') || nameLc.includes('fuel tv');
        });
        channels = channels.concat(server3Sports);
        
      } else {
        // Standard country: filter Server 3 channels by language/country detected
        const server3Country = server3List.filter(ch => ch.country === country);
        channels = channels.concat(server3Country);
      }

      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
