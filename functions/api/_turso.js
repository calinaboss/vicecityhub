// ============================================================================
// TURSO (libSQL over HTTPS) CLIENT & OWASP SECURITY CORE FOR CLOUDFLARE PAGES
// Zero secrets in code. Uses env.TURSO_DATABASE_URL and env.TURSO_AUTH_TOKEN.
// ============================================================================

const edgeRateMap = new Map();

export function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'anonymous';
}

export async function sha256Hex(str) {
  const buf = new TextEncoder().encode(String(str));
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateUuid() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    try {
      list[name] = decodeURIComponent(value);
    } catch (e) {
      list[name] = value;
    }
  });
  return list;
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders
    }
  });
}

/**
 * Converts a JS primitive into a Turso HTTP v2 pipeline typed argument
 * Prevents all forms of SQL injection via strict type binding.
 */
function toTursoArg(val) {
  if (val === null || val === undefined) {
    return { type: 'null' };
  }
  if (typeof val === 'boolean') {
    return { type: 'integer', value: val ? '1' : '0' };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { type: 'integer', value: String(val) };
    }
    return { type: 'float', value: val };
  }
  return { type: 'text', value: String(val) };
}

/**
 * Parses Turso HTTP v2 pipeline result rows into plain JS objects
 */
function parseTursoResult(execResult) {
  if (!execResult || !execResult.cols || !Array.isArray(execResult.rows)) {
    return [];
  }
  const colNames = execResult.cols.map(c => c.name);
  return execResult.rows.map(row => {
    const obj = {};
    for (let i = 0; i < colNames.length; i++) {
      const cell = row[i];
      if (!cell || cell.type === 'null') {
        obj[colNames[i]] = null;
      } else if (cell.type === 'integer') {
        obj[colNames[i]] = parseInt(cell.value, 10);
      } else if (cell.type === 'float') {
        obj[colNames[i]] = parseFloat(cell.value);
      } else {
        obj[colNames[i]] = cell.value;
      }
    }
    return obj;
  });
}

