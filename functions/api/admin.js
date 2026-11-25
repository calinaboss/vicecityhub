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

function formatTutorialRow(r) {
  let tUrl = (r.thumbnail_url || '').trim();
  if (!tUrl || tUrl === '/assets/brand/vicecityhub-og.jpg') {
    if (r.platform === 'instagram' && r.video_url) {
      const m = r.video_url.match(/\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
      if (m && m[1]) {
        tUrl = `https://www.instagram.com/p/${m[1]}/media/?size=l`;
      }
    } else if (r.platform === 'youtube' && r.video_url) {
      const ym = r.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
      if (ym && ym[1]) {
        tUrl = `https://img.youtube.com/vi/${ym[1]}/hqdefault.jpg`;
      }
    }
  }
  return { ...r, thumbnail_url: tUrl || '/assets/brand/vicecityhub-og.jpg' };
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const ip = getClientIp(request);
    const ipHash = await sha256Hex(ip);

    if (!isTursoConfigured(env)) {
      return jsonResponse({ error: 'Database not configured' }, 500);
    }

    await ensureTursoSchema(env);

    const allowed = await checkRateLimit(env, `admin_route_${ipHash}`, 30, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Rate limit exceeded' }, 429);
    }

    const authUser = await getAuthenticatedUser(request, env);
    const isAdminEmail = Boolean(
      authUser &&
      env.ADMIN_EMAIL &&
      authUser.email &&
      authUser.email.toLowerCase() === env.ADMIN_EMAIL.trim().toLowerCase()
    );

    if (authUser && isAdminEmail && authUser.role !== 'admin') {
      await runTursoSql(env, "UPDATE users SET role = 'admin' WHERE id = ?", [authUser.id]);
      authUser.role = 'admin';
    }

    if (!authUser || authUser.role !== 'admin') {
      runTursoSql(
        env,
        'INSERT INTO audit_logs (id, event_type, actor_id, ip_hash, details) VALUES (?, ?, ?, ?, ?)',
        [generateUuid(), 'UNAUTHORIZED_ADMIN_ATTEMPT', authUser ? authUser.id : null, ipHash, request.url]
      ).catch(() => {});
      return jsonResponse({ error: 'Forbidden: Administrator privileges required' }, 403);
    }

    if (request.method === 'GET') {
      const { rows: pendingOfficialPosts } = await runTursoSql(
        env,
        `SELECT id, category, category_label, author, username, title, content, media_url, media_type, status, created_at
         FROM community_posts
         WHERE status = 'pending'
         ORDER BY created_at DESC
         LIMIT 50`
      );

      const { rows: allPosts } = await runTursoSql(
        env,
        `SELECT id, category, category_label, pinned, author, username, title, content, likes_count, status, created_at
         FROM community_posts
         WHERE status = 'approved'
         ORDER BY pinned DESC, created_at DESC
         LIMIT 60`
      );

      const { rows: pendingDiscords } = await runTursoSql(
        env,
        `SELECT id, name, tag, category, country, country_label, invite_url, description, icon_url, status, created_at
         FROM discord_servers
         WHERE status = 'pending'
         ORDER BY created_at DESC
         LIMIT 50`
      );

      const { rows: approvedDiscords } = await runTursoSql(
        env,
        `SELECT id, name, tag, category, country, country_label, invite_url, description, icon_url, status, created_at
         FROM discord_servers
         WHERE status = 'approved'
         ORDER BY created_at DESC
         LIMIT 50`
      );

      const { rows: users } = await runTursoSql(
        env,
        `SELECT id, username, email, role, avatar_url, followers_count, is_banned, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT 100`
      );

      const { rows: tickets } = await runTursoSql(
        env,
        `SELECT id, username, email, category, subject, message, status, created_at
         FROM support_tickets
         WHERE status = 'open'
         ORDER BY created_at DESC
         LIMIT 50`
      ).catch(() => ({ rows: [] }));

      const ticketMessagesMap = {};
      for (const t of (tickets || [])) {
        const { rows: mRows } = await runTursoSql(
          env,
          `SELECT id, ticket_id, sender_role, sender_name, message, created_at
           FROM ticket_messages
           WHERE ticket_id = ?
           ORDER BY created_at ASC`,
          [t.id]
        ).catch(() => ({ rows: [] }));
        ticketMessagesMap[t.id] = mRows || [];
      }

      const { rows: reports } = await runTursoSql(
        env,
        `SELECT r.id, r.target_id, r.reason, r.created_at,
                p.title AS post_title, p.author AS post_author, p.username AS post_username, p.content AS post_content
         FROM security_reports r
         LEFT JOIN community_posts p ON r.target_id = p.id
         WHERE r.status = 'pending'
         ORDER BY r.created_at DESC
         LIMIT 50`
      ).catch(() => ({ rows: [] }));

      const { rows: pendingTutorials } = await runTursoSql(
        env,
        `SELECT id, title, description, category, category_label, video_url, platform, thumbnail_url, embed_url, views_count, status, created_at
         FROM tutorials
         WHERE status = 'pending'
         ORDER BY created_at DESC
         LIMIT 60`
      ).catch(() => ({ rows: [] }));

      const { rows: approvedTutorials } = await runTursoSql(
        env,
        `SELECT id, title, description, category, category_label, video_url, platform, thumbnail_url, embed_url, views_count, status, created_at
         FROM tutorials
         WHERE status = 'approved'
         ORDER BY created_at DESC
         LIMIT 100`
      ).catch(() => ({ rows: [] }));

      return jsonResponse({
        ok: true,
        admin: { id: authUser.id, username: authUser.username, email: authUser.email },
        pendingOfficialPosts: pendingOfficialPosts || [],
        allPosts: allPosts || [],
        pendingDiscords: pendingDiscords || [],
        approvedDiscords: approvedDiscords || [],
        users: users || [],
        tutorials: (approvedTutorials || []).map(formatTutorialRow),
        pendingTutorials: (pendingTutorials || []).map(formatTutorialRow),
        approvedTutorials: (approvedTutorials || []).map(formatTutorialRow),
        tickets: (tickets || []).map(t => ({
          ...t,
          messages: ticketMessagesMap[t.id] || []
        })),
        reports: reports || []
      });
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

      if (action === 'approve_post') {
        await runTursoSql(env, "UPDATE community_posts SET status = 'approved' WHERE id = ?", [targetId]);
      } else if (action === 'delete_post' || action === 'reject_post' || action === 'hide_post') {
        await runTursoSql(env, 'DELETE FROM community_comments WHERE post_id = ?', [targetId]).catch(() => {});
        await runTursoSql(env, 'DELETE FROM post_likes WHERE post_id = ?', [targetId]).catch(() => {});
        await runTursoSql(env, 'DELETE FROM post_bookmarks WHERE post_id = ?', [targetId]).catch(() => {});
        await runTursoSql(env, 'DELETE FROM security_reports WHERE target_id = ?', [targetId]).catch(() => {});
        await runTursoSql(env, 'DELETE FROM community_posts WHERE id = ?', [targetId]);
      } else if (action === 'dismiss_report') {
        await runTursoSql(env, 'DELETE FROM security_reports WHERE id = ?', [targetId]);
      } else if (action === 'pin_post') {
        await runTursoSql(
          env,
          'UPDATE community_posts SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END WHERE id = ?',
          [targetId]
        );
      } else if (action === 'approve_discord') {
        await runTursoSql(env, "UPDATE discord_servers SET status = 'approved', verified = 1 WHERE id = ?", [targetId]);
      } else if (action === 'delete_discord' || action === 'reject_discord' || action === 'hide_discord') {
        await runTursoSql(env, 'DELETE FROM discord_servers WHERE id = ?', [targetId]);
      } else if (action === 'approve_tutorial') {
        await runTursoSql(env, "UPDATE tutorials SET status = 'approved' WHERE id = ?", [targetId]);
      } else if (action === 'delete_tutorial' || action === 'reject_tutorial') {
        await runTursoSql(env, 'DELETE FROM tutorials WHERE id = ?', [targetId]);
      } else if (action === 'delete_user') {
        if (targetId === authUser.id) {
          return jsonResponse({ error: 'Cannot delete your own administrator account' }, 400);
        }
        const { rows: uRows } = await runTursoSql(env, 'SELECT id, username, role FROM users WHERE id = ? LIMIT 1', [targetId]);
        if (uRows.length === 0) {
          return jsonResponse({ error: 'User not found' }, 404);
        }
        if (uRows[0].role === 'admin') {
          return jsonResponse({ error: 'Cannot delete an administrator profile' }, 403);
        }
        const uname = uRows[0].username;
        await runTursoSql(env, 'DELETE FROM sessions WHERE user_id = ?', [targetId]).catch(() => {});
        await runTursoSql(env, 'DELETE FROM user_follows WHERE follower_id = ? OR following_id = ?', [targetId, targetId]).catch(() => {});
        await runTursoSql(env, 'DELETE FROM community_comments WHERE user_id = ? OR LOWER(username) = LOWER(?)', [targetId, uname]).catch(() => {});
        await runTursoSql(env, 'DELETE FROM community_posts WHERE user_id = ? OR LOWER(username) = LOWER(?)', [targetId, uname]).catch(() => {});
        await runTursoSql(env, 'DELETE FROM users WHERE id = ?', [targetId]);
      } else if (action === 'ban_user') {
        await runTursoSql(env, "UPDATE users SET is_banned = 1 WHERE id = ? AND role != 'admin'", [targetId]);
        await runTursoSql(env, 'DELETE FROM sessions WHERE user_id = ?', [targetId]);
      } else if (action === 'unban_user') {
        await runTursoSql(env, 'UPDATE users SET is_banned = 0 WHERE id = ?', [targetId]);
      } else if (action === 'reply_ticket') {
        const replyText = sanitizePlainText(body.message || '', 1500);
        if (!replyText) {
          return jsonResponse({ error: 'Reply message cannot be empty' }, 400);
        }
        await runTursoSql(
          env,
          `INSERT INTO ticket_messages (id, ticket_id, sender_role, sender_name, message)
           VALUES (?, ?, 'admin', ?, ?)`,
          [generateUuid(), targetId, authUser.username, replyText]
        );
      } else if (action === 'close_ticket') {
        await runTursoSql(env, 'DELETE FROM ticket_messages WHERE ticket_id = ?', [targetId]).catch(() => {});
        await runTursoSql(env, 'DELETE FROM support_tickets WHERE id = ?', [targetId]);
      } else {
        return jsonResponse({ error: 'Unsupported moderation action' }, 400);
      }

      await runTursoSql(
        env,
        'INSERT INTO audit_logs (id, event_type, actor_id, ip_hash, details) VALUES (?, ?, ?, ?, ?)',
        [generateUuid(), `ADMIN_${action.toUpperCase()}`, authUser.id, ipHash, `Target: ${targetId}`]
      ).catch(() => {});

      return jsonResponse({ ok: true, action, targetId });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return jsonResponse({
      error: err && err.message ? err.message : 'Server error in admin endpoint'
    }, 500);
  }
}
