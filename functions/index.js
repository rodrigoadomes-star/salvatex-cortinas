class InternalAnchorHandler {
  element(element) {
    const href = element.getAttribute('href') || '';
    if (!href.startsWith('#')) return;
    const target = href.slice(1) || 'top';
    element.setAttribute('href', '/');
    element.setAttribute('data-scroll-target', target);
  }
}

class CleanPublicLinkHandler {
  element(element) {
    const href = element.getAttribute('href') || '';
    if (href === '/platform/login.html') element.setAttribute('href', '/login');
    if (href === '/platform/cadastro.html') element.setAttribute('href', '/cadastro');
    if (href === '/platform/' || href === '/platform') element.setAttribute('href', '/');
  }
}

class HeadHandler {
  element(element) {
    element.append('<link rel="canonical" href="https://radzhub.com.br/">', { html: true });
  }
}

class BodyHandler {
  element(element) {
    element.append(`
<script>
(function () {
  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-scroll-target]');
    if (!link) return;
    event.preventDefault();
    var id = link.getAttribute('data-scroll-target');
    var target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.location.pathname !== '/' || window.location.hash) {
      history.replaceState(null, '', '/');
    }
  });

  if (window.location.hash) {
    var id = window.location.hash.slice(1);
    history.replaceState(null, '', '/');
    requestAnimationFrame(function () {
      var target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }
})();
</script>`, { html: true });
  }
}

function isRadzHost(host) {
  const h=String(host||'').toLowerCase();
  return h==='radzhub.com.br' ||
    h==='www.radzhub.com.br' ||
    h==='radz-hub.pages.dev' ||
    h.endsWith('.radz-hub.pages.dev');
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  if (!isRadzHost(host)) {
    return context.env.ASSETS.fetch(context.request);
  }

  const assetUrl = new URL('/platform/', url.origin);
  const assetRequest = new Request(assetUrl.toString(), context.request);
  const response = await context.env.ASSETS.fetch(assetRequest);

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-cache');
  const htmlResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  return new HTMLRewriter()
    .on('head', new HeadHandler())
    .on('a[href]', new CleanPublicLinkHandler())
    .on('a[href^="#"]', new InternalAnchorHandler())
    .on('body', new BodyHandler())
    .transform(htmlResponse);
}
