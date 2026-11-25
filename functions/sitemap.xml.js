import { onRequest as handleSitemap } from './api/sitemap.js';

export async function onRequest(context) {
  return handleSitemap(context);
}
