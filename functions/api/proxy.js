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
    const headers = new Headers(request.headers);
    headers.set('User-Agent', 'VLC/3.0.9 LibVLC/3.0.9');
    headers.set('Referer', targetUrl);
    
    // Remove headers that might cause issues with target server
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('cf-worker');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    const isM3u8 = targetUrl.toLowerCase().includes('.m3u8') || 
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
                   const urlObj = new URL(targetUrl);
                   const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
                   absoluteUrl = urlObj.origin + basePath + p1;
                 }
                 if (absoluteUrl.includes('/api/proxy?url=')) return match;
                 return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
               } catch (e) { return match; }
             });
          }
          return line;
        }

        let absoluteUrl = trimmed;
        try {
          if (!trimmed.startsWith('http')) {
            const urlObj = new URL(targetUrl);
            const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
            absoluteUrl = urlObj.origin + basePath + trimmed;
          }
          if (absoluteUrl.includes('/api/proxy?url=')) return line;
          return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
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
