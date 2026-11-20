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
  const items = [];

  if (isTursoConfigured(env)) {
    try {
      const { rows: posts } = await runTursoSql(
        env,
        "SELECT id, title, content, author, category_label, created_at FROM community_posts WHERE status = 'approved' ORDER BY created_at DESC LIMIT 30"
      );
      for (const p of (posts || [])) {
        items.push({
          title: `[${p.category_label || 'GTA VI'}] ${p.title}`,
          link: `https://vicecityhub.eu/index.html#post-${encodeURIComponent(p.id)}`,
          desc: p.content,
          author: p.author || 'ViceCityHub',
          date: p.created_at ? new Date(p.created_at.replace(' ', 'T') + 'Z').toUTCString() : new Date().toUTCString()
        });
      }

      const { rows: discords } = await runTursoSql(
        env,
        "SELECT id, name, tag, country_label, description, created_at FROM discord_servers WHERE status = 'approved' ORDER BY created_at DESC LIMIT 20"
      );
      for (const d of (discords || [])) {
        items.push({
          title: `[GTA VI Discord - ${d.tag || 'Community'} / ${d.country_label || 'International'}] ${d.name}`,
          link: `https://vicecityhub.eu/discords.html`,
          desc: d.description,
          author: 'ViceCityHub Discord Directory',
          date: d.created_at ? new Date(d.created_at.replace(' ', 'T') + 'Z').toUTCString() : new Date().toUTCString()
        });
      }
    } catch (e) {}
  }

  const rssItems = items.map(it => `    <item>
      <title>${escapeXml(it.title)}</title>
      <link>${escapeXml(it.link)}</link>
      <guid isPermaLink="false">${escapeXml(it.link)}</guid>
      <description>${escapeXml(it.desc)}</description>
      <author>${escapeXml(it.author)}</author>
      <pubDate>${escapeXml(it.date)}</pubDate>
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ViceCityHub.eu - GTA VI Community Feed, Leonida Map, Discord Servers &amp; Cheats</title>
    <link>https://vicecityhub.eu/</link>
    <atom:link href="https://vicecityhub.eu/api/feed" rel="self" type="application/rss+xml"/>
    <description>Live GTA VI community discussions, verified GTA 6 Discord servers directory, PS5 &amp; Xbox Series X/S cheat codes, and interactive Leonida map updates.</description>
    <language>en</language>
${rssItems}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
