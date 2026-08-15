import {
  json,
  requireAdmin,
  logAdmin
} from "../_auth.js";

export async function onRequestDelete(context) {
  const auth =
    await requireAdmin(context);

  if (!auth.ok) {
    return auth.response;
  }

  if (!context.env.MEDIA) {
    return json(
      {
        ok: false,
        message:
          "Binding R2 MEDIA não configurado."
      },
      503
    );
  }

  const url =
    new URL(
      context.request.url
    );

  const key =
    String(
      url.searchParams.get("key") ||
      ""
    ).trim();

  if (!key || key.startsWith("private/") || !key.startsWith("configuradores/")) {
    return json(
      {
        ok: false,
        message:
          "Arquivo não informado."
      },
      400
    );
  }

  await context.env.MEDIA.delete(
    key
  );

  await logAdmin(
    context.env.DB,
    "media_deleted",
    "media",
    key,
    {}
  );

  return json({
    ok: true,
    key
  });
}
