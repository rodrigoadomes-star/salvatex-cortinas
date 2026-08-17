class LinkHandler {
  element(element) {
    const href = element.getAttribute('href') || '';
    if (href === '/platform/' || href === '/platform') element.setAttribute('href', '/');
    if (href === '/platform/login.html') element.setAttribute('href', '/login');
  }
}

class HeadHandler {
  element(element) {
    element.append('<link rel="canonical" href="https://radzhub.com.br/cadastro">', { html: true });
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  const isRadzDomain = host === 'radzhub.com.br' || host === 'www.radzhub.com.br';

  if (!isRadzDomain) return context.env.ASSETS.fetch(context.request);

  const assetUrl = new URL('/platform/cadastro.html', url.origin);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), context.request));
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-cache');
  const htmlResponse = new Response(response.body, { status: response.status, statusText: response.statusText, headers });

  return new HTMLRewriter()
    .on('head', new HeadHandler())
    .on('a[href]', new LinkHandler())
    .transform(htmlResponse);
}
