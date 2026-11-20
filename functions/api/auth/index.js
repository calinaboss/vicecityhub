import {
  getClientIp,
  sha256Hex,
  generateUuid,
  parseCookies,
  jsonResponse,
  isTursoConfigured,
  runTursoSql,
  ensureTursoSchema,
  checkRateLimit,
  getAuthenticatedUser,
  verifyTurnstileToken
} from '../_turso.js';

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
  try {
    const key = await crypto.subtle.importKey('raw', pwBuf, 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      key,
      256
    );
    const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `100000:${saltHex}:${hashHex}`;
  } catch (e) {
    const hashHex = await sha256Hex(`${saltHex}:${password}`);
    return `sha256:${saltHex}:${hashHex}`;
  }
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const prefix = parts[0];
  const saltHex = parts[1];
  const originalHashHex = parts[2];
  if (!saltHex || !originalHashHex) return false;

  if (prefix === 'sha256') {
    const derivedHex = await sha256Hex(`${saltHex}:${password}`);
    return constantTimeEqual(derivedHex, originalHashHex);
  }

  try {
    const iterations = Math.min(parseInt(prefix, 10) || 100000, 100000);
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const pwBuf = new TextEncoder().encode(password);
    const key = await crypto.subtle.importKey('raw', pwBuf, 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      256
    );
    const derivedHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
    return constantTimeEqual(derivedHex, originalHashHex);
  } catch (e) {
    return false;
  }
}

function generateRandomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const ip = getClientIp(request);
    const ipHash = await sha256Hex(ip);
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'me';

    if (isTursoConfigured(env)) {
      await ensureTursoSchema(env);
    }

    const allowed = await checkRateLimit(env, `auth_${ipHash}`, 20, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Too many authentication attempts. Please wait 1 minute.' }, 429);
    }

    if (request.method === 'GET' && action === 'me') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) {
        return jsonResponse({ authenticated: false });
      }
      return jsonResponse({ authenticated: true, user });
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
      const turnstileToken = body.cfTurnstileResponse || body['cf-turnstile-response'] || '';

      const turnstileCheck = await verifyTurnstileToken(env, turnstileToken, ip, '');
      if (!turnstileCheck.valid) {
        return jsonResponse({ error: turnstileCheck.error || 'Turnstile verification failed.' }, 403);
      }

      if (action === 'register' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)) {
        return jsonResponse({ error: 'Invalid email address format' }, 400);
      }
      if (action === 'login' && (email.length < 3 || email.length > 120)) {
        return jsonResponse({ error: 'Please enter your email or username' }, 400);
      }
      if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return jsonResponse({ error: 'Password must be between 8 and 128 characters' }, 400);
      }

      if (!isTursoConfigured(env)) {
        return jsonResponse({
          error: 'Database token not found in environment. Please verify TURSO_AUTH_TOKEN is saved in Cloudflare Pages variables and redeploy.'
        }, 500);
      }

      if (action === 'register') {
        if (username.length < 3) {
          return jsonResponse({ error: 'Username must be at least 3 characters' }, 400);
        }
        const { rows: existing } = await runTursoSql(
          env,
          'SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = LOWER(?) LIMIT 1',
          [email, username]
        );
        if (existing.length > 0) {
          return jsonResponse({ error: 'Email or username is already registered' }, 409);
        }

        const userId = generateUuid();
        const pwHash = await hashPassword(password);
        const role = (env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.trim().toLowerCase()) ? 'admin' : 'user';

        await runTursoSql(
          env,
          'INSERT INTO users (id, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
          [userId, email, username, pwHash, role]
        );

        const rawToken = generateRandomToken();
        const tokenHash = await sha256Hex(rawToken);
        const sessionId = generateUuid();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

        await runTursoSql(
          env,
          'INSERT INTO sessions (id, user_id, token_hash, ip_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
          [sessionId, userId, tokenHash, ipHash, expiresAt]
        );

        return jsonResponse(
          { ok: true, user: { id: userId, username, email, role } },
          201,
          {
            'Set-Cookie': `vicecityhub_session=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
          }
        );
      }

      if (action === 'login') {
        const { rows } = await runTursoSql(
          env,
          'SELECT id, username, email, password_hash, role, avatar_url, banner_color, is_banned FROM users WHERE LOWER(email) = ? OR LOWER(username) = LOWER(?) LIMIT 1',
          [email, email]
        );
        if (rows.length === 0) {
          return jsonResponse({ error: 'Invalid email or password' }, 401);
        }
        const user = rows[0];
        if (Number(user.is_banned) === 1) {
          return jsonResponse({ error: 'This account has been suspended.' }, 403);
        }
        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
          return jsonResponse({ error: 'Invalid email or password' }, 401);
        }

        const rawToken = generateRandomToken();
        const tokenHash = await sha256Hex(rawToken);
        const sessionId = generateUuid();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

        await runTursoSql(
          env,
          'INSERT INTO sessions (id, user_id, token_hash, ip_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
          [sessionId, user.id, tokenHash, ipHash, expiresAt]
        );

        return jsonResponse(
          {
            ok: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              avatar_url: user.avatar_url || 'assets/brand/favicon-192x192.png',
              banner_color: user.banner_color || '#ff2a85'
            }
          },
          200,
          {
            'Set-Cookie': `vicecityhub_session=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
          }
        );
      }
    }

    if (request.method === 'POST' && action === 'logout') {
      try {
        const cookies = parseCookies(request.headers.get('Cookie'));
        if (cookies.vicecityhub_session) {
          const tokenHash = await sha256Hex(cookies.vicecityhub_session);
          await runTursoSql(env, 'DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
        }
      } catch (e) {}
      return jsonResponse(
        { ok: true },
        200,
        {
          'Set-Cookie': 'vicecityhub_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
        }
      );
    }

    return jsonResponse({ error: 'Method or action not allowed' }, 405);
  } catch (err) {
    return jsonResponse({
      error: err && err.message ? err.message : 'Unexpected server error during authentication.'
    }, 500);
  }
}
