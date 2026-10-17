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

    const subdomainsToTry = ['tvsen12', 'tvsen14', 'tvsen11', 'tvsen15', 'tvsen5', 'tvsen7', 'tvsen6', 'tvsen13'];

    const tryRequest = (urlStr: string, depth = 0): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; resStream: http.IncomingMessage; finalUrl: string } | null> => {
      if (depth > 5) return Promise.resolve(null);

      return new Promise((resolve) => {
        let isResolved = false;
        const client = urlStr.startsWith('https') ? https : http;

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
        }, 8000);
      });
    };

    let targetUrl = originalTargetUrl;
    const isAynaott = targetUrl.includes('aynaott.com');
    const channelKey = getChannelKey(targetUrl);

    if (isAynaott && channelKey) {
      if (resolvedSubdomains[channelKey]) {
        try {
          const u = new URL(targetUrl);
          u.host = resolvedSubdomains[channelKey];
          targetUrl = u.toString();
        } catch {}
      }
    }

    let result = await tryRequest(targetUrl);

    if (isAynaott && channelKey && (!result || result.statusCode === 404 || result.statusCode === 403)) {
      if (result && result.resStream) {
        result.resStream.destroy();
      }

      let resolvedUrl = '';
      for (const subdomain of subdomainsToTry) {
        try {
          const u = new URL(originalTargetUrl);
          u.host = `${subdomain}.aynaott.com`;
          const testUrl = u.toString();
          
          const testResult = await tryRequest(testUrl);
          if (testResult && testResult.statusCode === 200) {
            resolvedSubdomains[channelKey] = `${subdomain}.aynaott.com`;
            resolvedUrl = testUrl;
            result = testResult;
            break;
          } else if (testResult && testResult.resStream) {
            testResult.resStream.destroy();
          }
        } catch (err) {}
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
           
           if (!trimmed.startsWith('#')) {
              let absoluteUrl = trimmed;
              try {
                if (!trimmed.startsWith('http')) {
                  const urlObj = new URL(finalUrl);
                  const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
                  absoluteUrl = urlObj.origin + basePath + trimmed;
                }
                if (absoluteUrl.includes('/api/proxy?url=')) return line;
                return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}${proxyParams}`;
              } catch (e) {
                return line;
              }
           }
           
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

         activeLocalIncomingRequests.delete(cacheKey);
         const resolvePending = pendingCoalescedLocalRequests.get(cacheKey);
         if (resolvePending) {
           resolvePending.forEach(cb => cb(cacheVal));
           pendingCoalescedLocalRequests.delete(cacheKey);
         }

         res.send(rewritten);
      });
    } else {
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
    
    if (!urlStr.startsWith('http')) {
      return res.status(400).send('Invalid URL');
    }

    const client = urlStr.startsWith('https') ? https : http;
    const reqProxy = client.get(urlStr, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
    }, (proxyRes) => {
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
          if (matched.length > 200) break;
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

      matched.sort((a, b) => {
        const aLower = a.name.toLowerCase();
        const bLower = b.name.toLowerCase();
        const cleanQuery = query.replace(/[^a-z0-9]/g, '');
        const cleanA = aLower.replace(/[^a-z0-9]/g, '');
        const cleanB = bLower.replace(/[^a-z0-9]/g, '');

        const aExact = cleanA.includes(cleanQuery);
        const bExact = cleanB.includes(cleanQuery);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aLower.startsWith(query);
        const bStarts = bLower.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        const aNew = aLower.includes('(new)');
        const bNew = bLower.includes('(new)');
        if (aNew && !bNew) return -1;
        if (!aNew && bNew) return 1;

        return a.name.localeCompare(b.name);
      });

      res.json(matched.slice(0, 120));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

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
      if (country !== 'sports') {
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
