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

export async function onRequest(context) {
  const { request, env } = context;
  const ip = getClientIp(request);
  const ipHash = await sha256Hex(ip);
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'list';

  if (isTursoConfigured(env)) {
    await ensureTursoSchema(env);
  }

  // =========================================================================
  // GET /api/posts - Fetch community posts and their comments
  // =========================================================================
  if (request.method === 'GET') {
    const allowed = await checkRateLimit(env, `posts_get_${ipHash}`, 120, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Rate limit exceeded. Please slow down.' }, 429);
    }

    if (!isTursoConfigured(env)) {
      return jsonResponse({ posts: [], mode: 'edge_local' });
    }

    try {
      const { rows: postRows } = await runTursoSql(
        env,
        `SELECT id, category, category_label as categoryLabel, pinned, author, username,
                badge, badge_class as badgeClass, title, content as text, media_url as mediaUrl,
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
         ORDER BY created_at ASC
         LIMIT 250`
      );

      const commentsByPost = {};
      for (const c of commentRows) {
        if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
        commentsByPost[c.post_id].push({
          id: c.id,
          author: c.author,
          time: c.created_at || 'Recently',
          text: c.text
        });
      }

      const formatted = postRows.map(p => ({
        ...p,
        pinned: Number(p.pinned) === 1,
        likes: Number(p.likes) || 0,
        bookmarks: Number(p.bookmarks) || 0,
        time: p.created_at || 'Recently',
        comments: commentsByPost[p.id] || []
      }));

      return jsonResponse({ posts: formatted });
    } catch (e) {
      return jsonResponse({ posts: [], error: 'Failed to load posts' }, 500);
    }
  }

  // =========================================================================
  // POST /api/posts - Create Post, Comment, Like, or Bookmark
  // =========================================================================
  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400);
    }

    // OWASP Honeypot Anti-Bot Verification
    if (body.website_url_hp && String(body.website_url_hp).trim().length > 0) {
      return jsonResponse({ error: 'Automated bot submission rejected' }, 400);
    }

    const authUser = await getAuthenticatedUser(request, env);
    const actorFingerprint = authUser ? `user_${authUser.id}` : `ip_${ipHash}`;

    // 1. CREATE NEW POST
    if (action === 'create' || action === 'list') {
      const allowed = await checkRateLimit(env, `posts_create_${ipHash}`, 8, 60000);
      if (!allowed) {
        return jsonResponse({ error: 'Too many posts submitted. Please wait 1 minute.' }, 429);
      }

      const turnstileToken = body.cfTurnstileResponse || body['cf-turnstile-response'] || '';
      const turnstileCheck = await verifyTurnstileToken(env, turnstileToken, ip, 'create_post');
      if (!turnstileCheck.valid) {
        return jsonResponse({ error: turnstileCheck.error || 'Turnstile verification failed.' }, 403);
      }

      const title = sanitizePlainText(body.title, 120);
      const text = sanitizePlainText(body.text || body.content, 2000);
      const rawCat = (body.category || 'discussions').toLowerCase().trim();
      const category = ALLOWED_CATEGORIES.includes(rawCat) ? rawCat : 'discussions';
      const categoryLabel = CATEGORY_LABELS[category] || 'Discussions';
      const author = sanitizeAuthorName(body.author, authUser);
      const username = author.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'viceplayer';
      const mediaUrl = body.mediaUrl ? sanitizeExternalUrl(body.mediaUrl) : '';

      if (title.length < 6) {
        return jsonResponse({ error: 'Post title must be at least 6 characters long.' }, 400);
      }
      if (text.length < 12) {
        return jsonResponse({ error: 'Post content must be at least 12 characters long.' }, 400);
      }

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
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        title,
        text,
        mediaUrl,
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
            `INSERT INTO community_posts (id, user_id, category, category_label, author, username, badge, badge_class, title, content, media_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              postId,
              authUser ? authUser.id : null,
              category,
              categoryLabel,
              author,
              username,
              postObj.badge,
              postObj.badgeClass,
              title,
              text,
              mediaUrl || null
            ]
          );
        } catch (e) {}
      }

      return jsonResponse({ ok: true, post: postObj }, 201);
    }

    // 2. ADD COMMENT TO POST
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
            `INSERT INTO community_comments (id, post_id, user_id, author, username, content)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [commentId, postId, authUser ? authUser.id : null, author, username, content]
          );
          await runTursoSql(
            env,
            `UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?`,
            [postId]
          );
        } catch (e) {}
      }

      return jsonResponse({
        ok: true,
        comment: { id: commentId, postId, author, time: 'Just now', text: content }
      }, 201);
    }

    // 3. TOGGLE LIKE ON POST
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

    // 4. TOGGLE BOOKMARK ON POST
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
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
