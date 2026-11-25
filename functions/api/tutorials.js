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

const CATEGORY_MAP = {
  free_cars: 'Free Cars',
  easter_eggs: 'Easter Eggs',
  robberies: 'Robberies & Heists',
  weapons: 'Weapons & Gear',
  money: 'Money & Tips',
  map_secrets: 'Map Secrets'
};

const ALLOWED_CATEGORIES = Object.keys(CATEGORY_MAP);

const ALLOWED_VIDEO_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'tiktok.com',
  'www.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  'm.tiktok.com',
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com'
]);

function parseVideoInfo(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let str = rawUrl.trim();
  if (str.includes('<iframe')) {
    const srcMatch = str.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      str = srcMatch[1];
    }
  }

  let parsed;
  try {
    parsed = new URL(str);
  } catch (e) {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_VIDEO_HOSTS.has(host)) return null;

  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\/+/, '').split('/')[0].split('?')[0];
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return {
        platform: 'youtube',
        videoId: id,
        cleanUrl: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`
      };
    }
  }

  if (host.includes('youtube.com')) {
    let id = parsed.searchParams.get('v');
    if (!id && (parsed.pathname.startsWith('/shorts/') || parsed.pathname.startsWith('/embed/'))) {
      const parts = parsed.pathname.split('/');
      id = parts[2];
    }
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return {
        platform: 'youtube',
        videoId: id,
        cleanUrl: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`
      };
    }
  }

  if (host.includes('tiktok.com')) {
    const idMatch = str.match(/\/video\/(\d+)/i) || str.match(/\/v1\/(\d+)/i) || str.match(/[?&]item_id=(\d+)/i);
    const videoId = idMatch ? idMatch[1] : '';
    const embedUrl = videoId
      ? `https://www.tiktok.com/player/v1/${videoId}?embed_from=webapp_share&music_info=1&description=1&autoplay=0&muted=0`
      : str;
    return {
      platform: 'tiktok',
      videoId,
      cleanUrl: videoId ? `https://www.tiktok.com/@community/video/${videoId}` : str,
      embedUrl,
      thumbnailUrl: ''
    };
  }

  if (host.includes('instagram.com')) {
    let code = '';
    const match = parsed.pathname.match(/\/(reel|p)\/([a-zA-Z0-9_-]+)/i);
    if (match) {
      code = match[2];
    }
    return {
      platform: 'instagram',
      videoId: code,
      cleanUrl: code ? `https://www.instagram.com/reel/${code}/` : str,
      embedUrl: code ? `https://www.instagram.com/p/${code}/embed/captioned/` : str,
      thumbnailUrl: ''
    };
  }

  return null;
}

