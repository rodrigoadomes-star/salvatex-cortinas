export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

export function requireAdmin(context) {
  const configured = String(context.env.ADMIN_TOKEN || "").trim();
  if (!configured) {
    return { ok: false, response: json({ ok:false, code:"ADMIN_NOT_CONFIGURED", message:"Configure o segredo ADMIN_TOKEN no Cloudflare." }, 503) };
  }
  const header = String(context.request.headers.get("authorization") || "");
  const supplied = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!supplied || supplied !== configured) {
    return { ok:false, response: json({ ok:false, code:"UNAUTHORIZED", message:"Acesso administrativo não autorizado." }, 401) };
  }
  if (!context.env.DB) {
    return { ok:false, response: json({ ok:false, code:"DB_NOT_CONFIGURED", message:"Binding D1 DB não configurado." }, 503) };
  }
  return { ok:true };
}

export function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export function slugify(value) {
  return clean(value, 240).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function cents(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function parseJson(value, fallback = null) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

export async function logAdmin(db, action, entityType = null, entityId = null, payload = null) {
  try {
    await db.prepare(`INSERT INTO admin_logs (store_id, action, entity_type, entity_id, payload_json, created_at) VALUES ('salvatex', ?1, ?2, ?3, ?4, ?5)`)
      .bind(action, entityType, entityId, payload ? JSON.stringify(payload) : null, new Date().toISOString()).run();
  } catch (_) {}
}
