export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  // Nunca permita que o painel administrativo da loja seja enviado para
  // um domínio legado. Ele deve sempre permanecer no mesmo host da empresa.
  const path = String(context.params?.path || '').replace(/^\/+/, '');

  // As rotas /admin/api/* continuam sendo tratadas pelas functions mais
  // específicas em functions/admin/api/*.
  if (path === 'api' || path.startsWith('api/')) {
    return context.next();
  }

  let assetPath = '/admin/index.html';
  if (path && path !== 'index.html') {
    assetPath = '/admin/' + path;
  }

  const assetUrl = new URL(assetPath, url.origin);
  const assetRequest = new Request(assetUrl.toString(), context.request);
  const response = await context.env.ASSETS.fetch(assetRequest);

  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  headers.set('x-radz-admin-host', host);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
