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
  sanitizePlainText
} from './_turso.js';

export async function onRequest(context) {
  const { request, env } = context;
  const ip = getClientIp(request);
  const ipHash = await sha256Hex(ip);

  if (isTursoConfigured(env)) {
    await ensureTursoSchema(env);
  }

  // OWASP Brute-Force Guard on Admin Route
  const allowed = await checkRateLimit(env, `admin_route_${ipHash}`, 10, 60000);
  if (!allowed) {
    return jsonResponse({ error: 'Rate limit exceeded' }, 429);
  }

  // OWASP Broken Access Control Guard (API5:2023): Require verified server-side Admin role
  const authUser = await getAuthenticatedUser(request, env);
  if (!authUser || authUser.role !== 'admin') {
    if (isTursoConfigured(env)) {
      runTursoSql(
        env,
        'INSERT INTO audit_logs (id, event_type, actor_id, ip_hash, details) VALUES (?, ?, ?, ?, ?)',
        [generateUuid(), 'UNAUTHORIZED_ADMIN_ATTEMPT', authUser ? authUser.id : null, ipHash, request.url]
      ).catch(() => {});
    }
    return jsonResponse({ error: 'Forbidden: Administrator privileges required' }, 403);
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400);
    }

    const action = sanitizePlainText(body.action, 32);
    const targetId = sanitizePlainText(body.targetId, 64);
    if (!action || !targetId) {
      return jsonResponse({ error: 'Action and targetId are required' }, 400);
    }

    if (action === 'hide_post') {
      await runTursoSql(env, "UPDATE community_posts SET status = 'hidden' WHERE id = ?", [targetId]);
    } else if (action === 'hide_discord') {
      await runTursoSql(env, "UPDATE discord_servers SET status = 'hidden' WHERE id = ?", [targetId]);
    } else if (action === 'ban_user') {
      await runTursoSql(env, 'UPDATE users SET is_banned = 1 WHERE id = ? AND role != ?', [targetId, 'admin']);
      await runTursoSql(env, 'DELETE FROM sessions WHERE user_id = ?', [targetId]);
    } else {
      return jsonResponse({ error: 'Unsupported moderation action' }, 400);
    }

    await runTursoSql(
      env,
      'INSERT INTO audit_logs (id, event_type, actor_id, ip_hash, details) VALUES (?, ?, ?, ?, ?)',
      [generateUuid(), `ADMIN_${action.toUpperCase()}`, authUser.id, ipHash, `Target: ${targetId}`]
    );

    return jsonResponse({ ok: true, action, targetId });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
