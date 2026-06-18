const resolvedSubdomains = {};
const subdomainsToTry = ['tvsen12', 'tvsen14', 'tvsen11', 'tvsen15', 'tvsen5', 'tvsen7', 'tvsen6', 'tvsen13'];

function getChannelKey(urlStr) {
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.split('/');
    return parts.find(p => p && p.trim() !== '') || '';
  } catch {
    return '';
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

    if (isAynaott && channelKey && resolvedSubdomains[channelKey]) {
      try {
        const u = new URL(targetUrl);
        u.host = resolvedSubdomains[channelKey];
        finalTargetUrl = u.toString();
      } catch {}
    }

    // Try initial request
    try {
      response = await fetch(finalTargetUrl, {
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
          
          const testResponse = await fetch(testUrl, {
            method: request.method,
            headers: headers,
            redirect: 'follow',
          });
          
          if (testResponse && testResponse.status === 200) {
            console.log(`Successfully auto-resolved ${channelKey} to ${subdomain}.aynaott.com in Cloudflare Worker`);
            resolvedSubdomains[channelKey] = `${subdomain}.aynaott.com`;
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
                   contentType.includes('x-mpegURL');

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', '*',);
    newHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

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

      return new Response(rewritten, {
        status: response.status,
        headers: newHeaders,
      });
    }

    // For non-m3u8 (segments), just stream through
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 502 });
  }
}
