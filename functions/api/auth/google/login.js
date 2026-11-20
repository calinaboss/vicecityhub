import { getGoogleCredentials, getGoogleRedirectUri } from '../_oauth.js';

export async function onRequest(context) {
  const { request, env } = context;
  const { clientId } = getGoogleCredentials(env);
  const redirectUri = getGoogleRedirectUri(request);
  const url = new URL(request.url);

  if (!clientId) {
    return Response.redirect(`${url.origin}/login.html?error=oauth_config_missing`, 302);
  }

  const stateBytes = crypto.getRandomValues(new Uint8Array(24));
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl.toString(),
      'Set-Cookie': `vch_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`
    }
  });
}
