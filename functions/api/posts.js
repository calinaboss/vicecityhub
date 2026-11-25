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
  sanitizeExternalUrl,
  verifyTurnstileToken
} from './_turso.js';

const RESERVED_NAMES = [
  'admin', 'administrator', 'system', 'vicecityhub', 'whatscr',
  'moderator', 'mod', 'root', 'support', 'official', 'rockstar'
];

const ALLOWED_CATEGORIES = ['discussions', 'leaks', 'official'];

const CATEGORY_LABELS = {
  discussions: 'Discussions',
  leaks: 'Map',
  official: 'Official News'
};

function sanitizeAuthorName(rawName, authUser) {
  if (authUser && authUser.username) {
    return authUser.username;
  }
  if (!rawName || typeof rawName !== 'string') {
    return `VicePlayer_${Math.floor(100 + Math.random() * 900)}`;
  }
  const clean = rawName.trim().replace(/[^\w\s-]/g, '').slice(0, 24);
  if (clean.length < 2 || RESERVED_NAMES.includes(clean.toLowerCase())) {
    return `VicePlayer_${Math.floor(100 + Math.random() * 900)}`;
  }
  return clean;
}

function formatIsoTime(val) {
  if (!val) return new Date().toISOString();
  let str = String(val).trim();
  if (str.includes(' ') && !str.includes('T')) str = str.replace(' ', 'T');
  if (/Z$|[+-]\d{2}:\d{2}$/.test(str)) return str;
  return str + 'Z';
}

