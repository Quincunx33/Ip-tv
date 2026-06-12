import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import http from "http";
import https from "https";

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

  app.get('/api/proxy', async (req, res) => {
    const originalTargetUrl = req.query.url as string;
    if (!originalTargetUrl) return res.status(400).send('URL required');

    // List of reliable tvsen subdomains to try in fallback sequence
    const subdomainsToTry = ['tvsen12', 'tvsen14', 'tvsen11', 'tvsen15', 'tvsen5', 'tvsen7', 'tvsen6', 'tvsen13'];

    const getResHeaders = (headers: http.IncomingHttpHeaders) => ({
      'User-Agent': 'VLC/3.0.9 LibVLC/3.0.9',
      'Accept': '*/*',
      ...('origin' in headers ? { 'Origin': headers.origin as string } : {}),
      ...('referer' in headers ? { 'Referer': headers.referer as string } : {})
    });

    // Helper to make a request to a URL and verify if it's working (status 200)
    const tryRequest = (urlStr: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; resStream: http.IncomingMessage } | null> => {
      return new Promise((resolve) => {
        let isResolved = false;
        const client = urlStr.startsWith('https') ? https : http;

        let targetOrigin = '';
        try {
          const u = new URL(urlStr);
          targetOrigin = u.origin;
        } catch {}

        const options = {
          headers: {
            'User-Agent': 'VLC/3.0.9 LibVLC/3.0.9',
            'Accept': '*/*',
            ...(targetOrigin ? { 'Origin': targetOrigin, 'Referer': targetOrigin + '/' } : {})
          }
        };

        const clientReq = client.get(urlStr, options, (clientRes) => {
          isResolved = true;
          resolve({ 
            statusCode: clientRes.statusCode || 200, 
            headers: clientRes.headers, 
            resStream: clientRes 
          });
        });

        clientReq.on('error', () => {
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
        }, 5000); // 5s timeout per attempt
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

    const { statusCode, headers, resStream } = result;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (headers['content-type']) {
      res.setHeader('Content-Type', headers['content-type']);
    }

    const isM3u8 = targetUrl.includes('.m3u8');
    const ct = headers['content-type'] || '';
    
    if (isM3u8 || ct.includes('mpegurl') || ct.includes('x-mpegURL') || ct.includes('appl.mpegurl')) {
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
                  const urlObj = new URL(targetUrl);
                  const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
                  absoluteUrl = urlObj.origin + basePath + trimmed;
                }
                return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
              } catch (e) {
                return line;
              }
           }
           
           // Rewrite embedded URIs
           if (trimmed.startsWith('#EXT-X-')) {
             return line.replace(/URI="([^"]+)"/g, (match, p1) => {
               try {
                 let absoluteUrl = p1;
                 if (!p1.startsWith('http')) {
                   const urlObj = new URL(targetUrl);
                   const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
                   absoluteUrl = urlObj.origin + basePath + p1;
                 }
                 return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
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
      resStream.pipe(res);
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
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/channels/:country', (req, res) => {
    const country = req.params.country;
    const filePath = path.join(process.cwd(), 'iptv-master', 'streams', `${country}.m3u`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const channels = [];
      
      let currentChannel: any = {};
      for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXTINF:')) {
              const parts = line.split(',');
              if (parts.length > 1) {
                  currentChannel.name = parts[parts.length - 1].trim();
              } else {
                  currentChannel.name = 'Unknown';
              }
          } else if (line.startsWith('http')) {
              if (currentChannel.name) {
                  currentChannel.url = line;
                  channels.push({ ...currentChannel });
                  currentChannel = {};
              }
          }
      }
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: error.message });
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
