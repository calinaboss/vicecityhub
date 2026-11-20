const ALLOWED_ORIGINS = [
  'https://vicecityhub.eu',
  'https://www.vicecityhub.eu',
  'https://map.vicecityhub.eu'
];

function checkAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.vicecityhub.pages.dev')) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  return false;
}

export async function onRequest(context) {
  const { request } = context;
  const origin = request.headers.get('Origin') || '';
  const isAllowedOrigin = checkAllowedOrigin(origin);

  // OWASP DoS Prevention: Reject oversized API JSON payloads (> 64 KB)
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > 65536 && new URL(request.url).pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Payload too large (max 64KB)' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  // OWASP CSRF / Cross-Origin Mutation Guard on state-changing requests (Origin + Sec-Fetch-Site)
  const secFetchSite = request.headers.get('Sec-Fetch-Site') || '';
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    if ((origin && !isAllowedOrigin) || (secFetchSite === 'cross-site' && !isAllowedOrigin)) {
      return new Response(JSON.stringify({ error: 'Forbidden cross-origin request' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isAllowedOrigin && origin ? origin : 'https://vicecityhub.eu',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Frame-Options': 'SAMEORIGIN',
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    });
  }

  const response = await context.next();
  const newHeaders = new Headers(response.headers);

  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), battery=()');

  if (origin && isAllowedOrigin) {
    newHeaders.set('Access-Control-Allow-Origin', origin);
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    newHeaders.set('Vary', 'Origin');
  } else if (!origin) {
    newHeaders.set('Access-Control-Allow-Origin', 'https://vicecityhub.eu');
    newHeaders.set('Vary', 'Origin');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
