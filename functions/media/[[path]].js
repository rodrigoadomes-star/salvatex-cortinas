export async function onRequestGet(context) {
  if (!context.env.MEDIA) {
    return new Response(
      "MEDIA_NOT_CONFIGURED",
      {
        status: 503
      }
    );
  }

  const key =
    Array.isArray(
      context.params.path
    )
      ? context.params.path.join("/")
      : String(
          context.params.path || ""
        );

  if (!key) {
    return new Response(
      "NOT_FOUND",
      {
        status: 404
      }
    );
  }

  // O mesmo bucket pode conter documentos privados. A rota pública serve
  // exclusivamente a área de mídia publicada do configurador.
  if (key.startsWith("private/") || !key.startsWith("configuradores/")) {
    return new Response("NOT_FOUND", { status: 404, headers: { "cache-control": "no-store" } });
  }

  const object =
    await context.env.MEDIA.get(
      key
    );

  if (!object) {
    return new Response(
      "NOT_FOUND",
      {
        status: 404
      }
    );
  }

  const headers =
    new Headers();

  object.writeHttpMetadata(
    headers
  );

  headers.set(
    "etag",
    object.httpEtag
  );

  headers.set(
    "cache-control",
    "public, max-age=31536000, immutable"
  );
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; sandbox");

  return new Response(
    object.body,
    {
      headers
    }
  );
}
