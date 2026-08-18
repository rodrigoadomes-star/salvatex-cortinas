class HeadHandler {
  element(element) {
    element.prepend('<base href="/">', { html: true });
    element.append('<link rel="canonical" href="https://radzhub.com.br/salvatex/">', { html: true });
  }
}

class SalvatexLinkHandler {
  element(element) {
    const href = element.getAttribute('href') || '';
    if (href === 'index.html' || href === './' || href === '/') element.setAttribute('href', '/salvatex/');
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const assetUrl = new URL('/index.html', url.origin);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), context.request));
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-cache');
  headers.delete('content-length');
  const htmlResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  return new HTMLRewriter()
    .on('head', new HeadHandler())
    .on('a[href]', new SalvatexLinkHandler())
    .transform(htmlResponse);
}
