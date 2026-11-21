import {
  getClientIp,
  sha256Hex,
  isTursoConfigured,
  runTursoSql,
  ensureTursoSchema,
  getAuthenticatedUser
} from '../api/_turso.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripTags(str) {
  if (!str) return '';
  return String(str).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function formatIsoTime(val) {
  if (!val) return new Date().toISOString();
  let str = String(val).trim();
  if (str.includes(' ') && !str.includes('T')) str = str.replace(' ', 'T');
  if (/Z$|[+-]\d{2}:\d{2}$/.test(str)) return str;
  return str + 'Z';
}

function formatDisplayDate(val) {
  if (!val) return 'Recent';
  const iso = formatIsoTime(val);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Recent';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function safeJsonLd(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const rawId = (params && params.id) ? String(params.id).trim() : '';

  let postId = rawId;
  const uuidMatch = rawId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (uuidMatch) {
    postId = uuidMatch[1];
  }

  if (!postId) {
    return new Response('Discussion Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  if (!isTursoConfigured(env)) {
    return new Response('Database Unavailable', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }

  await ensureTursoSchema(env);

  const ip = getClientIp(request);
  const ipHash = await sha256Hex(ip);
  const authUser = await getAuthenticatedUser(request, env);
  const actorFingerprint = authUser ? `user_${authUser.id}` : `ip_${ipHash}`;

  const { rows: postRows } = await runTursoSql(
    env,
    `SELECT id, user_id, category, category_label as categoryLabel, pinned, author, username,
            badge, badge_class as badgeClass, title, content as text, media_url as mediaUrl,
            media_type as mediaType, author_avatar as avatar,
            likes_count as likes, bookmarks_count as bookmarks, created_at
     FROM community_posts
     WHERE id = ? AND status = 'approved'
     LIMIT 1`,
    [postId]
  );

  if (!postRows || postRows.length === 0) {
    const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discussion Not Found &bull; ViceCityHub</title>
  <link rel="stylesheet" href="/assets/css/style.css?v=4.3">
</head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;background:#0d1117;color:#c9d1d9;">
  <div style="max-width:480px;padding:24px;">
    <h1 style="font-size:1.8rem;color:#fca5a5;margin-bottom:12px;">Discussion Not Found</h1>
    <p style="font-size:0.92rem;color:#8b949e;margin-bottom:20px;">The GTA VI discussion thread you are looking for has been removed, renamed or does not exist.</p>
    <a href="/index.html" class="btn-post-submit" style="text-decoration:none;display:inline-flex;">Return to Community Feed</a>
  </div>
</body>
</html>`;
    return new Response(notFoundHtml, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  const post = postRows[0];

  const { rows: commentRows } = await runTursoSql(
    env,
    `SELECT id, post_id, author, username, content as text, created_at
     FROM community_comments
     WHERE post_id = ? AND (status = 'approved' OR status IS NULL OR status = '')
     ORDER BY created_at ASC
     LIMIT 200`,
    [postId]
  );

  const comments = commentRows || [];

  const { rows: relatedRows } = await runTursoSql(
    env,
    `SELECT id, title, category_label as categoryLabel, comments_count as comments, likes_count as likes, created_at
     FROM community_posts
     WHERE id != ? AND status = 'approved'
     ORDER BY created_at DESC
     LIMIT 4`,
    [postId]
  );

  let isLiked = false;
  let isBookmarked = false;

  try {
    const { rows: liked } = await runTursoSql(
      env,
      'SELECT id FROM post_likes WHERE post_id = ? AND (actor_fingerprint = ? OR user_id = ?) LIMIT 1',
      [postId, actorFingerprint, authUser ? authUser.id : '']
    );
    if (liked && liked.length > 0) isLiked = true;
  } catch (e) {}

  try {
    const { rows: bookmarked } = await runTursoSql(
      env,
      'SELECT id FROM post_bookmarks WHERE post_id = ? AND (actor_fingerprint = ? OR user_id = ?) LIMIT 1',
      [postId, actorFingerprint, authUser ? authUser.id : '']
    );
    if (bookmarked && bookmarked.length > 0) isBookmarked = true;
  } catch (e) {}

  const postTitle = post.title || 'GTA VI Discussion';
  const rawBodyText = stripTags(post.text);
  const categoryName = post.categoryLabel || 'GTA 6 Discussions';
  const authorHandle = post.username || post.author || 'VicePlayer';
  const tagsSuffix = ' #GTA6 #GTAVI #ViceCity #ViceCityHub';
  const cleanExcerpt = `[${categoryName}] @${authorHandle}: ${rawBodyText.slice(0, 140)}${rawBodyText.length > 140 ? '...' : ''}${tagsSuffix}`;
  const postUrl = `https://vicecityhub.eu/d/${encodeURIComponent(post.id)}`;
  const authorProfileUrl = `https://vicecityhub.eu/profile.html?u=${encodeURIComponent(post.username || post.author)}`;
  const postIsoDate = formatIsoTime(post.created_at);
  const displayDate = formatDisplayDate(post.created_at);

  let fullMediaUrl = '';
  if (post.mediaUrl) {
    if (/^https?:\/\//i.test(post.mediaUrl)) {
      fullMediaUrl = post.mediaUrl;
    } else if (post.mediaUrl.startsWith('/')) {
      fullMediaUrl = `https://vicecityhub.eu${post.mediaUrl}`;
    } else {
      fullMediaUrl = `https://vicecityhub.eu/${post.mediaUrl}`;
    }
  }
  const isVideoMedia = Boolean(fullMediaUrl && (post.mediaType === 'video' || /\.(mp4|webm|mov)(\?.*)?$/i.test(fullMediaUrl)));
  const ogImage = (!isVideoMedia && fullMediaUrl) ? fullMediaUrl : 'https://vicecityhub.eu/assets/brand/og-banner.png';
  const likesCount = Number(post.likes) || 0;

  const discussionSchema = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': `${postUrl}#discussion`,
    url: postUrl,
    headline: postTitle,
    articleBody: stripTags(post.text),
    articleSection: post.categoryLabel || 'GTA 6 Discussions',
    datePublished: postIsoDate,
    dateModified: postIsoDate,
    author: {
      '@type': 'Person',
      name: post.author,
      url: authorProfileUrl
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: likesCount
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: comments.length
      }
    ],
    commentCount: comments.length,
    comment: comments.map(c => ({
      '@type': 'Comment',
      text: stripTags(c.text),
      dateCreated: formatIsoTime(c.created_at),
      author: {
        '@type': 'Person',
        name: c.author
      }
    }))
  };

  if (fullMediaUrl) {
    discussionSchema.image = fullMediaUrl;
  }

  const videoOgMeta = isVideoMedia ? `
  <meta property="og:video" content="${escapeHtml(fullMediaUrl)}">
  <meta property="og:video:secure_url" content="${escapeHtml(fullMediaUrl)}">
  <meta property="og:video:type" content="video/mp4">` : '';

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://vicecityhub.eu/'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Discussions',
        item: 'https://vicecityhub.eu/index.html'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: postTitle,
        item: postUrl
      }
    ]
  };

  let mediaHtml = '';
  if (post.mediaUrl && (/^https?:\/\//i.test(post.mediaUrl) || /^\/api\/media\?id=[0-9a-fA-F-]{20,40}$/.test(post.mediaUrl))) {
    if (post.mediaType === 'video' || /\.(mp4|webm|mov)(\?.*)?$/i.test(post.mediaUrl)) {
      mediaHtml = `<div class="post-media-container" style="margin-top:14px;border-radius:8px;overflow:hidden;background:#000;">
        <video controls playsinline preload="metadata" style="max-height:500px;width:100%;display:block;">
          <source src="${escapeHtml(post.mediaUrl)}">
        </video>
      </div>`;
    } else {
      mediaHtml = `<div class="post-media-container" style="margin-top:14px;border-radius:8px;overflow:hidden;background:#05070a;display:flex;justify-content:center;align-items:center;max-height:500px;">
        <img src="${escapeHtml(post.mediaUrl)}" alt="${escapeHtml(postTitle)}" style="max-height:500px;max-width:100%;width:auto;object-fit:contain;display:block;margin:0 auto;" loading="lazy">
      </div>`;
    }
  }

  const commentsListHtml = comments.map(c => {
    return `<article class="discussion-comment-item" style="padding:12px 14px;background:#161b22;border:1px solid #30363d;border-radius:8px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-weight:700;color:#f0f6fc;font-size:0.86rem;">${escapeHtml(c.author)}</span>
        <span style="font-size:0.74rem;color:#8b949e;">${escapeHtml(formatDisplayDate(c.created_at))}</span>
      </div>
      <p style="font-size:0.88rem;color:#c9d1d9;line-height:1.45;margin:0;word-break:break-word;">${escapeHtml(c.text)}</p>
    </article>`;
  }).join('');

  const relatedHtml = (relatedRows || []).map(r => {
    return `<a href="/d/${encodeURIComponent(r.id)}" style="display:block;padding:10px 12px;background:#161b22;border:1px solid #30363d;border-radius:6px;text-decoration:none;margin-bottom:8px;transition:border-color 0.2s ease;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span class="post-category-tag" style="font-size:0.68rem;padding:2px 6px;">${escapeHtml(r.categoryLabel || 'Discussion')}</span>
        <span style="font-size:0.72rem;color:#8b949e;">${escapeHtml(formatDisplayDate(r.created_at))}</span>
      </div>
      <div style="font-size:0.84rem;font-weight:700;color:#f0f6fc;line-height:1.3;">${escapeHtml(r.title)}</div>
    </a>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(postTitle)} &bull; GTA 6 Discussion &bull; ViceCityHub</title>
  <meta name="description" content="${escapeHtml(cleanExcerpt)}">
  <meta name="keywords" content="GTA Vice City, Rockstar Games, GTA VI, Grand Theft Auto VI, GTA Vice Online, GTA VI release date, GTAVI, new Grand Theft Auto, GTA 6, Vice City, Leonida, ${escapeHtml(postTitle)}, Grand Theft Auto, GTA 6 leaks, GTA 6 forum">
  <link rel="canonical" href="${postUrl}">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(postTitle)} &bull; ViceCityHub">
  <meta property="og:description" content="${escapeHtml(cleanExcerpt)}">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:site_name" content="ViceCityHub">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(postTitle)}">${videoOgMeta}
  <meta property="article:published_time" content="${postIsoDate}">
  <meta property="article:section" content="${escapeHtml(post.categoryLabel || 'GTA 6 Discussions')}">
  <meta property="article:tag" content="GTA 6">
  <meta property="article:tag" content="GTA VI">
  <meta property="article:tag" content="Vice City">
  <meta property="article:tag" content="${escapeHtml(post.categoryLabel || 'Discussions')}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ViceCityHub">
  <meta name="twitter:title" content="${escapeHtml(postTitle)} &bull; ViceCityHub">
  <meta name="twitter:description" content="${escapeHtml(cleanExcerpt)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <meta name="twitter:image:alt" content="${escapeHtml(postTitle)}">
  <meta name="twitter:label1" content="Category">
  <meta name="twitter:data1" content="${escapeHtml(post.categoryLabel || 'GTA VI Discussion')}">
  <meta name="twitter:label2" content="Posted by">
  <meta name="twitter:data2" content="@${escapeHtml(authorHandle)}">

  <link rel="icon" type="image/png" sizes="16x16" href="/assets/brand/favicon-16x16.png?v=2">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32x32.png?v=2">
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/brand/favicon-48x48.png?v=2">
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/brand/favicon-192x192.png?v=2">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png?v=2">
  <link rel="shortcut icon" href="/favicon.ico?v=2">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Teko:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="/assets/css/style.css?v=4.3">

  <script type="application/ld+json">${safeJsonLd(discussionSchema)}</script>
  <script type="application/ld+json">${safeJsonLd(breadcrumbsSchema)}</script>

  <script src="/assets/js/analytics.js?v=4.3"></script>
  <script async src="https://www.googletagmanager.com/gtm.js?id=GTM-576B86L9"></script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3729233023466811" crossorigin="anonymous"></script>
</head>
<body>

  <header class="site-header">
    <div class="header-container">
      <span class="mobile-brand-title">VICECITYHUB</span>
      <nav class="header-nav-left" aria-label="Main Navigation">
        <a href="/index.html" class="nav-link">Feed</a>
        <a href="/discords.html" class="nav-link">GTA VI Discords</a>
        <a href="https://map.vicecityhub.eu" class="nav-link">Map</a>
        <a href="/cheats.html" class="nav-link">Cheats</a>
      </nav>
      <div class="header-nav-right">
        <a href="/post.html" class="btn-post" aria-label="New Post">
          <i class="fa-solid fa-plus"></i> New Post
        </a>
        <a href="/profile.html" class="btn-secondary" style="height:34px;padding:0 12px;font-size:0.82rem;">
          <i class="fa-solid fa-user"></i> Profile
        </a>
      </div>
    </div>
  </header>

  <main class="site-main" style="max-width:980px;margin:24px auto;padding:0 16px;display:flex;gap:24px;flex-wrap:wrap;">

    <div style="flex:1;min-width:300px;">
      <nav aria-label="Breadcrumb" style="margin-bottom:14px;font-size:0.8rem;color:var(--text-dim);">
        <a href="/index.html" style="color:var(--text-muted);text-decoration:none;"><i class="fa-solid fa-arrow-left"></i> Feed</a>
        <span style="margin:0 6px;">/</span>
        <span style="color:var(--accent-pink);">${escapeHtml(post.categoryLabel || 'Discussion')}</span>
      </nav>

      <article class="post-card" style="margin-bottom:20px;">
        <div class="post-header">
          <a href="${authorProfileUrl}" class="post-author-box" style="text-decoration:none;">
            <img class="post-avatar" src="${escapeHtml(post.avatar || '/assets/brand/favicon-192x192.png')}" alt="${escapeHtml(post.author)}">
            <div class="post-author-info">
              <div class="author-name-row">
                <span class="author-username">${escapeHtml(post.author)}</span>
                <span class="badge-pill ${escapeHtml(post.badgeClass || 'verified')}">${escapeHtml(post.badge || 'Member')}</span>
              </div>
              <span class="post-timestamp">${displayDate} &bull; @${escapeHtml(post.username)}</span>
            </div>
          </a>
          <span class="post-category-tag">${escapeHtml(post.categoryLabel || 'Discussions')}</span>
        </div>

        <h1 style="font-size:1.45rem;font-weight:800;color:var(--text-main);margin:12px 0;line-height:1.35;">${escapeHtml(postTitle)}</h1>
        <div style="font-size:0.96rem;color:#c9d1d9;line-height:1.6;white-space:pre-wrap;word-break:break-word;">${escapeHtml(post.text)}</div>
        ${mediaHtml}

        <div class="post-footer" style="margin-top:16px;">
          <div class="post-actions-group">
            <button class="action-btn btn-like ${isLiked ? 'active-like' : ''}" id="btn-discussion-like" data-id="${escapeHtml(post.id)}">
              <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i>
              <span id="d-like-count">${likesCount}</span>
            </button>
            <button class="action-btn" id="btn-discussion-share" data-id="${escapeHtml(post.id)}" data-title="${escapeHtml(postTitle)}">
              <i class="fa-solid fa-share-nodes"></i> Share
            </button>
          </div>
          <button class="action-btn btn-bookmark ${isBookmarked ? 'active-bookmark' : ''}" id="btn-discussion-bookmark" data-id="${escapeHtml(post.id)}">
            <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
          </button>
        </div>
      </article>

      <div style="margin:20px 0;">
        <ins class="adsbygoogle"
             style="display:block; text-align:center;"
             data-ad-layout="in-article"
             data-ad-format="fluid"
             data-ad-client="ca-pub-3729233023466811"
             data-ad-slot="5633279556"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      </div>

      <section class="post-card" style="padding:18px 20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <h2 style="font-size:1.15rem;font-weight:800;color:var(--text-main);margin:0;display:flex;align-items:center;gap:8px;">
            <i class="fa-regular fa-comments" style="color:var(--accent-pink);"></i>
            <span>Replies (<span id="d-comment-count">${comments.length}</span>)</span>
          </h2>
          <a href="/index.html#post-${escapeHtml(post.id)}" class="btn-post-submit" style="text-decoration:none;padding:6px 14px;font-size:0.82rem;display:inline-flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-reply"></i> Reply in Feed
          </a>
        </div>

        <div style="background:#11161d;border:1px dashed #30363d;border-radius:8px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span style="font-size:0.84rem;color:var(--text-muted);">Want to join this discussion or share your thoughts?</span>
          <a href="/index.html#post-${escapeHtml(post.id)}" style="color:var(--accent-pink);font-size:0.84rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
            Open in Community Feed &rarr;
          </a>
        </div>

        <div id="discussion-comments-list">
          ${commentsListHtml || '<p id="no-comments-msg" style="font-size:0.86rem;color:var(--text-dim);font-style:italic;">No replies yet. Be the first to share your thoughts in the community feed!</p>'}
        </div>
      </section>
    </div>

    <aside style="width:300px;flex-shrink:0;">
      <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:20px;">
        <h3 style="font-size:0.95rem;font-weight:800;color:var(--text-main);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
          <i class="fa-solid fa-fire" style="color:#ff2a85;"></i> Latest Discussions
        </h3>
        <div>
          ${relatedHtml}
        </div>
        <a href="/index.html" style="display:block;text-align:center;margin-top:10px;font-size:0.78rem;color:var(--accent-pink);text-decoration:none;">Explore all feed posts &rarr;</a>
      </div>

      <div>
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-format="autorelaxed"
             data-ad-client="ca-pub-3729233023466811"
             data-ad-slot="2205170432"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      </div>
    </aside>

  </main>

  <footer class="footer">
    <div class="footer-bottom-bar" style="margin-top:0;border-top:none;flex-wrap:wrap;gap:12px;">
      <p class="footer-disclaimer-text">&copy; 2026 ViceCityHub.eu &bull; Unofficial GTA VI Community Portal.</p>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
        <a href="/about.html" style="color:var(--text-muted);font-size:0.8rem;">About &amp; Contact</a>
        <a href="/privacy.html" style="color:var(--text-muted);font-size:0.8rem;">Privacy (GDPR/CCPA)</a>
        <a href="/cookies.html" style="color:var(--text-muted);font-size:0.8rem;">Cookie Policy</a>
        <a href="/terms.html" style="color:var(--text-muted);font-size:0.8rem;">Terms</a>
        <a href="/dsa.html" style="color:var(--text-muted);font-size:0.8rem;">DSA</a>
        <a href="/index.html" style="color:var(--accent-pink);font-size:0.82rem;font-weight:700;">Return to Homepage</a>
      </div>
    </div>
  </footer>

  <script>
  (function() {
    const postId = ${safeJsonLd(post.id)};
    const likeBtn = document.getElementById('btn-discussion-like');
    const bookmarkBtn = document.getElementById('btn-discussion-bookmark');
    const shareBtn = document.getElementById('btn-discussion-share');
    const likeCountEl = document.getElementById('d-like-count');

    if (likeBtn) {
      likeBtn.addEventListener('click', async function() {
        try {
          const res = await fetch('/api/posts?action=like', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: postId })
          });
          const data = await res.json();
          if (data && data.ok) {
            const current = parseInt(likeCountEl.textContent, 10) || 0;
            if (data.liked) {
              likeBtn.classList.add('active-like');
              likeCountEl.textContent = String(current + 1);
              likeBtn.querySelector('i').className = 'fa-solid fa-thumbs-up';
            } else {
              likeBtn.classList.remove('active-like');
              likeCountEl.textContent = String(Math.max(0, current - 1));
              likeBtn.querySelector('i').className = 'fa-regular fa-thumbs-up';
            }
          }
        } catch (e) {}
      });
    }

    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', async function() {
        try {
          const res = await fetch('/api/posts?action=bookmark', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: postId })
          });
          const data = await res.json();
          if (data && data.ok) {
            if (data.bookmarked) {
              bookmarkBtn.classList.add('active-bookmark');
              bookmarkBtn.querySelector('i').className = 'fa-solid fa-bookmark';
            } else {
              bookmarkBtn.classList.remove('active-bookmark');
              bookmarkBtn.querySelector('i').className = 'fa-regular fa-bookmark';
            }
          }
        } catch (e) {}
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', async function() {
        const shareUrl = window.location.href;
        const shareTitle = document.title;
        if (navigator.share) {
          try {
            await navigator.share({ title: shareTitle, url: shareUrl });
            return;
          } catch (e) {}
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Discussion link copied to clipboard!');
          }).catch(() => {
            prompt('Copy discussion link:', shareUrl);
          });
        } else {
          prompt('Copy discussion link:', shareUrl);
        }
      });
    }
  })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
