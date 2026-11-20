import {
  getClientIp,
  sha256Hex,
  generateUuid,
  jsonResponse,
  isTursoConfigured,
  runTursoSql,
  ensureTursoSchema,
  checkRateLimit,
  getAuthenticatedUser,
  sanitizePlainText,
  verifyTurnstileToken
} from './_turso.js';

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

export async function onRequest(context) {
  const { request, env } = context;
  const ip = getClientIp(request);
  const ipHash = await sha256Hex(ip);

  if (isTursoConfigured(env)) {
    await ensureTursoSchema(env);
  }

  if (request.method === 'GET') {
    const allowed = await checkRateLimit(env, `discords_get_${ipHash}`, 120, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Rate limit exceeded' }, 429);
    }

    if (!isTursoConfigured(env)) {
      return jsonResponse({ servers: [], mode: 'edge_local' });
    }

    try {
      const { rows } = await runTursoSql(
        env,
        `SELECT id, name, tag, category, country, country_label as countryLabel,
                invite_url as inviteUrl, members, description as desc
         FROM discord_servers
         WHERE status = 'approved'
         ORDER BY created_at DESC
         LIMIT 60`
      );
      return jsonResponse({ servers: rows || [] });
    } catch (e) {
      return jsonResponse({ servers: [], error: 'Failed to load servers' }, 500);
    }
  }

  if (request.method === 'POST') {
    const allowed = await checkRateLimit(env, `discords_post_${ipHash}`, 5, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Too many server submissions. Please wait 1 minute.' }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400);
    }

    if (body.discord_hp_url && String(body.discord_hp_url).trim().length > 0) {
      return jsonResponse({ error: 'Automated bot submission rejected' }, 400);
    }

    const turnstileToken = body.cfTurnstileResponse || body['cf-turnstile-response'] || '';
    const turnstileCheck = await verifyTurnstileToken(env, turnstileToken, ip, 'submit_discord');
    if (!turnstileCheck.valid) {
      return jsonResponse({ error: turnstileCheck.error || 'Security verification failed.' }, 403);
    }

    const authUser = await getAuthenticatedUser(request, env);
    if (!authUser) {
      return jsonResponse({ error: 'Authentication required. Please log in or create an account to share a Discord server.' }, 401);
    }

    const name = sanitizePlainText(body.name, 60);
    const inviteUrl = (body.inviteUrl || '').trim();
    const rawCat = (body.category || 'general').toLowerCase().trim();
    const category = ALLOWED_CATEGORIES.includes(rawCat) ? rawCat : 'general';
    const rawCountry = (body.country || 'intl').toLowerCase().trim();
    const country = ALLOWED_COUNTRIES.includes(rawCountry) ? rawCountry : 'intl';
    const desc = sanitizePlainText(body.desc || body.description, 280);

    if (name.length < 3) {
      return jsonResponse({ error: 'Server name must be at least 3 characters.' }, 400);
    }
    if (!DISCORD_REGEX.test(inviteUrl)) {
      return jsonResponse({ error: 'Invalid Discord invite URL. Must be https://discord.gg/... or https://discord.com/invite/...' }, 400);
    }
    if (desc.length < 15) {
      return jsonResponse({ error: 'Server description must be at least 15 characters.' }, 400);
    }

    const requiresApproval = authUser.role !== 'admin';
    const serverStatus = requiresApproval ? 'pending' : 'approved';

    const serverId = generateUuid();
    const serverObj = {
      id: serverId,
      name,
      tag: CATEGORY_MAP[category] || 'Community',
      category,
      country,
      countryLabel: COUNTRY_MAP[country] || 'International',
      inviteUrl,
      members: 'Verified Community',
      desc,
      status: serverStatus
    };

    if (isTursoConfigured(env)) {
      try {
        await runTursoSql(
          env,
          `INSERT INTO discord_servers (id, user_id, name, tag, category, country, country_label, invite_url, description, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            serverId,
            authUser.id,
            name,
            serverObj.tag,
            category,
            country,
            serverObj.countryLabel,
            inviteUrl,
            desc,
            serverStatus
          ]
        );
      } catch (e) {}
    }

    return jsonResponse({
      ok: true,
      pending: requiresApproval,
      message: requiresApproval ? 'Waiting for the moderators approval' : 'Discord server published',
      server: serverObj
    }, 201);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