async function fetchOEmbedThumbnail(platform, videoUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    if (platform === 'tiktok') {
      try {
        const pageRes = await fetch(videoUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
          },
          signal: controller.signal
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
                          html.match(/name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
          if (ogMatch && ogMatch[1]) {
            clearTimeout(timeoutId);
            return ogMatch[1].replace(/&amp;/g, '&');
          }
        }
      } catch (tiktokErr) {}
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
      const res = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.thumbnail_url === 'string' && data.thumbnail_url.startsWith('https://')) {
          return data.thumbnail_url;
        }
      }
    } else if (platform === 'instagram') {
      try {
        const pageRes = await fetch(videoUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
          },
          signal: controller.signal
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
                          html.match(/name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
          if (ogMatch && ogMatch[1]) {
            clearTimeout(timeoutId);
            return ogMatch[1].replace(/&amp;/g, '&');
          }
        }
      } catch (instaErr) {}
      const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(videoUrl)}`;
      const res = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.thumbnail_url === 'string' && data.thumbnail_url.startsWith('https://')) {
          return data.thumbnail_url;
        }
      }
    }
  } catch (e) {
  } finally {
    clearTimeout(timeoutId);
  }
  return '/assets/brand/vicecityhub-og.jpg';
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

    if (request.method === 'GET') {
      const allowed = await checkRateLimit(env, `tutorials_get_${ipHash}`, 60, 60000);
      if (!allowed) {
        return jsonResponse({ error: 'Too many requests' }, 429);
      }

      const url = new URL(request.url);
      const category = (url.searchParams.get('category') || 'all').trim().toLowerCase();
      const search = (url.searchParams.get('q') || '').trim();
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10), 1), 60);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

      const conditions = ["status = 'approved'"];
      const params = [];

      if (category && category !== 'all' && ALLOWED_CATEGORIES.includes(category)) {
        conditions.push('category = ?');
        params.push(category);
      }

      if (search) {
        const sanitizedSearch = sanitizePlainText(search, 80);
        if (sanitizedSearch) {
          conditions.push('(title LIKE ? OR description LIKE ?)');
          params.push(`%${sanitizedSearch}%`, `%${sanitizedSearch}%`);
        }
      }

      const whereClause = conditions.join(' AND ');
      const sql = `SELECT id, title, description, category, category_label, video_url, platform, thumbnail_url, embed_url, views_count, status, created_at
                   FROM tutorials
                   WHERE ${whereClause}
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const { rows } = await runTursoSql(env, sql, params);

      return jsonResponse({
        ok: true,
        tutorials: rows || [],
        category,
        total: (rows || []).length
      });
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return jsonResponse({ error: 'Invalid JSON request body' }, 400);
      }

      const action = sanitizePlainText(body.action || 'create', 32);

      if (action === 'track_view') {
        const tutorialId = sanitizePlainText(body.id, 64);
        if (!tutorialId) {
          return jsonResponse({ error: 'Missing tutorial id' }, 400);
        }
        const allowed = await checkRateLimit(env, `tut_view_${ipHash}_${tutorialId}`, 6, 60000);
        if (allowed) {
          await runTursoSql(env, 'UPDATE tutorials SET views_count = views_count + 1 WHERE id = ?', [tutorialId]).catch(() => {});
        }
        return jsonResponse({ ok: true });
      }

      const authUser = await getAuthenticatedUser(request, env);
      if (!authUser || authUser.role !== 'admin') {
        return jsonResponse({ error: 'Forbidden: Administrator privileges required' }, 403);
      }

      if (action === 'create' || action === 'add') {
        const title = sanitizePlainText(body.title, 140);
        const description = sanitizePlainText(body.description, 1000);
        const category = sanitizePlainText(body.category, 40).toLowerCase();
        const rawVideoUrl = typeof body.video_url === 'string' ? body.video_url.trim() : '';
        const customThumbnail = typeof body.thumbnail_url === 'string' ? body.thumbnail_url.trim() : '';

        if (!title || title.length < 3) {
          return jsonResponse({ error: 'Title must be at least 3 characters long' }, 400);
        }

        if (!description || description.length < 5) {
          return jsonResponse({ error: 'Description must be at least 5 characters long' }, 400);
        }

        if (!ALLOWED_CATEGORIES.includes(category)) {
          return jsonResponse({ error: 'Invalid category selected' }, 400);
        }

        const videoInfo = parseVideoInfo(rawVideoUrl);
        if (!videoInfo) {
          return jsonResponse({ error: 'Please enter a valid YouTube, TikTok, or Instagram video URL (HTTPS only)' }, 400);
        }

        let resolvedThumbnail = videoInfo.thumbnailUrl;
        if (customThumbnail && (customThumbnail.startsWith('https://') || customThumbnail.startsWith('/assets/'))) {
          resolvedThumbnail = customThumbnail;
        } else if (!resolvedThumbnail) {
          resolvedThumbnail = await fetchOEmbedThumbnail(videoInfo.platform, videoInfo.cleanUrl);
        }

        const tutorialId = generateUuid();
        const categoryLabel = CATEGORY_MAP[category] || 'Easter Eggs';
        const embedUrl = videoInfo.embedUrl || '';

        await runTursoSql(
          env,
          `INSERT INTO tutorials (id, title, description, category, category_label, video_url, platform, thumbnail_url, embed_url, views_count, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'approved')`,
          [
            tutorialId,
            title,
            description,
            category,
            categoryLabel,
            videoInfo.cleanUrl,
            videoInfo.platform,
            resolvedThumbnail,
            embedUrl
          ]
        );

        return jsonResponse({
          ok: true,
          tutorial: {
            id: tutorialId,
            title,
            description,
            category,
            category_label: categoryLabel,
            video_url: videoInfo.cleanUrl,
            platform: videoInfo.platform,
            thumbnail_url: resolvedThumbnail,
            embed_url: embedUrl
          }
        }, 201);
      }

      if (action === 'delete') {
        const tutorialId = sanitizePlainText(body.targetId || body.id, 64);
        if (!tutorialId) {
          return jsonResponse({ error: 'Missing targetId' }, 400);
        }
        await runTursoSql(env, 'DELETE FROM tutorials WHERE id = ?', [tutorialId]);
        return jsonResponse({ ok: true, deleted: tutorialId });
      }

      return jsonResponse({ error: 'Unsupported action' }, 400);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return jsonResponse({
      error: err && err.message ? err.message : 'Server error in tutorials endpoint'
    }, 500);
  }
}
