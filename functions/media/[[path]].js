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

  return new Response(
    object.body,
    {
      headers
    }
  );
}
