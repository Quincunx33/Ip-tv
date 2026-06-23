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

  const parseServer4M3U = () => {
    const filePath = path.join(process.cwd(), 'iptv-master', 'server4.m3u');
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
            source: '4',
            country: detectedCountry
          });
          currentItem = {};
        }
      }
    }
    return channels;
  };

  let cachedServer4Channels: any[] | null = null;
  const getServer4Channels = () => {
    if (cachedServer4Channels) return cachedServer4Channels;
    try {
      const parsed = parseServer4M3U();
      cachedServer4Channels = parsed;
      return parsed;
    } catch (e) {
      console.error("Error parsing Server 4 channels:", e);
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

  // In-memory cache for playlists and segments in local Express
  interface LocalCacheEntry {
    body: any;
    statusCode: number;
    headers: Record<string, string>;
    expiresAt: number;
  }
  const proxyLocalCache = new Map<string, LocalCacheEntry>();

  // Tracks active in-progress proxy requests to deduplicate concurrent requests
  const activeLocalIncomingRequests = new Map<string, boolean>();
  const pendingCoalescedLocalRequests = new Map<string, Array<(entry: { body: any; statusCode: number; headers: Record<string, string> }) => void>>();

  // Proxy to help playing other streams if needed

  app.get('/api/proxy', async (req, res) => {
    const originalTargetUrl = req.query.url as string;
    if (!originalTargetUrl) return res.status(400).send('URL required');

    const cacheKey = req.originalUrl;
    const now = Date.now();

    // Check In-Memory Local Cache
    const cachedEntry = proxyLocalCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > now) {
      if (cachedEntry.headers['content-type']) {
        res.setHeader('Content-Type', cachedEntry.headers['content-type']);
      }
      if (cachedEntry.headers['content-range']) {
        res.setHeader('Content-Range', cachedEntry.headers['content-range']);
        res.status(206);
      } else {
        res.status(cachedEntry.statusCode || 200);
      }
      if (cachedEntry.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', cachedEntry.headers['accept-ranges']);
      }
      if (cachedEntry.headers['content-length']) {
        res.setHeader('Content-Length', cachedEntry.headers['content-length']);
      }
      res.send(cachedEntry.body);
      return;
    }

    // Coalesce Concurrent Request if there's another active download for the same segment/playlist
    if (activeLocalIncomingRequests.get(cacheKey)) {
      return new Promise<void>((resolve) => {
        if (!pendingCoalescedLocalRequests.has(cacheKey)) {
          pendingCoalescedLocalRequests.set(cacheKey, []);
        }
        pendingCoalescedLocalRequests.get(cacheKey)!.push((entry) => {
          if (entry.headers['content-type']) {
            res.setHeader('Content-Type', entry.headers['content-type']);
          }
          if (entry.headers['content-range']) {
            res.setHeader('Content-Range', entry.headers['content-range']);
            res.status(206);
          } else {
            res.status(entry.statusCode || 200);
          }
          if (entry.headers['accept-ranges']) {
            res.setHeader('Accept-Ranges', entry.headers['accept-ranges']);
          }
          if (entry.headers['content-length']) {
            res.setHeader('Content-Length', entry.headers['content-length']);
          }
          res.send(entry.body);
          resolve();
        });
      });
    }

    // Mark as active
    activeLocalIncomingRequests.set(cacheKey, true);

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
          'User-Agent': (req.query.userAgent as string) || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
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

        const cleanupError = () => {
          activeLocalIncomingRequests.delete(cacheKey);
          const resolvePending = pendingCoalescedLocalRequests.get(cacheKey);
          if (resolvePending) {
            resolvePending.forEach(cb => cb({ body: Buffer.alloc(0), statusCode: 502, headers: {} }));
            pendingCoalescedLocalRequests.delete(cacheKey);
          }
        };

        clientReq.on('timeout', () => {
          if (!isResolved) {
            isResolved = true;
            clientReq.destroy();
            cleanupError();
            resolve(null);
          }
        });

        clientReq.on('error', (e) => {
          console.error(`Proxy request error for ${urlStr}:`, e.message);
          if (!isResolved) {
            isResolved = true;
            cleanupError();
            resolve(null);
          }
        });

        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            clientReq.destroy();
            cleanupError();
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
      activeLocalIncomingRequests.delete(cacheKey);
      const resolvePending = pendingCoalescedLocalRequests.get(cacheKey);
      if (resolvePending) {
        resolvePending.forEach(cb => cb({ body: Buffer.alloc(0), statusCode: 502, headers: {} }));
        pendingCoalescedLocalRequests.delete(cacheKey);
      }
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

    const cleanupError = () => {
      activeLocalIncomingRequests.delete(cacheKey);
      const resolvePending = pendingCoalescedLocalRequests.get(cacheKey);
      if (resolvePending) {
        resolvePending.forEach(cb => cb({ body: Buffer.alloc(0), statusCode: 502, headers: {} }));
        pendingCoalescedLocalRequests.delete(cacheKey);
      }
    };
    resStream.on('error', cleanupError);

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

         // Cache playlist response for 3 seconds
         const cacheVal: LocalCacheEntry = {
           body: rewritten,
           statusCode: statusCode || 200,
           headers: {
             'content-type': headers['content-type'] as string || 'application/vnd.apple.mpegurl',
             'content-length': String(Buffer.byteLength(rewritten))
           },
           expiresAt: Date.now() + 6000
         };
         proxyLocalCache.set(cacheKey, cacheVal);

         // Clean up active requests and resolve pending subscribers
         activeLocalIncomingRequests.delete(cacheKey);
         const resolvePending = pendingCoalescedLocalRequests.get(cacheKey);
         if (resolvePending) {
           resolvePending.forEach(cb => cb(cacheVal));
           pendingCoalescedLocalRequests.delete(cacheKey);
         }

         res.send(rewritten);
      });
    } else {
      // Stream segment, accumulate buffer in parallel to cache it for 60 seconds
      const chunks: Buffer[] = [];
      resStream.on('data', chunk => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      resStream.on('end', () => {
         const fullBuffer = Buffer.concat(chunks);
         const cacheVal: LocalCacheEntry = {
           body: fullBuffer,
           statusCode: statusCode || 200,
           headers: {
             'content-type': headers['content-type'] as string || 'video/mp2t',
             'content-length': String(fullBuffer.length),
             'content-range': headers['content-range'] as string || '',
             'accept-ranges': headers['accept-ranges'] as string || 'bytes'
           },
           expiresAt: Date.now() + 60000
         };
         proxyLocalCache.set(cacheKey, cacheVal);

         // Clean up active requests and resolve pending subscribers
         activeLocalIncomingRequests.delete(cacheKey);
         const resolvePending = pendingCoalescedLocalRequests.get(cacheKey);
         if (resolvePending) {
           resolvePending.forEach(cb => cb(cacheVal));
           pendingCoalescedLocalRequests.delete(cacheKey);
         }
      });

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

      // 4. Search in Server 4 M3U
      const server4List = getServer4Channels();
      server4List.forEach(ch => {
        if (ch.name.toLowerCase().includes(query)) {
          const uniqueKey = `${ch.country}_4_${ch.url}`;
          if (!seenUrls.has(uniqueKey)) {
            seenUrls.add(uniqueKey);
            matched.push({
              name: ch.name,
              url: ch.url,
              logo: ch.logo || "",
              source: '4',
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

  // API for parsing remote M3U playlists
  app.get("/api/parse-m3u", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    try {
      const response = await fetch(url as string, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch M3U playlist");
      const content = await response.text();
      
      const lines = content.split('\n');
      const channels: any[] = [];
      let currentItem: any = {};
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
          const nameMatch = line.match(/,(.+)$/);
          currentItem.name = nameMatch ? nameMatch[1].trim() : 'Unknown';
          const logoMatch = line.match(/tvg-logo="([^"]+)"/);
          if (logoMatch) currentItem.logo = logoMatch[1];
        } else if (line.startsWith('http')) {
          if (currentItem.name) {
            channels.push({
              name: currentItem.name,
              url: line,
              logo: currentItem.logo || "",
              country: "custom"
            });
            currentItem = {};
          } else {
             const urlParts = line.split('/');
             const fileName = urlParts[urlParts.length - 1] || 'Stream';
             channels.push({
               name: fileName,
               url: line,
               logo: "",
               country: "custom"
             });
          }
        }
      }
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // API for testing / pinging remote playlist URLs or stream links
  app.get('/api/test-link', async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url as string, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || 'unknown';
      const isM3U = contentType.includes('mpegurl') || contentType.includes('mpegURL') || (url as string).toLowerCase().includes('.m3u');
      const isStream = contentType.includes('video') || contentType.includes('audio') || contentType.includes('mpegurl') || contentType.includes('octet-stream') || (url as string).toLowerCase().includes('.m3u8') || (url as string).toLowerCase().includes('.ts') || (url as string).toLowerCase().includes('.mp4');

      res.json({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: contentType,
        isM3U,
        isStream,
        message: response.ok ? "Link is reachable and online!" : `Reachable but returned status ${response.status} (${response.statusText})`
      });
    } catch (err: any) {
      console.error(`Link test error for ${url}:`, err);
      let errorMsg = err.message || String(err);
      if (err.name === 'AbortError') {
        errorMsg = "Request timed out (server took too long to respond)";
      }
      res.json({
        ok: false,
        status: 0,
        error: errorMsg,
        message: `Failed to connect: ${errorMsg}`
      });
    }
  });

  app.get('/api/channels/:country', (req, res) => {
    const country = req.params.country;

    // 1. Load static channels for special categories - FAST EXIT
    if (country === 'fifa') {
      const staticPath = path.join(process.cwd(), 'public', 'static-api', 'fifa.json');
      if (fs.existsSync(staticPath)) {
        const staticData = JSON.parse(fs.readFileSync(staticPath, 'utf-8'));
        return res.json(staticData);
      }
      return res.json([]);
    }

    if (country === 'sports') {
      const staticPath = path.join(process.cwd(), 'public', 'static-api', 'sports.json');
      if (fs.existsSync(staticPath)) {
        const staticData = JSON.parse(fs.readFileSync(staticPath, 'utf-8'));
        return res.json(staticData);
      }
    }

    const filePath = path.join(process.cwd(), 'iptv-master', 'streams', `${country}.m3u`);
    const server1Path = path.join(process.cwd(), 'iptv-master', 'server1_streams.json');
    
    try {
      let channels: any[] = [];

      // 1. Load Server 1 channels for this country
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
      // 4. Load Server 4 channels
      const server4List = getServer4Channels();

      if (country === 'fifa') {
        // Find channels matching FIFA in Server 3 & 4
        const server3Fifa = server3List.filter(ch => {
          const nameLc = ch.name.toLowerCase();
          return nameLc.includes('fifa') || nameLc.includes('world cup') || nameLc.includes('fwc') || nameLc.includes('bein sports 1');
        });
        const server4Fifa = server4List.filter(ch => {
          const nameLc = ch.name.toLowerCase();
          return nameLc.includes('fifa') || nameLc.includes('world cup') || nameLc.includes('fwc') || nameLc.includes('bein sports 1');
        });
        channels = channels.concat(server3Fifa).concat(server4Fifa);
        
        // Custom order for FIFA:
        // - "bein sports 1" goes first
        // - "t sports" from Server 3/4 goes next
        // - others go last
        channels.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          
          const aBein = aName.includes('bein sports 1');
          const bBein = bName.includes('bein sports 1');
          if (aBein && !bBein) return -1;
          if (!aBein && bBein) return 1;

          const aTS = ((a.source === '3' || a.source === '4') && (aName.includes('t sports') || aName.includes('tsports')));
          const bTS = ((b.source === '3' || b.source === '4') && (bName.includes('t sports') || bName.includes('tsports')));
          if (aTS && !bTS) return -1;
          if (!aTS && bTS) return 1;

          return 0; // maintain relative order
        });

      } else if (country === 'sports') {
        // Find channels matching sports in Server 3 & 4
        const server3Sports = server3List.filter(ch => {
          const nameLc = ch.name.toLowerCase();
          const urlLc = ch.url.toLowerCase();
          return nameLc.includes('sports') || nameLc.includes('sport') || nameLc.includes('dazn') || nameLc.includes('football') || nameLc.includes('cup') || nameLc.includes('star sports') || nameLc.includes('sony sports') || nameLc.includes('ptv sports') || nameLc.includes('criclife') || nameLc.includes('fancode') || nameLc.includes('t sports') || urlLc.includes('tsports') || nameLc.includes('fs1') || nameLc.includes('fuel tv');
        });
        const server4Sports = server4List.filter(ch => {
          const nameLc = ch.name.toLowerCase();
          const urlLc = ch.url.toLowerCase();
          return nameLc.includes('sports') || nameLc.includes('sport') || nameLc.includes('dazn') || nameLc.includes('football') || nameLc.includes('cup') || nameLc.includes('star sports') || nameLc.includes('sony sports') || nameLc.includes('ptv sports') || nameLc.includes('criclife') || nameLc.includes('fancode') || nameLc.includes('t sports') || urlLc.includes('tsports') || nameLc.includes('fs1') || nameLc.includes('fuel tv');
        });
        channels = channels.concat(server3Sports).concat(server4Sports);
        
      } else {
        // Standard country: filter Server 3 & 4 channels by language/country detected
        const server3Country = server3List.filter(ch => ch.country === country);
        const server4Country = server4List.filter(ch => ch.country === country);
        channels = channels.concat(server3Country).concat(server4Country);
      }

      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/matches', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60s, s-maxage=600s');

    const now = new Date();

    const matches = [
      {"group":"Group Stage — June 20","id":"match_1","team1":"Netherlands","team1Flag":"https://flagcdn.com/w160/nl.png","team2":"Sweden","team2Flag":"https://flagcdn.com/w160/se.png","time":"2026-06-20T23:00:00+06:00"},
      {"group":"Group Stage — June 21","id":"match_2","team1":"Germany","team1Flag":"https://flagcdn.com/w160/de.png","team2":"Ivory Coast","team2Flag":"https://flagcdn.com/w160/ci.png","time":"2026-06-21T02:00:00+06:00"},
      {"group":"Group Stage — June 21","id":"match_3","team1":"Ecuador","team1Flag":"https://flagcdn.com/w160/ec.png","team2":"Curaçao","team2Flag":"https://flagcdn.com/w160/cw.png","time":"2026-06-21T06:00:00+06:00"},
      {"group":"Group Stage — June 21","id":"match_4","team1":"Tunisia","team1Flag":"https://flagcdn.com/w160/tn.png","team2":"Japan","team2Flag":"https://flagcdn.com/w160/jp.png","time":"2026-06-21T10:00:00+06:00"},
      {"group":"Group Stage — June 21","id":"match_5","team1":"Spain","team1Flag":"https://flagcdn.com/w160/es.png","team2":"Saudi Arabia","team2Flag":"https://flagcdn.com/w160/sa.png","time":"2026-06-21T22:00:00+06:00"},
      {"group":"Group Stage — June 22","id":"match_6","team1":"Belgium","team1Flag":"https://flagcdn.com/w160/be.png","team2":"Iran","team2Flag":"https://flagcdn.com/w160/ir.png","time":"2026-06-22T01:00:00+06:00"},
      {"group":"Group Stage — June 22","id":"match_7","team1":"Uruguay","team1Flag":"https://flagcdn.com/w160/uy.png","team2":"Cape Verde","team2Flag":"https://flagcdn.com/w160/cv.png","time":"2026-06-22T04:00:00+06:00"},
      {"group":"Group Stage — June 22","id":"match_8","team1":"New Zealand","team1Flag":"https://flagcdn.com/w160/nz.png","team2":"Egypt","team2Flag":"https://flagcdn.com/w160/eg.png","time":"2026-06-22T07:00:00+06:00"},
      {"group":"Group Stage — June 22","id":"match_9","team1":"Argentina","team1Flag":"https://flagcdn.com/w160/ar.png","team2":"Austria","team2Flag":"https://flagcdn.com/w160/at.png","time":"2026-06-22T23:00:00+06:00"},
      {"group":"Group Stage — June 23","id":"match_10","team1":"France","team1Flag":"https://flagcdn.com/w160/fr.png","team2":"Iraq","team2Flag":"https://flagcdn.com/w160/iq.png","time":"2026-06-23T03:00:00+06:00"},
      {"group":"Group Stage — June 23","id":"match_11","team1":"Norway","team1Flag":"https://flagcdn.com/w160/no.png","team2":"Senegal","team2Flag":"https://flagcdn.com/w160/sn.png","time":"2026-06-23T06:00:00+06:00"},
      {"group":"Group Stage — June 23","id":"match_12","team1":"Jordan","team1Flag":"https://flagcdn.com/w160/jo.png","team2":"Algeria","team2Flag":"https://flagcdn.com/w160/dz.png","time":"2026-06-23T09:00:00+06:00"},
      {"group":"Group Stage — June 23","id":"match_13","team1":"Portugal","team1Flag":"https://flagcdn.com/w160/pt.png","team2":"Uzbekistan","team2Flag":"https://flagcdn.com/w160/uz.png","time":"2026-06-23T23:00:00+06:00"},
      {"group":"Group Stage — June 24","id":"match_14","team1":"England","team1Flag":"https://flagcdn.com/w160/gb.png","team2":"Ghana","team2Flag":"https://flagcdn.com/w160/gh.png","time":"2026-06-24T02:00:00+06:00"},
      {"group":"Group Stage — June 24","id":"match_15","team1":"Panama","team1Flag":"https://flagcdn.com/w160/pa.png","team2":"Croatia","team2Flag":"https://flagcdn.com/w160/hr.png","time":"2026-06-24T05:00:00+06:00"},
      {"group":"Group Stage — June 24","id":"match_16","team1":"Colombia","team1Flag":"https://flagcdn.com/w160/co.png","team2":"DR Congo","team2Flag":"https://flagcdn.com/w160/cd.png","time":"2026-06-24T08:00:00+06:00"},
      {"group":"Group Stage — June 25","id":"match_17","team1":"Switzerland","team1Flag":"https://flagcdn.com/w160/ch.png","team2":"Canada","team2Flag":"https://flagcdn.com/w160/ca.png","time":"2026-06-25T01:00:00+06:00"},
      {"group":"Group Stage — June 25","id":"match_18","team1":"Bosnia & Herzegovina","team1Flag":"https://flagcdn.com/w160/ba.png","team2":"Qatar","team2Flag":"https://flagcdn.com/w160/qa.png","time":"2026-06-25T01:00:00+06:00"},
      {"group":"Group Stage — June 25","id":"match_19","team1":"Scotland","team1Flag":"https://flagcdn.com/w160/gb-sct.png","team2":"Brazil","team2Flag":"https://flagcdn.com/w160/br.png","time":"2026-06-25T04:00:00+06:00"},
      {"group":"Group Stage — June 25","id":"match_20","team1":"Morocco","team1Flag":"https://flagcdn.com/w160/ma.png","team2":"Haiti","team2Flag":"https://flagcdn.com/w160/ht.png","time":"2026-06-25T04:00:00+06:00"},
      {"group":"Group Stage — June 25","id":"match_21","team1":"Czechia","team1Flag":"https://flagcdn.com/w160/cz.png","team2":"Mexico","team2Flag":"https://flagcdn.com/w160/mx.png","time":"2026-06-25T07:00:00+06:00"},
      {"group":"Group Stage — June 25","id":"match_22","team1":"South Africa","team1Flag":"https://flagcdn.com/w160/za.png","team2":"South Korea","team2Flag":"https://flagcdn.com/w160/kr.png","time":"2026-06-25T07:00:00+06:00"},
      {"group":"Group Stage — June 26","id":"match_23","team1":"Ecuador","team1Flag":"https://flagcdn.com/w160/ec.png","team2":"Germany","team2Flag":"https://flagcdn.com/w160/de.png","time":"2026-06-26T02:00:00+06:00"},
      {"group":"Group Stage — June 26","id":"match_24","team1":"Curaçao","team1Flag":"https://flagcdn.com/w160/cw.png","team2":"Ivory Coast","team2Flag":"https://flagcdn.com/w160/ci.png","time":"2026-06-26T02:00:00+06:00"},
      {"group":"Group Stage — June 26","id":"match_25","team1":"Tunisia","team1Flag":"https://flagcdn.com/w160/tn.png","team2":"Netherlands","team2Flag":"https://flagcdn.com/w160/nl.png","time":"2026-06-26T05:00:00+06:00"},
      {"group":"Group Stage — June 26","id":"match_26","team1":"Japan","team1Flag":"https://flagcdn.com/w160/jp.png","team2":"Sweden","team2Flag":"https://flagcdn.com/w160/se.png","time":"2026-06-26T05:00:00+06:00"},
      {"group":"Group Stage — June 26","id":"match_27","team1":"Turkey","team1Flag":"https://flagcdn.com/w160/tr.png","team2":"United States","team2Flag":"https://flagcdn.com/w160/us.png","time":"2026-06-26T08:00:00+06:00"},
      {"group":"Group Stage — June 26","id":"match_28","team1":"Paraguay","team1Flag":"https://flagcdn.com/w160/py.png","team2":"Australia","team2Flag":"https://flagcdn.com/w160/au.png","time":"2026-06-26T08:00:00+06:00"},
      {"group":"Group Stage — June 27","id":"match_29","team1":"Norway","team1Flag":"https://flagcdn.com/w160/no.png","team2":"France","team2Flag":"https://flagcdn.com/w160/fr.png","time":"2026-06-27T01:00:00+06:00"},
      {"group":"Group Stage — June 27","id":"match_30","team1":"Senegal","team1Flag":"https://flagcdn.com/w160/sn.png","team2":"Iraq","team2Flag":"https://flagcdn.com/w160/iq.png animate-pulse","time":"2026-06-27T01:00:00+06:00"},
      {"group":"Group Stage — June 27","id":"match_31","team1":"Uruguay","team1Flag":"https://flagcdn.com/w160/uy.png","team2":"Spain","team2Flag":"https://flagcdn.com/w160/es.png","time":"2026-06-27T06:00:00+06:00"},
      {"group":"Group Stage — June 27","id":"match_32","team1":"Cape Verde","team1Flag":"https://flagcdn.com/w160/cv.png","team2":"Saudi Arabia","team2Flag":"https://flagcdn.com/w160/sa.png","time":"2026-06-27T06:00:00+06:00"},
      {"group":"Group Stage — June 27","id":"match_33","team1":"New Zealand","team1Flag":"https://flagcdn.com/w160/nz.png","team2":"Belgium","team2Flag":"https://flagcdn.com/w160/be.png","time":"2026-06-27T09:00:00+06:00"},
      {"group":"Group Stage — June 27","id":"match_34","team1":"Egypt","team1Flag":"https://flagcdn.com/w160/eg.png","team2":"Iran","team2Flag":"https://flagcdn.com/w160/ir.png","time":"2026-06-27T09:00:00+06:00"},
      {"group":"Group Stage — June 28","id":"match_35","team1":"Panama","team1Flag":"https://flagcdn.com/w160/pa.png","team2":"England","team2Flag":"https://flagcdn.com/w160/gb.png","time":"2026-06-28T03:00:00+06:00"},
      {"group":"Group Stage — June 28","id":"match_36","team1":"Croatia","team1Flag":"https://flagcdn.com/w160/hr.png","team2":"Ghana","team2Flag":"https://flagcdn.com/w160/gh.png","time":"2026-06-28T03:00:00+06:00"},
      {"group":"Group Stage — June 28","id":"match_37","team1":"Colombia","team1Flag":"https://flagcdn.com/w160/co.png","team2":"Portugal","team2Flag":"https://flagcdn.com/w160/pt.png","time":"2026-06-28T05:30:00+06:00"},
      {"group":"Group Stage — June 28","id":"match_38","team1":"DR Congo","team1Flag":"https://flagcdn.com/w160/cd.png","team2":"Uzbekistan","team2Flag":"https://flagcdn.com/w160/uz.png","time":"2026-06-28T05:30:00+06:00"},
      {"group":"Group Stage — June 28","id":"match_39","team1":"Jordan","team1Flag":"https://flagcdn.com/w160/jo.png","team2":"Argentina","team2Flag":"https://flagcdn.com/w160/ar.png","time":"2026-06-28T08:00:00+06:00"},
      {"group":"Group Stage — June 28","id":"match_40","team1":"Algeria","team1Flag":"https://flagcdn.com/w160/dz.png","team2":"Austria","team2Flag":"https://flagcdn.com/w160/at.png","time":"2026-06-28T08:00:00+06:00"}
    ];

    // For better testing: Let's adjust matching times that match today (June 23) in GMT/BST to be LIVE/upcoming shortly so the user gets instant live play stream satisfaction!
    const updatedMatches = matches.map(m => {
      const matchDateStr = m.time.split('T')[0];
      if (matchDateStr === '2026-06-23') {
        const timePart = m.time.split('T')[1].substring(0, 5); // e.g. "09:00"
        
        // Let's make Portugal vs Uzbekistan (23:00) starting now, or make the upcoming match Jordan vs Algeria live!
        if (m.id === 'match_12' || m.id === 'match_11' || m.id === 'match_13') {
          // Force make it active Live or very close to now so it shows LIVE status
          // match_12: started 30 mins ago
          const forcedDate = new Date(now.getTime() - (30 * 60 * 1000));
          return {
            ...m,
            time: forcedDate.toISOString()
          };
        }
      }
      return m;
    });

    const news = [
      "FIFA Plus broadcasts World Football Cup Qualifiers live streams across Asian regions.",
      "CazéTV breaks stream records for the ongoing matches with massive live viewership in Brazil.",
      "T Sports live broadcasting channels schedule updated for the major International tournaments."
    ];

    res.json({ matches: updatedMatches, news });
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
