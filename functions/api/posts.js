import { checkRateLimit, sanitizeExternalUrl } from './auth.js';

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

function sanitizePlainText(input, maxLen = 2000) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .trim()
    .slice(0, maxLen);
}

function sanitizeAuthorName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return `VicePlayer_${Math.floor(100 + Math.random() * 900)}`;
  }
  const clean = rawName.trim().replace(/[^\w\s-]/g, '').slice(0, 24);
  if (clean.length < 2 || RESERVED_NAMES.includes(clean.toLowerCase())) {
    return `VicePlayer_${Math.floor(100 + Math.random() * 900)}`;
  }
  return clean;
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

let postsSchemaInitialized = false;
async function ensurePostsTables(databaseUrl) {
  if (postsSchemaInitialized || !databaseUrl) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS community_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category VARCHAR(32) NOT NULL DEFAULT 'discussions',
      category_label VARCHAR(48) NOT NULL DEFAULT 'Discussions',
      pinned BOOLEAN DEFAULT FALSE,
      author VARCHAR(48) NOT NULL,
      username VARCHAR(48) NOT NULL,
      badge VARCHAR(32) DEFAULT 'Member',
      badge_class VARCHAR(32) DEFAULT 'verified',
      title VARCHAR(140) NOT NULL,
      content VARCHAR(2000) NOT NULL,
      media_url VARCHAR(350),
      likes INT DEFAULT 1,
      bookmarks INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS community_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      author VARCHAR(48) NOT NULL,
      content VARCHAR(500) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id, created_at ASC)`
  ];
  for (const stmt of statements) {
    try {
      await runNeonSql(databaseUrl, stmt);
    } catch (e) {}
  }
  postsSchemaInitialized = true;
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
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'list';

  if (env.DATABASE_URL) {
    await ensurePostsTables(env.DATABASE_URL);
  }

  if (request.method === 'GET') {
    const allowed = await checkRateLimit(env.DATABASE_URL, `posts_get_${ip}`, 120, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Rate limit exceeded. Please slow down.' }, 429);
    }

    if (!env.DATABASE_URL) {
      return jsonResponse({ posts: [], mode: 'edge_local' });
    }

    try {
      const rows = await runNeonSql(
        env.DATABASE_URL,
        `SELECT id, category, category_label as "categoryLabel", pinned, author, username, badge, badge_class as "badgeClass",
                title, content as text, media_url as "mediaUrl", likes, bookmarks, created_at
         FROM community_posts
         ORDER BY pinned DESC, created_at DESC
         LIMIT 50`
      );
      return jsonResponse({ posts: rows || [] });
    } catch (e) {
      return jsonResponse({ posts: [], error: 'Failed to load posts' }, 500);
    }
  }

  if (request.method === 'POST') {
    const allowed = await checkRateLimit(env.DATABASE_URL, `posts_post_${ip}`, 8, 60000);
    if (!allowed) {
      return jsonResponse({ error: 'Too many posts submitted. Please wait 1 minute.' }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400);
    }

    // OWASP Honeypot Check: reject automated bot submissions silently or with 400
    if (body.website_url_hp && String(body.website_url_hp).trim().length > 0) {
      return jsonResponse({ error: 'Automated bot submission rejected' }, 400);
    }

    if (action === 'create' || action === 'list') {
      const title = sanitizePlainText(body.title, 120);
      const text = sanitizePlainText(body.text || body.content, 2000);
      const rawCat = (body.category || 'discussions').toLowerCase().trim();
      const category = ALLOWED_CATEGORIES.includes(rawCat) ? rawCat : 'discussions';
      const categoryLabel = CATEGORY_LABELS[category] || 'Discussions';
      const author = sanitizeAuthorName(body.author);
      const username = author.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'viceplayer';
      const mediaUrl = body.mediaUrl ? sanitizeExternalUrl(body.mediaUrl) : '';

      if (title.length < 6) {
        return jsonResponse({ error: 'Post title must be at least 6 characters long.' }, 400);
      }
      if (text.length < 12) {
        return jsonResponse({ error: 'Post content must be at least 12 characters long.' }, 400);
      }

      const postObj = {
        id: `post-${Date.now()}`,
        category,
        categoryLabel,
        pinned: false,
        author,
        username,
        badge: 'Member',
        badgeClass: 'verified',
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

      if (env.DATABASE_URL) {
        try {
          const inserted = await runNeonSql(
            env.DATABASE_URL,
            `INSERT INTO community_posts (category, category_label, author, username, title, content, media_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [category, categoryLabel, author, username, title, text, mediaUrl || null]
          );
          if (inserted && inserted[0]) {
            postObj.id = inserted[0].id;
          }
        } catch (e) {}
      }

      return jsonResponse({ ok: true, post: postObj }, 201);
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
