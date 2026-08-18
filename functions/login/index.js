class LinkHandler {
  element(element) {
    const href = element.getAttribute('href') || '';
    if (href === '/platform/' || href === '/platform') element.setAttribute('href', '/');
    if (href === '/platform/cadastro.html') element.setAttribute('href', '/cadastro');
  }
}

class HeadHandler {
  element(element) {
    element.append('<link rel="canonical" href="https://radzhub.com.br/login">', { html: true });
  }
}

function isRadzHost(host) {
  const h = String(host || '').toLowerCase();
  return h === 'radzhub.com.br' ||
    h === 'www.radzhub.com.br' ||
    h === 'radz-hub.pages.dev' ||
    h.endsWith('.radz-hub.pages.dev');
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (!isRadzHost(url.hostname)) return context.env.ASSETS.fetch(context.request);

  const assetUrl = new URL('/platform/login.html', url.origin);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), context.request));
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-cache');
  const htmlResponse = new Response(response.body, { status: response.status, statusText: response.statusText, headers });

  return new HTMLRewriter()
    .on('head', new HeadHandler())
    .on('a[href]', new LinkHandler())
    .transform(htmlResponse);
}