export async function onRequest(context) {
  const { request, env } = context;
  const ip = getClientIp(request);
  const ipHash = await sha256Hex(ip);
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'list';

  if (isTursoConfigured(env)) {
    await ensureTursoSchema(env);
  }

  if (request.method === 'GET') {
    const allowed = await checkRateLimit(env, `posts_get_${ipHash}`, 120, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Rate limit exceeded. Please slow down.' }, 429);
    }

    if (!isTursoConfigured(env)) {
      return jsonResponse({ posts: [], mode: 'edge_local' });
    }

    const authUser = await getAuthenticatedUser(request, env);
    const actorFingerprint = authUser ? `user_${authUser.id}` : `ip_${ipHash}`;

    try {
      const { rows: postRows } = await runTursoSql(
        env,
        `SELECT id, user_id, category, category_label as categoryLabel, pinned, author, username,
                badge, badge_class as badgeClass, title, content as text, media_url as mediaUrl,
                media_type as mediaType, author_avatar as avatar,
                likes_count as likes, bookmarks_count as bookmarks, created_at
         FROM community_posts
         WHERE status = 'approved'
         ORDER BY pinned DESC, created_at DESC
         LIMIT 50`
      );

      const { rows: commentRows } = await runTursoSql(
        env,
        `SELECT id, post_id, author, content as text, created_at
         FROM community_comments
         WHERE status = 'approved'
         ORDER BY created_at DESC
         LIMIT 500`
      );

      const commentsByPost = {};
      for (const c of commentRows) {
        if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
        commentsByPost[c.post_id].push({
          id: c.id,
          author: c.author,
          time: formatIsoTime(c.created_at),
          text: c.text
        });
      }

      const userLikedPostIds = new Set();
      const userBookmarkedPostIds = new Set();

      try {
        const { rows: likedRows } = await runTursoSql(
          env,
          `SELECT post_id FROM post_likes WHERE actor_fingerprint = ? OR (user_id IS NOT NULL AND user_id = ?)`,
          [actorFingerprint, authUser ? authUser.id : '']
        );
        if (Array.isArray(likedRows)) {
          for (const lr of likedRows) {
            if (lr.post_id) userLikedPostIds.add(lr.post_id);
          }
        }
      } catch (e) {}

      try {
        const { rows: bookmarkedRows } = await runTursoSql(
          env,
          `SELECT post_id FROM post_bookmarks WHERE actor_fingerprint = ? OR (user_id IS NOT NULL AND user_id = ?)`,
          [actorFingerprint, authUser ? authUser.id : '']
        );
        if (Array.isArray(bookmarkedRows)) {
          for (const br of bookmarkedRows) {
            if (br.post_id) userBookmarkedPostIds.add(br.post_id);
          }
        }
      } catch (e) {}

      const formatted = postRows.map(p => ({
        ...p,
        pinned: Number(p.pinned) === 1,
        likes: Number(p.likes) || 0,
        isLiked: userLikedPostIds.has(p.id),
        bookmarks: Number(p.bookmarks) || 0,
        isBookmarked: userBookmarkedPostIds.has(p.id),
        time: formatIsoTime(p.created_at),
        comments: commentsByPost[p.id] || []
      }));

      return jsonResponse({ posts: formatted });
    } catch (e) {
      return jsonResponse({ posts: [], error: 'Failed to load posts' }, 500);
    }
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400);
    }

    if (body.website_url_hp && String(body.website_url_hp).trim().length > 0) {
      return jsonResponse({ error: 'Automated bot submission rejected' }, 400);
    }

    const authUser = await getAuthenticatedUser(request, env);
    const actorFingerprint = authUser ? `user_${authUser.id}` : `ip_${ipHash}`;

    if (action === 'create' || action === 'list') {
      if (!authUser) {
        return jsonResponse({ error: 'Authentication required. Please log in or create an account to publish a post.' }, 401);
      }

      const allowed = await checkRateLimit(env, `posts_create_${ipHash}`, 8, 60000);
      if (!allowed) {
        return jsonResponse({ error: 'Too many posts submitted. Please wait 1 minute.' }, 429);
      }

      const turnstileToken = body.cfTurnstileResponse || body['cf-turnstile-response'] || '';
      const turnstileCheck = await verifyTurnstileToken(env, turnstileToken, ip, 'create_post');
      if (!turnstileCheck.valid) {
        return jsonResponse({ error: turnstileCheck.error || 'Security verification failed.' }, 403);
      }

      const title = sanitizePlainText(body.title, 120);
      const text = sanitizePlainText(body.text || body.content, 2000);
      const rawCat = (body.category || 'discussions').toLowerCase().trim();
      const category = ALLOWED_CATEGORIES.includes(rawCat) ? rawCat : 'discussions';
      const categoryLabel = CATEGORY_LABELS[category] || 'Discussions';
      const author = authUser.username;
      const username = authUser.username.toLowerCase();

      let mediaUrl = '';
      const rawMedia = typeof body.mediaUrl === 'string' ? body.mediaUrl.trim() : '';
      if (/^\/api\/media\?id=[0-9a-fA-F-]{20,40}$/.test(rawMedia)) {
        mediaUrl = rawMedia;
      } else if (rawMedia) {
        mediaUrl = sanitizeExternalUrl(rawMedia);
      }
      const mediaType = body.mediaType === 'video' ? 'video' : 'image';
      const authorAvatar = authUser.avatar_url || 'assets/brand/favicon-192x192.png';

      if (title.length < 6) {
        return jsonResponse({ error: 'Post title must be at least 6 characters long.' }, 400);
      }
      if (text.length < 12) {
        return jsonResponse({ error: 'Post content must be at least 12 characters long.' }, 400);
      }

      const requiresModApproval = category === 'official' && authUser.role !== 'admin';
      const postStatus = requiresModApproval ? 'pending' : 'approved';

      const postId = generateUuid();
      const postObj = {
        id: postId,
        category,
        categoryLabel,
        pinned: false,
        author,
        username,
        badge: authUser?.role === 'admin' ? 'Official' : 'Member',
        badgeClass: authUser?.role === 'admin' ? 'mod' : 'verified',
        time: 'Just now',
        avatar: authorAvatar,
        title,
        text,
        mediaUrl,
        mediaType,
        status: postStatus,
        likes: 1,
        isLiked: true,
        bookmarks: 0,
        isBookmarked: false,
        comments: []
      };

      if (isTursoConfigured(env)) {
        try {
          await runTursoSql(
            env,
            `INSERT INTO community_posts (id, user_id, category, category_label, author, username, badge, badge_class, title, content, media_url, media_type, author_avatar, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              postId,
              authUser.id,
              category,
              categoryLabel,
              author,
              username,
              postObj.badge,
              postObj.badgeClass,
              title,
              text,
              mediaUrl || null,
              mediaType,
              authorAvatar,
              postStatus
            ]
          );
        } catch (e) {}
      }

      return jsonResponse({
        ok: true,
        pending: requiresModApproval,
        message: requiresModApproval ? 'Waiting for the moderators approval' : 'Post published to Feed',
        post: postObj
      }, 201);
    }

    if (action === 'comment') {
      const allowed = await checkRateLimit(env, `posts_comment_${ipHash}`, 20, 60000);
      if (!allowed) {
        return jsonResponse({ error: 'Too many comments. Please slow down.' }, 429);
      }

      const postId = sanitizePlainText(body.postId, 64);
      const content = sanitizePlainText(body.text || body.content, 500);
      const author = sanitizeAuthorName(body.author, authUser);
      const username = author.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'viceplayer';

      if (!postId || content.length < 2) {
        return jsonResponse({ error: 'Comment is too short.' }, 400);
      }

      const commentId = generateUuid();
      if (isTursoConfigured(env)) {
        try {
          await runTursoSql(
            env,
            `INSERT INTO community_comments (id, post_id, user_id, author, username, content, status)
             VALUES (?, ?, ?, ?, ?, ?, 'approved')`,
            [commentId, postId, authUser ? authUser.id : null, author, username, content]
          );
          await runTursoSql(
            env,
            `UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?`,
            [postId]
          );
        } catch (e) {
          console.error('Comment insertion error:', e);
          return jsonResponse({ error: 'Failed to save comment to database: ' + (e.message || 'database error') }, 500);
        }
      }

      return jsonResponse({
        ok: true,
        comment: { id: commentId, postId, author, time: 'Just now', text: content }
      }, 201);
    }

    if (action === 'like') {
      const allowed = await checkRateLimit(env, `posts_like_${ipHash}`, 40, 60000);
      if (!allowed) {
        return jsonResponse({ error: 'Rate limit exceeded' }, 429);
      }

      const postId = sanitizePlainText(body.postId, 64);
      if (!postId) return jsonResponse({ error: 'postId required' }, 400);

      if (isTursoConfigured(env)) {
        try {
          const { rows: existing } = await runTursoSql(
            env,
            'SELECT id FROM post_likes WHERE post_id = ? AND actor_fingerprint = ? LIMIT 1',
            [postId, actorFingerprint]
          );

          if (existing.length > 0) {
            await runTursoSql(env, 'DELETE FROM post_likes WHERE id = ?', [existing[0].id]);
            await runTursoSql(
              env,
              'UPDATE community_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?',
              [postId]
            );
            return jsonResponse({ ok: true, liked: false });
          } else {
            await runTursoSql(
              env,
              'INSERT INTO post_likes (id, post_id, user_id, actor_fingerprint) VALUES (?, ?, ?, ?)',
              [generateUuid(), postId, authUser ? authUser.id : null, actorFingerprint]
            );
            await runTursoSql(
              env,
              'UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?',
              [postId]
            );
            return jsonResponse({ ok: true, liked: true });
          }
        } catch (e) {}
      }

      return jsonResponse({ ok: true });
    }

    if (action === 'bookmark') {
      const postId = sanitizePlainText(body.postId, 64);
      if (!postId) return jsonResponse({ error: 'postId required' }, 400);

      if (isTursoConfigured(env)) {
        try {
          const { rows: existing } = await runTursoSql(
            env,
            'SELECT id FROM post_bookmarks WHERE post_id = ? AND actor_fingerprint = ? LIMIT 1',
            [postId, actorFingerprint]
          );
          if (existing.length > 0) {
            await runTursoSql(env, 'DELETE FROM post_bookmarks WHERE id = ?', [existing[0].id]);
            await runTursoSql(
              env,
              'UPDATE community_posts SET bookmarks_count = MAX(0, bookmarks_count - 1) WHERE id = ?',
              [postId]
            );
            return jsonResponse({ ok: true, bookmarked: false });
          } else {
            await runTursoSql(
              env,
              'INSERT INTO post_bookmarks (id, post_id, user_id, actor_fingerprint) VALUES (?, ?, ?, ?)',
              [generateUuid(), postId, authUser ? authUser.id : null, actorFingerprint]
            );
            await runTursoSql(
              env,
              'UPDATE community_posts SET bookmarks_count = bookmarks_count + 1 WHERE id = ?',
              [postId]
            );
            return jsonResponse({ ok: true, bookmarked: true });
          }
        } catch (e) {}
      }

      return jsonResponse({ ok: true });
    }

    if (action === 'report') {
      const allowed = await checkRateLimit(env, `posts_report_${ipHash}`, 10, 60000);
      if (!allowed) {
        return jsonResponse({ error: 'Too many reports submitted. Please wait 1 minute.' }, 429);
      }

      const postId = sanitizePlainText(body.postId, 64);
      const reason = sanitizePlainText(body.reason || 'Reported by community member', 300);
      if (!postId || reason.length < 3) {
        return jsonResponse({ error: 'Post ID and report reason are required.' }, 400);
      }

      if (isTursoConfigured(env)) {
        try {
          const { rows: targetPostRows } = await runTursoSql(
            env,
            `SELECT id, user_id, author, username FROM community_posts WHERE id = ? LIMIT 1`,
            [postId]
          );
          if (targetPostRows && targetPostRows.length > 0) {
            const p = targetPostRows[0];
            if (authUser && (
              authUser.id === p.user_id ||
              (authUser.username && (
                authUser.username.toLowerCase() === (p.username || '').toLowerCase() ||
                authUser.username.toLowerCase() === (p.author || '').toLowerCase()
              ))
            )) {
              return jsonResponse({ error: 'You cannot report your own post.' }, 400);
            }
          }
        } catch (e) {}
      }

      const reportId = generateUuid();
      if (isTursoConfigured(env)) {
        try {
          await runTursoSql(
            env,
            `INSERT INTO security_reports (id, target_type, target_id, reason, reporter_ip_hash, status)
             VALUES (?, 'post', ?, ?, ?, 'pending')`,
            [reportId, postId, reason, ipHash]
          );
        } catch (e) {}
      }

      return jsonResponse({ ok: true, report_id: reportId }, 201);
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
