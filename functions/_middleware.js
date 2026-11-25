import { onRequest as serveDynamicSitemap } from './api/sitemap.js';

const ALLOWED_ORIGINS = [
  'https://vicecityhub.eu',
  'https://www.vicecityhub.eu',
  'https://map.vicecityhub.eu'
];

const STRICT_CSP = "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://www.googletagmanager.com https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.googleusercontent.com https://images.unsplash.com https://i.pravatar.cc https://ui-avatars.com https://raw.githubusercontent.com https://*.tile.openstreetmap.org https://*.githubusercontent.com https://img.youtube.com https://*.ytimg.com https://*.tiktokcdn.com https://*.tiktokcdn-eu.com https://*.tiktok.com https://*.cdninstagram.com https://*.fbcdn.net https://*.instagram.com https://instagram.com; media-src 'self' data: blob: https://*.tiktokcdn.com https://*.tiktokcdn-eu.com https://*.tiktok.com https://*.googlevideo.com; connect-src 'self' data: blob: https://challenges.cloudflare.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; worker-src 'self' blob:; frame-src 'self' https://map.vicecityhub.eu https://challenges.cloudflare.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://www.tiktok.com https://*.tiktok.com https://www.youtube.com https://www.youtube-nocookie.com https://*.instagram.com https://instagram.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; upgrade-insecure-requests;";

const STRICT_PERMISSIONS = 'camera=(),microphone=(),geolocation=(),payment=(),usb=(),autoplay=*,accelerometer=*,gyroscope=*,magnetometer=(),fullscreen=*';

function checkAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('vicecityhub.eu') || origin.endsWith('.pages.dev')) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  return false;
}

export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);

  const origin = request.headers.get('Origin') || '';
  const isAllowedOrigin = checkAllowedOrigin(origin);

  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > 2097152 && reqUrl.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Payload too large (max 2MB per chunk)' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

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
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': STRICT_PERMISSIONS,
        'Content-Security-Policy': STRICT_CSP
      }
    });
  }

  const response = (reqUrl.pathname === '/sitemap.xml')
    ? await serveDynamicSitemap(context)
    : await context.next();
  const newHeaders = new Headers(response.headers);

  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
  newHeaders.set('X-Permitted-Cross-Domain-Policies', 'none');
  newHeaders.set('X-DNS-Prefetch-Control', 'on');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Permissions-Policy', STRICT_PERMISSIONS);
  if (!new URL(request.url).pathname.startsWith('/api/media')) {
    newHeaders.set('Content-Security-Policy', STRICT_CSP);
  }

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
