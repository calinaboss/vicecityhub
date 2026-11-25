import { isTursoConfigured, runTursoSql } from './_turso.js';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function onRequest(context) {
  const { env } = context;
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    { loc: 'https://vicecityhub.eu/', lastmod: today, changefreq: 'hourly', priority: '1.0' },
    { loc: 'https://vicecityhub.eu/discords.html', lastmod: today, changefreq: 'hourly', priority: '0.95' },
    { loc: 'https://vicecityhub.eu/submit-discord.html', lastmod: today, changefreq: 'daily', priority: '0.90' },
    { loc: 'https://vicecityhub.eu/cheats.html', lastmod: today, changefreq: 'daily', priority: '0.95' },
    { loc: 'https://vicecityhub.eu/tutorials.html', lastmod: today, changefreq: 'daily', priority: '0.95' },
    { loc: 'https://vicecityhub.eu/faq.html', lastmod: today, changefreq: 'weekly', priority: '0.85' },
    { loc: 'https://vicecityhub.eu/post.html', lastmod: today, changefreq: 'weekly', priority: '0.80' },
    { loc: 'https://vicecityhub.eu/about.html', lastmod: today, changefreq: 'monthly', priority: '0.70' },
    { loc: 'https://vicecityhub.eu/privacy.html', lastmod: today, changefreq: 'monthly', priority: '0.50' },
    { loc: 'https://vicecityhub.eu/terms.html', lastmod: today, changefreq: 'monthly', priority: '0.50' },
    { loc: 'https://vicecityhub.eu/cookies.html', lastmod: today, changefreq: 'monthly', priority: '0.45' },
    { loc: 'https://vicecityhub.eu/dsa.html', lastmod: today, changefreq: 'monthly', priority: '0.45' },
    { loc: 'https://vicecityhub.eu/llms.txt', lastmod: today, changefreq: 'daily', priority: '0.80' },
    { loc: 'https://vicecityhub.eu/llms-full.txt', lastmod: today, changefreq: 'daily', priority: '0.80' }
  ];

  const seenUrls = new Set(urls.map(u => u.loc));

  if (isTursoConfigured(env)) {
    try {
      const { rows: tutorials } = await runTursoSql(
        env,
        "SELECT id, title, description, category_label, video_url, embed_url, thumbnail_url, created_at FROM tutorials WHERE status = 'approved' ORDER BY created_at DESC LIMIT 150"
      );
      for (const t of (tutorials || [])) {
        const mod = (t.created_at || today).slice(0, 10);
        let rawDate = t.created_at || today;
        if (!rawDate.includes('T')) rawDate = rawDate.replace(' ', 'T');
        if (!rawDate.endsWith('Z') && !rawDate.includes('+')) rawDate += '+00:00';

        const tutUrl = `https://vicecityhub.eu/tutorials.html?id=${encodeURIComponent(t.id)}`;
        if (!seenUrls.has(tutUrl)) {
          seenUrls.add(tutUrl);
          urls.push({
            loc: tutUrl,
            lastmod: mod,
            changefreq: 'daily',
            priority: '0.92',
            video: {
              thumbnail: t.thumbnail_url || 'https://vicecityhub.eu/assets/brand/og-banner.png',
              title: t.title,
              description: t.description || t.title,
              contentLoc: t.video_url,
              playerLoc: t.embed_url || t.video_url,
              pubDate: rawDate,
              category: t.category_label || 'GTA VI Guides'
            }
          });
        }
      }

      const { rows: posts } = await runTursoSql(
        env,
        "SELECT id, username, created_at FROM community_posts WHERE status = 'approved' ORDER BY created_at DESC LIMIT 100"
      );
      for (const p of (posts || [])) {
        const mod = (p.created_at || today).slice(0, 10);
        const threadUrl = `https://vicecityhub.eu/d/${encodeURIComponent(p.id)}`;
        if (!seenUrls.has(threadUrl)) {
          seenUrls.add(threadUrl);
          urls.push({
            loc: threadUrl,
            lastmod: mod,
            changefreq: 'daily',
            priority: '0.85'
          });
        }
        if (p.username) {
          const profUrl = `https://vicecityhub.eu/profile.html?u=${encodeURIComponent(p.username)}`;
          if (!seenUrls.has(profUrl)) {
            seenUrls.add(profUrl);
            urls.push({
              loc: profUrl,
              lastmod: mod,
              changefreq: 'weekly',
              priority: '0.70'
            });
          }
        }
      }
    } catch (e) {}
  }

  const xmlItems = urls.map(u => {
    let videoXml = '';
    if (u.video) {
      videoXml = `\n    <video:video>
      <video:thumbnail_loc>${escapeXml(u.video.thumbnail)}</video:thumbnail_loc>
      <video:title>${escapeXml(u.video.title)}</video:title>
      <video:description>${escapeXml(u.video.description)}</video:description>
      <video:content_loc>${escapeXml(u.video.contentLoc)}</video:content_loc>
      <video:player_loc allow_embed="yes">${escapeXml(u.video.playerLoc)}</video:player_loc>
      <video:publication_date>${escapeXml(u.video.pubDate)}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:category>${escapeXml(u.video.category)}</video:category>
    </video:video>`;
    }
    return `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
    <changefreq>${escapeXml(u.changefreq)}</changefreq>
    <priority>${escapeXml(u.priority)}</priority>${videoXml}
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${xmlItems}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
