const edgeRateMap = new Map();

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'anonymous';
}

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) return false;
  let c = 0;
  for (let i = 0; i < aBuf.byteLength; i++) {
    c |= aBuf[i] ^ bBuf[i];
  }
  return c === 0;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const pwBuf = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', pwBuf, 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `100000:${saltHex}:${hashHex}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const parts = stored.split(':');
  let iterations = 100000;
  let saltHex = '';
  let originalHashHex = '';
  if (parts.length === 3) {
    iterations = parseInt(parts[0], 10) || 100000;
    if (iterations > 100000) iterations = 100000;
    saltHex = parts[1];
    originalHashHex = parts[2];
  } else if (parts.length === 2) {
    saltHex = parts[0];
    originalHashHex = parts[1];
  } else {
    return false;
  }
  if (!saltHex || !originalHashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const pwBuf = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', pwBuf, 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
    key,
    256
  );
  const derivedHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(derivedHex, originalHashHex);
}

function generateRandomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function inspectImageHeader(buffer) {
  if (!buffer || buffer.byteLength < 16) {
    return { valid: false, error: 'File is too small or invalid' };
  }
  const bytes = new Uint8Array(buffer.slice(0, 32));
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, format: 'jpg', mime: 'image/jpeg' };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return { valid: true, format: 'png', mime: 'image/png' };
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { valid: true, format: 'webp', mime: 'image/webp' };
  }
  return { valid: false, error: 'Only JPEG, PNG, or WebP images are allowed.' };
}

export function sanitizeExternalUrl(rawVal) {
  if (!rawVal || typeof rawVal !== 'string') return '';
  const val = rawVal.trim();
  if (!val || val.length > 350) return '';
  if (/^(javascript|data|vbscript|file):/i.test(val)) return '';
  try {
    const u = new URL(val);
    if (u.protocol !== 'https:') return '';
    const host = u.hostname.toLowerCase();
    if (!host || !host.includes('.')) return '';
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return '';
    const dangerousExts = /\.(exe|bat|cmd|sh|msi|scr|vbs|apk|zip|rar|tar|gz|iso|dmg|bin|js|php|py)$/i;
    if (dangerousExts.test(u.pathname.toLowerCase())) return '';
    return u.href;
  } catch (e) {
    return '';
  }
}

async function runNeonSql(databaseUrl, sql, params = []) {
  const dbUrl = new URL(databaseUrl);
  const endpoint = `https://${dbUrl.host}/sql`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': databaseUrl
    },
    body: JSON.stringify({ query: sql, params }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Database query failed (${res.status}): ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  if (data && Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data) && data[0] && Array.isArray(data[0].rows)) return data[0].rows;
  return [];
}

let schemaInitialized = false;
async function ensureAuthTables(databaseUrl) {
  if (schemaInitialized || !databaseUrl) return;
  const statements = [
    "CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(32) NOT NULL DEFAULT 'user', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash VARCHAR(255) UNIQUE NOT NULL, expires_at TIMESTAMP WITH TIME ZONE NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)",
    "CREATE TABLE IF NOT EXISTS rate_limits (key VARCHAR(255) PRIMARY KEY, count INT NOT NULL DEFAULT 1, reset_at TIMESTAMP WITH TIME ZONE NOT NULL)"
  ];
  for (const stmt of statements) {
    try {
      await runNeonSql(databaseUrl, stmt);
    } catch (e) {}
  }
  schemaInitialized = true;
}

