export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || url.searchParams.get('post') || '';
  if (id) {
    return Response.redirect(`${url.origin}/d/${encodeURIComponent(id)}`, 301);
  }
  return Response.redirect(`${url.origin}/index.html`, 302);
}
