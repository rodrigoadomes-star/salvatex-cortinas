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

  const allowedPrefix = `companies/${auth.companyId}/stores/${auth.storeId}/public/configuradores/`;

  if (!key || !key.startsWith(allowedPrefix)) {
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
    {},
    auth.storeId
  );

  return json({
    ok: true,
    key
  });
}
