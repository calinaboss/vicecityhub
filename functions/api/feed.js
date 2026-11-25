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
      const { rows: tutorials } = await runTursoSql(
        env,
        "SELECT id, title, description, category_label, video_url, thumbnail_url, created_at FROM tutorials WHERE status = 'approved' ORDER BY created_at DESC LIMIT 25"
      );
      for (const t of (tutorials || [])) {
        let pubDate;
        try {
          const raw = t.created_at || '';
          const withT = raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z';
          pubDate = new Date(withT).toUTCString();
        } catch (e) {
          pubDate = new Date().toUTCString();
        }
        items.push({
          title: `[GTA VI Guide - ${t.category_label || 'Video'}] ${t.title}`,
          link: `https://vicecityhub.eu/tutorials.html?id=${encodeURIComponent(t.id)}`,
          desc: t.description || t.title,
          author: 'ViceCityHub Video Guides',
          date: pubDate,
          category: t.category_label || 'Guides',
          mediaThumbnail: t.thumbnail_url || 'https://vicecityhub.eu/assets/brand/og-banner.png',
          videoUrl: t.video_url
        });
      }

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

  const rssItems = items.map(it => {
    let extraMedia = '';
    if (it.mediaThumbnail) {
      extraMedia += `\n      <media:thumbnail url="${escapeXml(it.mediaThumbnail)}" />`;
    }
    if (it.videoUrl) {
      extraMedia += `\n      <media:content url="${escapeXml(it.videoUrl)}" medium="video" />`;
    }
    if (it.category) {
      extraMedia += `\n      <category>${escapeXml(it.category)}</category>`;
    }
    return `    <item>
      <title>${escapeXml(it.title)}</title>
      <link>${escapeXml(it.link)}</link>
      <guid isPermaLink="false">${escapeXml(it.link)}</guid>
      <description>${escapeXml(it.desc)}</description>
      <author>${escapeXml(it.author)}</author>
      <pubDate>${escapeXml(it.date)}</pubDate>${extraMedia}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>ViceCityHub.eu - GTA VI Community Feed, Video Walkthroughs, Leonida Map &amp; Cheats</title>
    <link>https://vicecityhub.eu/</link>
    <atom:link href="https://vicecityhub.eu/api/feed" rel="self" type="application/rss+xml"/>
    <description>Live GTA VI community discussions, video walkthroughs, secret car locations, verified GTA 6 Discord servers, and cheat codes.</description>
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
