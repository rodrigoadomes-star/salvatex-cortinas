import { requireStoreTenant } from "../_shared/tenant.js";

function response404() {
  return new Response("NOT_FOUND", { status: 404, headers: { "cache-control": "no-store" } });
}

export async function onRequestGet(context) {
  if (!context.env.MEDIA) return new Response("MEDIA_NOT_CONFIGURED", { status: 503 });

  const key = Array.isArray(context.params.path)
    ? context.params.path.join("/")
    : String(context.params.path || "");

  if (!key || key.startsWith("private/")) return response404();

  // Novo padrão multiempresa: a URL pode conter apenas a empresa/loja
  // correspondente ao tenant resolvido pelo backend para o hostname atual.
  if (key.startsWith("companies/")) {
    const parts = key.split("/");
    const companyId = parts[1] || "";
    const storesIndex = parts.indexOf("stores");
    const storeId = storesIndex >= 0 ? (parts[storesIndex + 1] || "") : "";
    const publicIndex = parts.indexOf("public");
    const configuratorsIndex = parts.indexOf("configuradores");

    if (!companyId || !storeId || storesIndex !== 2 || publicIndex !== 4 || configuratorsIndex !== 5) {
      return response404();
    }

    const tenantAuth = await requireStoreTenant(context, { allowPreview: true });
    if (!tenantAuth.ok) return response404();
    if (tenantAuth.tenant.companyId !== companyId || tenantAuth.tenant.storeId !== storeId) {
      return response404();
    }
  } else if (!key.startsWith("configuradores/")) {
    // Compatibilidade com os objetos antigos da Salvatex. Nenhuma outra área
    // do bucket é pública por esta rota.
    return response404();
  }

  const object = await context.env.MEDIA.get(key);
  if (!object) return response404();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; sandbox");

  return new Response(object.body, { headers });
}
