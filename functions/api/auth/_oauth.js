export function getGoogleCredentials(env) {
  const clientId = (env && env.GOOGLE_CLIENT_ID) ? String(env.GOOGLE_CLIENT_ID).trim() : '';
  const clientSecret = (env && env.GOOGLE_CLIENT_SECRET) ? String(env.GOOGLE_CLIENT_SECRET).trim() : '';
  return { clientId, clientSecret };
}

export function getGoogleRedirectUri(request) {
  const url = new URL(request.url);
  if (url.hostname.includes('www.vicecityhub.eu')) {
    return 'https://www.vicecityhub.eu/api/auth/google/callback';
  }
  if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
    return `${url.origin}/api/auth/google/callback`;
  }
  return 'https://vicecityhub.eu/api/auth/google/callback';
}

export async function signOauthPayload(data, secret) {
  const keySecret = secret || 'vch_jwt_fallback_key_2026';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(keySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const jsonStr = JSON.stringify(data);
  const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(b64));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${b64}.${sigHex}`;
}

export async function verifyOauthPayload(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64, sigHex] = parts;
  if (!sigHex || sigHex.length !== 64) return null;
  const keySecret = secret || 'vch_jwt_fallback_key_2026';
  const enc = new TextEncoder();
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(keySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(b64));
    if (!valid) return null;
    const jsonStr = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(jsonStr);
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

export function sanitizeUsernameCandidate(candidate) {
  if (!candidate || typeof candidate !== 'string') return '';
  let clean = candidate.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (clean.length < 3) clean = `user_${clean}`;
  return clean.slice(0, 20);
}
