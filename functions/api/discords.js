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
  validateAndSanitizeAvatarDataUrl,
  verifyTurnstileToken
} from './_turso.js';

const DISCORD_REGEX = /^https:\/\/(discord\.gg\/[a-zA-Z0-9_-]{2,32}|discord\.com\/invite\/[a-zA-Z0-9_-]{2,32})$/;

const ALLOWED_CATEGORIES = ['roleplay', 'heists', 'modding', 'general'];

const CATEGORY_MAP = {
  roleplay: 'Roleplay',
  heists: 'Heists & LFG',
  modding: 'Modding & Mapping',
  general: 'General Community'
};

const COUNTRY_MAP = {
  intl: 'International',
  en: 'English (Global)',
  us: 'United States',
  gb: 'United Kingdom',
  ca: 'Canada',
  au: 'Australia',
  it: 'Italy',
  es: 'Spain',
  mx: 'Mexico / Latam',
  ar: 'Argentina',
  co: 'Colombia',
  cl: 'Chile',
  pe: 'Peru',
  de: 'Germany',
  at: 'Austria',
  ch: 'Switzerland',
  fr: 'France',
  be: 'Belgium',
  pt: 'Portugal',
  br: 'Brazil',
  nl: 'Netherlands',
  pl: 'Poland',
  ro: 'Romania',
  tr: 'Turkey',
  gr: 'Greece',
  cz: 'Czechia',
  sk: 'Slovakia',
  hu: 'Hungary',
  se: 'Sweden',
  no: 'Norway',
  dk: 'Denmark',
  fi: 'Finland',
  ie: 'Ireland',
  ua: 'Ukraine',
  ru: 'Russian',
  rs: 'Serbia / Balkan',
  hr: 'Croatia',
  bg: 'Bulgaria',
  al: 'Albania',
  lt: 'Lithuania',
  lv: 'Latvia',
  ee: 'Estonia',
  jp: 'Japan',
  kr: 'South Korea',
  cn: 'China',
  tw: 'Taiwan',
  in: 'India',
  id: 'Indonesia',
  ph: 'Philippines',
  vn: 'Vietnam',
  th: 'Thailand',
  my: 'Malaysia',
  sg: 'Singapore',
  nz: 'New Zealand',
  sa: 'Arabic / MENA',
  ae: 'UAE',
  eg: 'Egypt',
  ma: 'Morocco',
  il: 'Israel',
  za: 'South Africa'
};

const ALLOWED_COUNTRIES = Object.keys(COUNTRY_MAP);

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
                invite_url as inviteUrl, members, description as desc, icon_url as iconUrl
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

    let iconUrl = '';
    const rawIcon = typeof body.iconUrl === 'string' ? body.iconUrl.trim() : '';
    if (rawIcon) {
      try {
        iconUrl = validateAndSanitizeAvatarDataUrl(rawIcon);
      } catch (iconErr) {
        return jsonResponse({ error: iconErr.message || 'Invalid server logo image format.' }, 400);
      }
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
      iconUrl: iconUrl || null,
      members: 'Verified Community',
      desc,
      status: serverStatus
    };

    if (isTursoConfigured(env)) {
      try {
        await runTursoSql(
          env,
          `INSERT INTO discord_servers (id, user_id, name, tag, category, country, country_label, invite_url, description, icon_url, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            iconUrl || null,
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
