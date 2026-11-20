import {
  getClientIp,
  sha256Hex,
  generateUuid,
  parseCookies,
  isTursoConfigured,
  runTursoSql,
  ensureTursoSchema
} from '../../_turso.js';
import {
  getGoogleCredentials,
  getGoogleRedirectUri,
  signOauthPayload,
  sanitizeUsernameCandidate
} from '../_oauth.js';

function generateRandomSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  const { request, env } = context;
  const ip = getClientIp(request);
  const ipHash = await sha256Hex(ip);
  const url = new URL(request.url);

  const errorParam = url.searchParams.get('error');
  if (errorParam) {
    return Response.redirect(`${url.origin}/login.html?error=google_cancelled`, 302);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(request.headers.get('Cookie'));
  const storedState = cookies.vch_oauth_state;

  if (!code || !state || !storedState || state !== storedState) {
    return Response.redirect(`${url.origin}/login.html?error=invalid_state`, 302);
  }

  const { clientId, clientSecret } = getGoogleCredentials(env);
  const redirectUri = getGoogleRedirectUri(request);

  let tokenData;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return Response.redirect(`${url.origin}/login.html?error=token_exchange_failed`, 302);
    }
  } catch (err) {
    return Response.redirect(`${url.origin}/login.html?error=token_exchange_failed`, 302);
  }

  let userInfo;
  try {
    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    userInfo = await userRes.json();
    if (!userRes.ok || !userInfo || !userInfo.sub || !userInfo.email) {
      return Response.redirect(`${url.origin}/login.html?error=userinfo_failed`, 302);
    }
  } catch (err) {
    return Response.redirect(`${url.origin}/login.html?error=userinfo_failed`, 302);
  }

  const googleId = String(userInfo.sub).trim();
  const email = String(userInfo.email).trim().toLowerCase();
  const name = String(userInfo.name || '').trim();
  const picture = String(userInfo.picture || '').trim();

  if (!isTursoConfigured(env)) {
    return Response.redirect(`${url.origin}/login.html?error=database_unavailable`, 302);
  }

  await ensureTursoSchema(env);

  try {
    const { rows: byGoogleId } = await runTursoSql(
      env,
      'SELECT id, username, email, role, avatar_url, banner_color, is_banned FROM users WHERE google_id = ? LIMIT 1',
      [googleId]
    );

    if (byGoogleId && byGoogleId.length > 0) {
      const user = byGoogleId[0];
      if (Number(user.is_banned) === 1) {
        return Response.redirect(`${url.origin}/login.html?error=account_suspended`, 302);
      }
      const rawToken = generateRandomSessionToken();
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await runTursoSql(
        env,
        'INSERT INTO sessions (id, user_id, token_hash, ip_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
        [generateUuid(), user.id, tokenHash, ipHash, expiresAt]
      );

      const headers = new Headers();
      headers.set('Location', `${url.origin}/thank-you.html?oauth_success=1`);
      headers.append('Set-Cookie', `vicecityhub_session=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
      headers.append('Set-Cookie', 'vch_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
      return new Response(null, { status: 302, headers });
    }

    const { rows: byEmail } = await runTursoSql(
      env,
      'SELECT id, username, email, role, avatar_url, banner_color, google_id, is_banned FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (byEmail && byEmail.length > 0) {
      const user = byEmail[0];
      if (Number(user.is_banned) === 1) {
        return Response.redirect(`${url.origin}/login.html?error=account_suspended`, 302);
      }
      await runTursoSql(
        env,
        'UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
        [googleId, picture || null, user.id]
      );
      const rawToken = generateRandomSessionToken();
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await runTursoSql(
        env,
        'INSERT INTO sessions (id, user_id, token_hash, ip_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
        [generateUuid(), user.id, tokenHash, ipHash, expiresAt]
      );

      const headers = new Headers();
      headers.set('Location', `${url.origin}/thank-you.html?oauth_success=1`);
      headers.append('Set-Cookie', `vicecityhub_session=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
      headers.append('Set-Cookie', 'vch_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
      return new Response(null, { status: 302, headers });
    }

    const payload = {
      googleId,
      email,
      name,
      picture,
      exp: Date.now() + 900000
    };
    const pendingToken = await signOauthPayload(payload, clientSecret);
    const suggested = sanitizeUsernameCandidate(name || email.split('@')[0]);

    const targetUrl = new URL(`${url.origin}/login.html`);
    targetUrl.searchParams.set('oauth_setup', 'google');
    targetUrl.searchParams.set('email', email);
    targetUrl.searchParams.set('suggested', suggested);

    const headers = new Headers();
    headers.set('Location', targetUrl.toString());
    headers.append('Set-Cookie', `vch_oauth_pending=${pendingToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`);
    headers.append('Set-Cookie', 'vch_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return new Response(null, { status: 302, headers });
  } catch (err) {
    return Response.redirect(`${url.origin}/login.html?error=auth_internal_error`, 302);
  }
}
