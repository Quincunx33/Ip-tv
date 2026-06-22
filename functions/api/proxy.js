const resolvedSubdomains = {};
const subdomainsToTry = ['tvsen12', 'tvsen14', 'tvsen11', 'tvsen15', 'tvsen5', 'tvsen7', 'tvsen6', 'tvsen13'];
const activeFetches = new Map();

function getChannelKey(urlStr) {
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.split('/');
    return parts.find(p => p && p.trim() !== '') || '';
  } catch {
    return '';
  }
}

async function getCachedSubdomain(channelKey, cache) {
  if (!cache || !channelKey) return null;
  try {
    const cacheKeyUrl = `https://subdomain-cache.internal/${channelKey}`;
    const cacheKey = new Request(cacheKeyUrl, { method: 'GET' });
    const cachedRes = await cache.match(cacheKey);
    if (cachedRes) {
      const text = await cachedRes.text();
      if (text && text.trim() !== '') {
        return text.trim();
      }
    }
  } catch (e) {
    console.error('Error fetching cached subdomain:', e);
  }
  return null;
}

async function setCachedSubdomain(channelKey, subdomain, cache, context) {
  if (!cache || !channelKey || !subdomain) return;
  try {
    const cacheKeyUrl = `https://subdomain-cache.internal/${channelKey}`;
    const cacheKey = new Request(cacheKeyUrl, { method: 'GET' });
    const response = new Response(subdomain, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=7200, s-maxage=7200',
      }
    });
    if (context && context.waitUntil) {
      context.waitUntil(cache.put(cacheKey, response));
    } else {
      await cache.put(cacheKey, response);
    }
  } catch (e) {
    console.error('Error storing cached subdomain:', e);
  }
}

