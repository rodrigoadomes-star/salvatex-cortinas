export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const assetUrl = new URL('/admin/index.html', url.origin);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), context.request));
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, no-cache, must-revalidate');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function onRequestHead(context) {
  return onRequestGet(context);
}