export async function checkRateLimit(databaseUrl, key, maxRequests = 20, windowMs = 60000) {
  const nowMs = Date.now();
  if (!databaseUrl) {
    const entry = edgeRateMap.get(key);
    if (!entry || entry.resetAt < nowMs) {
      edgeRateMap.set(key, { count: 1, resetAt: nowMs + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= maxRequests;
  }
  try {
    const now = new Date();
    const resetAt = new Date(nowMs + windowMs);
    const rows = await runNeonSql(
      databaseUrl,
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE
       SET count = CASE WHEN rate_limits.reset_at < $3 THEN 1 ELSE rate_limits.count + 1 END,
           reset_at = CASE WHEN rate_limits.reset_at < $3 THEN $2 ELSE rate_limits.reset_at END
       RETURNING count`,
      [key, resetAt.toISOString(), now.toISOString()]
    );
    if (rows && rows.length > 0) {
      return parseInt(rows[0].count, 10) <= maxRequests;
    }
    return false;
  } catch (e) {
    return true;
  }
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const ip = getClientIp(request);
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'me';

  if (env.DATABASE_URL) {
    await ensureAuthTables(env.DATABASE_URL);
  }

  const allowed = await checkRateLimit(env.DATABASE_URL, `auth_${ip}`, 15, 60000);
  if (!allowed) {
    return jsonResponse({ error: 'Too many authentication attempts. Please wait 1 minute.' }, 429);
  }

  if (request.method === 'GET' && action === 'me') {
    const cookies = parseCookies(request.headers.get('Cookie'));
    const token = cookies.vicecityhub_session;
    if (!token || !env.DATABASE_URL) {
      return jsonResponse({ authenticated: false });
    }
    try {
      const tokenHash = await sha256Hex(token);
      const rows = await runNeonSql(
        env.DATABASE_URL,
        'SELECT u.id, u.username, u.email, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > NOW() LIMIT 1',
        [tokenHash]
      );
      if (rows && rows.length > 0) {
        return jsonResponse({ authenticated: true, user: rows[0] });
      }
    } catch (e) {}
    return jsonResponse({ authenticated: false });
  }

  if (request.method === 'POST' && (action === 'login' || action === 'register')) {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }

    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const username = (body.username || '').trim().replace(/[^\w-]/g, '').slice(0, 24);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
      return jsonResponse({ error: 'Invalid email address format' }, 400);
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return jsonResponse({ error: 'Password must be between 8 and 128 characters' }, 400);
    }

    if (!env.DATABASE_URL) {
      return jsonResponse({
        ok: true,
        mode: 'local_preview',
        message: 'OWASP PBKDF2 validation passed. Connect DATABASE_URL in Cloudflare Pages for persistent accounts.'
      });
    }

    if (action === 'register') {
      if (username.length < 3) {
        return jsonResponse({ error: 'Username must be at least 3 characters (letters, numbers, underscore)' }, 400);
      }
      const existing = await runNeonSql(
        env.DATABASE_URL,
        'SELECT 1 FROM users WHERE LOWER(email) = $1 OR LOWER(username) = LOWER($2) LIMIT 1',
        [email, username]
      );
      if (existing && existing.length > 0) {
        return jsonResponse({ error: 'Email or username is already registered' }, 409);
      }
      const pwHash = await hashPassword(password);
      const inserted = await runNeonSql(
        env.DATABASE_URL,
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role',
        [email, username, pwHash]
      );
      const user = inserted[0];
      const rawToken = generateRandomToken();
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await runNeonSql(
        env.DATABASE_URL,
        'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, tokenHash, expiresAt]
      );
      return jsonResponse(
        { ok: true, user },
        201,
        {
          'Set-Cookie': `vicecityhub_session=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
        }
      );
    }

    if (action === 'login') {
      const rows = await runNeonSql(
        env.DATABASE_URL,
        'SELECT id, username, email, password_hash, role FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [email]
      );
      if (!rows || rows.length === 0) {
        return jsonResponse({ error: 'Invalid email or password' }, 401);
      }
      const user = rows[0];
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return jsonResponse({ error: 'Invalid email or password' }, 401);
      }
      const rawToken = generateRandomToken();
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await runNeonSql(
        env.DATABASE_URL,
        'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, tokenHash, expiresAt]
      );
      return jsonResponse(
        {
          ok: true,
          user: { id: user.id, username: user.username, email: user.email, role: user.role }
        },
        200,
        {
          'Set-Cookie': `vicecityhub_session=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
        }
      );
    }
  }

  if (request.method === 'POST' && action === 'logout') {
    return jsonResponse(
      { ok: true },
      200,
      {
        'Set-Cookie': 'vicecityhub_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
      }
    );
  }

  return jsonResponse({ error: 'Method or action not allowed' }, 405);
}