async function deduplicatedFetch(url, init) {
  const fetchKey = `${init.method || 'GET'}:${url}`;
  
  if (activeFetches.has(fetchKey)) {
    try {
      const resp = await activeFetches.get(fetchKey);
      return resp.clone();
    } catch (e) {
      // Allow fallback if previous failed
      activeFetches.delete(fetchKey);
    }
  }
  
  const fetchPromise = (async () => {
    const r = await fetch(url, init);
    return r;
  })();
  
  activeFetches.set(fetchKey, fetchPromise);
  
  try {
    const response = await fetchPromise;
    return response.clone();
  } finally {
    activeFetches.delete(fetchKey);
  }
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('URL parameter is required', { status: 400 });
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const isM3u8Request = targetUrl.toLowerCase().includes('.m3u8');

  // Fix 1 & 2: Match from Cloudflare Edge Cache first (for GET requests)
  if (cache && request.method === 'GET') {
    try {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    } catch (e) {
      console.error('Cache match error:', e);
    }
  }

  try {
    const userAgentParam = url.searchParams.get('userAgent');
    const refererParam = url.searchParams.get('referer');
    const proxyParams = (userAgentParam ? `&userAgent=${encodeURIComponent(userAgentParam)}` : '') + 
                        (refererParam ? `&referer=${encodeURIComponent(refererParam)}` : '');

    // Construct a safe, clean set of request headers (avoiding browser security/fetch flags)
    const headers = new Headers();
    headers.set('User-Agent', userAgentParam || 'VLC/3.0.9 LibVLC/3.0.9');
    headers.set('Accept', '*/*');
    headers.set('Connection', 'keep-alive');
    
    if (refererParam) {
      headers.set('Referer', refererParam);
    }

    // Forward safe standard headers if they exist in original request
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      headers.set('Range', rangeHeader);
    }

    const acceptLang = request.headers.get('accept-language');
    if (acceptLang) {
      headers.set('Accept-Language', acceptLang);
    }

    let response = null;
    let finalTargetUrl = targetUrl;
    const isAynaott = targetUrl.includes('aynaott.com');
    const channelKey = getChannelKey(targetUrl);

    // Fix 3: Subdomain Edge caching persistence
    let resolvedSubdomain = null;
    if (isAynaott && channelKey) {
      if (resolvedSubdomains[channelKey]) {
        resolvedSubdomain = resolvedSubdomains[channelKey];
      } else if (cache) {
        resolvedSubdomain = await getCachedSubdomain(channelKey, cache);
        if (resolvedSubdomain) {
          resolvedSubdomains[channelKey] = resolvedSubdomain; // Keep memory cache warm
        }
      }

      if (resolvedSubdomain) {
        try {
          const u = new URL(targetUrl);
          u.host = resolvedSubdomain;
          finalTargetUrl = u.toString();
        } catch {}
      }
    }

    // Try initial request using our deduplicated coalesced fetch (Fix 4)
    try {
      response = await deduplicatedFetch(finalTargetUrl, {
        method: request.method,
        headers: headers,
        redirect: 'follow',
      });
    } catch (e) {
      response = null;
    }

    // If it fails or returns 404 or 403, and it's aynaott, resolve and auto-fall-back!
    if (isAynaott && channelKey && (!response || response.status === 404 || response.status === 403)) {
      console.log(`Smart Cloudflare proxy adjusting dead subdomain for channel: ${channelKey}`);
      let resolvedUrl = '';
      
      for (const subdomain of subdomainsToTry) {
        try {
          const u = new URL(targetUrl);
          u.host = `${subdomain}.aynaott.com`;
          const testUrl = u.toString();
          
          const testResponse = await deduplicatedFetch(testUrl, {
            method: request.method,
            headers: headers,
            redirect: 'follow',
          });
          
          if (testResponse && testResponse.status === 200) {
            console.log(`Successfully auto-resolved ${channelKey} to ${subdomain}.aynaott.com in Cloudflare Worker`);
            resolvedSubdomains[channelKey] = `${subdomain}.aynaott.com`;
            if (cache) {
              await setCachedSubdomain(channelKey, `${subdomain}.aynaott.com`, cache, context);
            }
            resolvedUrl = testUrl;
            response = testResponse;
            break;
          }
        } catch (err) {
          console.error(`Cloudflare subdomain ${subdomain} test error:`, err);
        }
      }

      if (resolvedUrl) {
        finalTargetUrl = resolvedUrl;
      }
    }

    if (!response) {
      return new Response('Error connecting to target stream host', { status: 502 });
    }

    const contentType = response.headers.get('content-type') || '';
    const isM3u8 = finalTargetUrl.toLowerCase().includes('.m3u8') || 
                   contentType.includes('mpegurl') || 
                   contentType.includes('x-mpegURL') ||
                   contentType.includes('application/vnd.apple.mpegurl');

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', '*');
    newHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    // Fix 1: m3u8 playlist edge caching (cache for 3 seconds)
    if (isM3u8) {
      let body = await response.text();
      const lines = body.split('\n');
      const rewritten = lines.map(line => {
        let trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          if (trimmed.startsWith('#EXT-X-')) {
             return line.replace(/URI="([^"]+)"/g, (match, p1) => {
               try {
                 let absoluteUrl = p1;
                 if (!p1.startsWith('http')) {
                   const urlObj = new URL(finalTargetUrl);
                   const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
                   absoluteUrl = urlObj.origin + basePath + p1;
                 }
                 if (absoluteUrl.includes('/api/proxy?url=')) return match;
                 return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}${proxyParams}"`;
               } catch (e) { return match; }
             });
          }
          return line;
        }

        let absoluteUrl = trimmed;
        try {
          if (!trimmed.startsWith('http')) {
            const urlObj = new URL(finalTargetUrl);
            const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
            absoluteUrl = urlObj.origin + basePath + trimmed;
          }
          if (absoluteUrl.includes('/api/proxy?url=')) return line;
          return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}${proxyParams}`;
        } catch (e) {
          return line;
        }
      }).join('\n');

      newHeaders.set('Cache-Control', 'public, max-age=3, s-maxage=3');

      const finalResponse = new Response(rewritten, {
        status: response.status,
        headers: newHeaders,
      });

      if (cache && request.method === 'GET' && response.status === 200) {
        context.waitUntil(cache.put(request, finalResponse.clone()));
      }

      return finalResponse;
    }

    // Fix 2: video segment (.ts, etc) caching (cache for 60 seconds)
    newHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=60');

    const finalResponse = new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });

    if (cache && request.method === 'GET' && response.status === 200) {
      context.waitUntil(cache.put(request, finalResponse.clone()));
    }

    return finalResponse;

  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 502 });
  }
}
