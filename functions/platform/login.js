export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  const isRadzDomain = host === 'radzhub.com.br' || host === 'www.radzhub.com.br';

  if (!isRadzDomain) return context.env.ASSETS.fetch(context.request);

  return Response.redirect(new URL('/login', url.origin).toString(), 301);
}
