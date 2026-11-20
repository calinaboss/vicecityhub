import { checkRateLimit } from './auth.js';

const DISCORD_REGEX = /^https:\/\/(discord\.gg\/[a-zA-Z0-9_-]{2,32}|discord\.com\/invite\/[a-zA-Z0-9_-]{2,32})$/;

const ALLOWED_CATEGORIES = ['roleplay', 'heists', 'modding', 'general'];
const ALLOWED_COUNTRIES = ['intl', 'it', 'es', 'de', 'fr'];

const CATEGORY_MAP = {
  roleplay: 'Roleplay',
  heists: 'Heists & LFG',
  modding: 'Modding & Mapping',
  general: 'General Community'
};

const COUNTRY_MAP = {
  intl: 'International',
  it: 'Italy',
  es: 'Spain / Latam',
  de: 'Germany',
  fr: 'France'
};

function sanitizeText(str, maxLen = 280) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .trim()
    .slice(0, maxLen);
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
    const errText = await res.text().catch(() => '');
    throw new Error(`Database query failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  if (data && Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data) && data[0] && Array.isArray(data[0].rows)) return data[0].rows;
  return [];
}

let discordSchemaInitialized = false;
async function ensureDiscordTables(databaseUrl) {
  if (discordSchemaInitialized || !databaseUrl) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS discord_servers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(64) NOT NULL,
      tag VARCHAR(48) NOT NULL,
      category VARCHAR(32) NOT NULL DEFAULT 'general',
      country VARCHAR(16) NOT NULL DEFAULT 'intl',
      country_label VARCHAR(32) NOT NULL DEFAULT 'International',
      invite_url VARCHAR(120) NOT NULL,
      members VARCHAR(32) DEFAULT 'Verified Community',
      description VARCHAR(280) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_discord_servers_created ON discord_servers(created_at DESC)`
  ];
  for (const stmt of statements) {
    try {
      await runNeonSql(databaseUrl, stmt);
    } catch (e) {}
  }
  discordSchemaInitialized = true;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';

  if (env.DATABASE_URL) {
    await ensureDiscordTables(env.DATABASE_URL);
  }

  if (request.method === 'GET') {
    const allowed = await checkRateLimit(env.DATABASE_URL, `discords_get_${ip}`, 120, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Rate limit exceeded' }, 429);
    }

    if (!env.DATABASE_URL) {
      return jsonResponse({ servers: [], mode: 'edge_local' });
    }

    try {
      const rows = await runNeonSql(
        env.DATABASE_URL,
        `SELECT id, name, tag, category, country, country_label as "countryLabel",
                invite_url as "inviteUrl", members, description as desc
         FROM discord_servers
         ORDER BY created_at DESC
         LIMIT 60`
      );
      return jsonResponse({ servers: rows || [] });
    } catch (e) {
      return jsonResponse({ servers: [], error: 'Failed to load servers' }, 500);
    }
  }

  if (request.method === 'POST') {
    const allowed = await checkRateLimit(env.DATABASE_URL, `discords_post_${ip}`, 5, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Too many server submissions. Please wait 1 minute.' }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400);
    }

    // OWASP Honeypot Check
    if (body.discord_hp_url && String(body.discord_hp_url).trim().length > 0) {
      return jsonResponse({ error: 'Automated bot submission rejected' }, 400);
    }

    const name = sanitizeText(body.name, 60);
    const inviteUrl = (body.inviteUrl || '').trim();
    const rawCat = (body.category || 'general').toLowerCase().trim();
    const category = ALLOWED_CATEGORIES.includes(rawCat) ? rawCat : 'general';
    const rawCountry = (body.country || 'intl').toLowerCase().trim();
    const country = ALLOWED_COUNTRIES.includes(rawCountry) ? rawCountry : 'intl';
    const desc = sanitizeText(body.desc || body.description, 280);

    if (name.length < 3) {
      return jsonResponse({ error: 'Server name must be at least 3 characters.' }, 400);
    }
    if (!DISCORD_REGEX.test(inviteUrl)) {
      return jsonResponse({ error: 'OWASP Guard: Invalid Discord invite! Must be https://discord.gg/... or https://discord.com/invite/...' }, 400);
    }
    if (desc.length < 15) {
      return jsonResponse({ error: 'Server description must be at least 15 characters.' }, 400);
    }

    const serverObj = {
      id: `dc-${Date.now()}`,
      name,
      tag: CATEGORY_MAP[category] || 'Community',
      category,
      country,
      countryLabel: COUNTRY_MAP[country] || 'International',
      inviteUrl,
      members: 'Just Added',
      desc
    };

    if (env.DATABASE_URL) {
      try {
        const inserted = await runNeonSql(
          env.DATABASE_URL,
          `INSERT INTO discord_servers (name, tag, category, country, country_label, invite_url, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [name, serverObj.tag, category, country, serverObj.countryLabel, inviteUrl, desc]
        );
        if (inserted && inserted[0]) {
          serverObj.id = inserted[0].id;
        }
      } catch (e) {}
    }

    return jsonResponse({ ok: true, server: serverObj }, 201);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
