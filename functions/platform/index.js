export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  const isRadzDomain = host === 'radzhub.com.br' || host === 'www.radzhub.com.br';

  if (!isRadzDomain) {
    return context.env.ASSETS.fetch(context.request);
  }

  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><script>location.replace('/');</script><noscript><meta http-equiv="refresh" content="0;url=/"></noscript></head><body></body></html>`, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'no-store',
    },
  });
}
