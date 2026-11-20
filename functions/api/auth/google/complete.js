import {
  getClientIp,
  sha256Hex,
  generateUuid,
  parseCookies,
  jsonResponse,
  isTursoConfigured,
  runTursoSql,
  ensureTursoSchema,
  checkRateLimit
} from '../../_turso.js';
import {
  getGoogleCredentials,
  verifyOauthPayload
} from '../_oauth.js';

function generateRandomSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const ip = getClientIp(request);
    const ipHash = await sha256Hex(ip);

    const allowed = await checkRateLimit(env, `oauth_comp_${ipHash}`, 20, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Troppi tentativi. Attendi un momento prima di riprovare.' }, 429);
    }

    const cookies = parseCookies(request.headers.get('Cookie'));
    const pendingToken = cookies.vch_oauth_pending;

    if (!pendingToken) {
      return jsonResponse({
        error: 'Sessione di autenticazione Google scaduta o non trovata. Riavvia l\'accesso con Google.'
      }, 401);
    }

    const { clientSecret } = getGoogleCredentials(env);
    const oauthData = await verifyOauthPayload(pendingToken, clientSecret);

    if (!oauthData || !oauthData.googleId || !oauthData.email) {
      return jsonResponse({
        error: 'Token di autorizzazione Google non valido o scaduto. Effettua nuovamente il login con Google.'
      }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Payload JSON non valido' }, 400);
    }

    const rawUsername = (body && typeof body.username === 'string') ? body.username.trim() : '';
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(rawUsername)) {
      return jsonResponse({
        error: 'Il nome utente deve avere da 3 a 20 caratteri alfanumerici o underscore (nessuno spazio o simbolo speciale).'
      }, 400);
    }

    if (!isTursoConfigured(env)) {
      return jsonResponse({ error: 'Database non disponibile al momento. Riprova più tardi.' }, 500);
    }

    await ensureTursoSchema(env);

    const { rows: takenUsers } = await runTursoSql(
      env,
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1',
      [rawUsername]
    );

    if (takenUsers && takenUsers.length > 0) {
      return jsonResponse({
        error: 'Questo nome utente è già in uso. Per favore scegline uno diverso.'
      }, 409);
    }

    const googleId = String(oauthData.googleId).trim();
    const email = String(oauthData.email).trim().toLowerCase();
    const avatarUrl = oauthData.picture || 'assets/brand/favicon-192x192.png';

    const { rows: existingAccount } = await runTursoSql(
      env,
      'SELECT id, username, email, role, avatar_url, banner_color, is_banned FROM users WHERE google_id = ? OR LOWER(email) = LOWER(?) LIMIT 1',
      [googleId, email]
    );

    let user;
    if (existingAccount && existingAccount.length > 0) {
      user = existingAccount[0];
      if (Number(user.is_banned) === 1) {
        return jsonResponse({ error: 'Questo account è stato sospeso.' }, 403);
      }
      await runTursoSql(
        env,
        'UPDATE users SET google_id = ? WHERE id = ?',
        [googleId, user.id]
      );
    } else {
      const newUserId = generateUuid();
      const role = (env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.trim().toLowerCase()) ? 'admin' : 'user';
      const dummyPwHash = `oauth:google:${await sha256Hex(googleId + Date.now())}`;

      await runTursoSql(
        env,
        'INSERT INTO users (id, email, username, password_hash, role, avatar_url, banner_color, google_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [newUserId, email, rawUsername, dummyPwHash, role, avatarUrl, '#ff2a85', googleId]
      );

      user = {
        id: newUserId,
        username: rawUsername,
        email,
        role,
        avatar_url: avatarUrl,
        banner_color: '#ff2a85'
      };
    }

    const rawToken = generateRandomSessionToken();
    const tokenHash = await sha256Hex(rawToken);
    const sessionId = generateUuid();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await runTursoSql(
      env,
      'INSERT INTO sessions (id, user_id, token_hash, ip_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
      [sessionId, user.id, tokenHash, ipHash, expiresAt]
    );

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.append('Set-Cookie', `vicecityhub_session=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
    headers.append('Set-Cookie', 'vch_oauth_pending=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    headers.append('Set-Cookie', 'vch_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

    return new Response(JSON.stringify({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url || avatarUrl,
        banner_color: user.banner_color || '#ff2a85'
      }
    }), {
      status: 201,
      headers
    });
  } catch (err) {
    return jsonResponse({
      error: err && err.message ? err.message : 'Errore imprevisto durante il completamento dell\'account.'
    }, 500);
  }
}
