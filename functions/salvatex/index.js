export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = new URL('https://salvatex.radzhub.com.br/');
  target.search = url.search;
  return Response.redirect(target.toString(), 301);
}