export function getTursoUrl(env) {
  let raw = (
    env?.TURSO_DATABASE_URL ||
    env?.TURSO_URL ||
    env?.DATABASE_URL ||
    'libsql://vicecityhub-calinaboss.aws-eu-central-1.turso.io'
  ).trim().replace(/^["']+|["']+$/g, '');
  const qIdx = raw.indexOf('?');
  if (qIdx !== -1) {
    raw = raw.slice(0, qIdx);
  }
  return raw.replace(/^libsql:\/\//i, 'https://').replace(/\/+$/, '');
}

export function getTursoToken(env) {
  let rawToken = (
    env?.TURSO_AUTH_TOKEN ||
    env?.TURSO_TOKEN ||
    env?.TURSO_API_KEY ||
    env?.TURSO_SECRET ||
    env?.DATABASE_TOKEN ||
    env?.DB_TOKEN ||
    ''
  ).trim();

  if (!rawToken) {
    const rawUrl = (env?.TURSO_DATABASE_URL || env?.TURSO_URL || env?.DATABASE_URL || '').trim();
    const match = rawUrl.match(/[?&]authToken=([^&]+)/i);
    if (match && match[1]) {
      rawToken = match[1];
    }
  }

  return rawToken
    .replace(/^["']+|["']+$/g, '')
    .replace(/^Bearer\s+/i, '')
    .replace(/^authToken=/i, '')
    .replace(/\s+/g, '');
}

export function isTursoConfigured(env) {
  return Boolean(getTursoUrl(env) && getTursoToken(env));
}

/**
 * Executes a parameterized SQL query against Turso HTTP v2 Pipeline API
 */
export async function runTursoSql(env, sql, params = []) {
  if (!isTursoConfigured(env)) {
    throw new Error('TURSO_NOT_CONFIGURED');
  }

  const rawUrl = getTursoUrl(env);
  const authToken = getTursoToken(env);
  const endpoint = `${rawUrl}/v2/pipeline`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  const payload = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          args: params.map(toTursoArg)
        }
      },
      { type: 'close' }
    ]
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Turso HTTP error (${res.status}): ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    const first = data?.results?.[0];
    if (first?.type === 'error') {
      throw new Error(`Turso SQL error: ${first.error?.message || 'Unknown error'}`);
    }

    const execResult = first?.response?.result;
    return {
      rows: parseTursoResult(execResult),
      affectedRowCount: execResult?.affected_row_count || 0
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Executes a batch of SQL statements in a single HTTP roundtrip to save Turso quota & latency
 */
export async function runTursoBatch(env, statements) {
  if (!isTursoConfigured(env)) return;
  const rawUrl = getTursoUrl(env);
  const authToken = getTursoToken(env);
  const endpoint = `${rawUrl}/v2/pipeline`;

  const requests = statements.map(item => {
    const sql = typeof item === 'string' ? item : item.sql;
    const args = (typeof item === 'object' && Array.isArray(item.args)) ? item.args.map(toTursoArg) : [];
    return { type: 'execute', stmt: { sql, args } };
  });
  requests.push({ type: 'close' });

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
}

let tursoSchemaReady = false;
export async function ensureTursoSchema(env) {
  if (tursoSchemaReady || !isTursoConfigured(env)) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      is_banned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      ip_hash TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
    `CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      category TEXT NOT NULL DEFAULT 'discussions',
      category_label TEXT NOT NULL DEFAULT 'Discussions',
      pinned INTEGER NOT NULL DEFAULT 0,
      author TEXT NOT NULL,
      username TEXT NOT NULL,
      badge TEXT DEFAULT 'Member',
      badge_class TEXT DEFAULT 'verified',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      media_url TEXT,
      likes_count INTEGER NOT NULL DEFAULT 1,
      bookmarks_count INTEGER NOT NULL DEFAULT 0,
      comments_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_posts_feed ON community_posts(status, pinned DESC, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_category ON community_posts(category, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS post_likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT,
      actor_fingerprint TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(post_id, actor_fingerprint),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id)`,
    `CREATE TABLE IF NOT EXISTS post_bookmarks (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT,
      actor_fingerprint TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(post_id, actor_fingerprint),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS community_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT,
      author TEXT NOT NULL,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_comments_post ON community_comments(post_id, created_at ASC)`,
    `CREATE TABLE IF NOT EXISTS discord_servers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      tag TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      country TEXT NOT NULL DEFAULT 'intl',
      country_label TEXT NOT NULL DEFAULT 'International',
      invite_url TEXT NOT NULL,
      members TEXT NOT NULL DEFAULT 'Verified Community',
      description TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_discords_list ON discord_servers(status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS security_reports (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      reporter_ip_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      reset_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at)`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor_id TEXT,
      ip_hash TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ];

  try {
    await runTursoBatch(env, statements);
    tursoSchemaReady = true;
  } catch (e) {}
}

/**
 * Distributed + Edge Rate Limiter (OWASP API4:2023 Unrestricted Resource Consumption)
 */
export async function checkRateLimit(env, key, maxRequests = 20, windowMs = 60000) {
  const nowMs = Date.now();

  // Fast first-line in-memory check per isolate (saves Turso row reads against floods)
  const memEntry = edgeRateMap.get(key);
  if (memEntry && memEntry.resetAt > nowMs) {
    memEntry.count += 1;
    if (memEntry.count > maxRequests) return false;
  } else {
    edgeRateMap.set(key, { count: 1, resetAt: nowMs + windowMs });
  }

  if (!isTursoConfigured(env)) {
    return true;
  }

  try {
    const resetAt = nowMs + windowMs;
    if (Math.random() < 0.03) {
      runTursoSql(env, 'DELETE FROM rate_limits WHERE reset_at < ?', [nowMs]).catch(() => {});
    }
    const { rows } = await runTursoSql(
      env,
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at < ? THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at < ? THEN ? ELSE rate_limits.reset_at END
       RETURNING count`,
      [key, resetAt, nowMs, nowMs, resetAt]
    );
    if (rows && rows.length > 0) {
      return Number(rows[0].count) <= maxRequests;
    }
    return true;
  } catch (e) {
    return true;
  }
}

export async function getAuthenticatedUser(request, env) {
  if (!isTursoConfigured(env)) return null;
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies.vicecityhub_session;
  if (!token || typeof token !== 'string' || token.length < 32) return null;
  try {
    const tokenHash = await sha256Hex(token);
    const { rows } = await runTursoSql(
      env,
      `SELECT u.id, u.username, u.email, u.role, u.avatar_url
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.is_banned = 0
       LIMIT 1`,
      [tokenHash]
    );
    if (rows && rows.length > 0) {
      return rows[0];
    }
  } catch (e) {}
  return null;
}

export function sanitizePlainText(input, maxLen = 2000) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .trim()
    .slice(0, maxLen);
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

/**
 * Canonical Server-Side Cloudflare Turnstile Siteverify
 * Reads secret strictly from env.TURNSTILE_SECRET_KEY (or env.TURNSTILE_SECRET).
 * Zero secrets stored in source code.
 */
export async function verifyTurnstileToken(env, token, remoteIp, expectedAction = '') {
  const secretKey = (
    env?.TURNSTILE_SECRET_KEY ||
    env?.TURNSTILE_SECRET ||
    env?.CF_TURNSTILE_SECRET ||
    env?.TURNSTILE_KEY ||
    ''
  ).trim();
  if (!secretKey) {
    return { valid: true, mode: 'unconfigured_preview' };
  }

  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return { valid: false, error: 'Please wait for the Cloudflare Turnstile security check to complete.' };
  }

  const expectedHostnames = new Set(
    (env.TURNSTILE_HOSTNAMES || 'vicecityhub.eu,www.vicecityhub.eu,map.vicecityhub.eu')
      .split(',')
      .map(h => h.trim().toLowerCase())
      .filter(Boolean)
  );

  try {
    const bodyParams = new URLSearchParams({
      secret: secretKey,
      response: token
    });
    if (remoteIp && remoteIp !== 'anonymous') {
      bodyParams.append('remoteip', remoteIp);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { valid: false, error: 'Turnstile verification service unavailable.' };
    }

    const result = await res.json();
    if (!result || result.success !== true) {
      return { valid: false, error: 'Cloudflare Turnstile verification failed. Please retry.' };
    }

    if (expectedAction && result.action && result.action !== expectedAction) {
      return { valid: false, error: 'Turnstile action mismatch.' };
    }

    if (result.hostname) {
      const host = result.hostname.toLowerCase();
      const allowedHost =
        expectedHostnames.has(host) ||
        host.endsWith('vicecityhub.eu') ||
        host.endsWith('.pages.dev') ||
        host === 'localhost' ||
        host === '127.0.0.1';
      if (!allowedHost) {
        return { valid: false, error: `Turnstile hostname (${host}) is not authorized.` };
      }
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Turnstile verification timed out.' };
  }
}
