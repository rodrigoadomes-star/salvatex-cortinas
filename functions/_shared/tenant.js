import { json } from "../api/_lib.js";

const PLATFORM_HOSTS = new Set(["radzhub.com.br", "www.radzhub.com.br", "radz-hub.pages.dev"]);
const SALVATEX_HOSTS = new Set(["salvatex-cortinas.pages.dev"]);

function hostnameOf(request) {
  return new URL(request.url).hostname.toLowerCase().replace(/\.$/, "");
}

export async function resolveTenant(context, options = {}) {
  const hostname = hostnameOf(context.request);
  if (PLATFORM_HOSTS.has(hostname)) return { kind: "platform", hostname, companyId: null, storeId: null };

  const domain = await context.env.DB.prepare(`
    SELECT d.company_id, pcs.store_id, c.status company_status, s.active store_active
    FROM platform_domains d
    JOIN platform_companies c ON c.id=d.company_id
    JOIN platform_company_stores pcs ON pcs.company_id=d.company_id
    JOIN stores s ON s.id=pcs.store_id
    WHERE lower(d.hostname)=?1 AND d.status='active'
    LIMIT 1
  `).bind(hostname).first();

  if (domain) {
    if (!domain.store_active || !["trial", "active"].includes(domain.company_status)) {
      return { kind: "disabled", hostname, companyId: domain.company_id, storeId: domain.store_id };
    }
    return { kind: "store", hostname, companyId: domain.company_id, storeId: domain.store_id };
  }

  if (SALVATEX_HOSTS.has(hostname) || (options.allowPreview && hostname.endsWith(".salvatex-cortinas.pages.dev"))) {
    const linked = await context.env.DB.prepare(`
      SELECT pcs.company_id, pcs.store_id
      FROM platform_company_stores pcs WHERE pcs.store_id='salvatex' LIMIT 1
    `).first();
    return { kind: "store", hostname, companyId: linked?.company_id || null, storeId: "salvatex" };
  }

  return { kind: "unknown", hostname, companyId: null, storeId: null };
}

export async function requireStoreTenant(context, options = {}) {
  const tenant = await resolveTenant(context, options);
  if (tenant.kind === "disabled") return { ok: false, response: json({ ok:false, message:"Loja indisponível." }, 403) };
  if (tenant.kind !== "store") return { ok: false, response: json({ ok:false, message:"Loja não identificada." }, 404) };
  return { ok: true, tenant };
}
