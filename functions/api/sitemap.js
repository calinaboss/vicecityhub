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

  const xmlItems = urls.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
    <changefreq>${escapeXml(u.changefreq)}</changefreq>
    <priority>${escapeXml(u.priority)}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
