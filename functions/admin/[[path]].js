export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  const path = String(context.params?.path || '').replace(/^\/+/, '');

  // Deixe endpoints administrativos reais seguirem para as functions
  // específicas em functions/admin/api/*.
  if (path === 'api' || path.startsWith('api/')) {
    return context.next();
  }

  // Arquivos estáticos do painel (html/css auxiliares) podem seguir pelo
  // pipeline normal de assets. O entrypoint /admin/ também deve seguir para
  // o asset físico admin/index.html, evitando ASSETS.fetch('/admin/index.html')
  // dentro da própria rota /admin/*, que causava loop no Pages.
  return context.next();
}
