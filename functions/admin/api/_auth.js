import { requireStoreTenant } from "../../_shared/tenant.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ADMIN_COOKIE = "__Host-stx_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const STORE_ADMIN_ROLES = new Set(["owner", "manager", "staff"]);

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers
    }
  });
}

function b64u(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64u(value) {
  let s = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function cookie(request, name) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

function randomHex(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(String(value))));
}

export async function sha256Hex(value) {
  return [...await digest(value)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function secureEqual(a, b) {
  return crypto.subtle.timingSafeEqual(await digest(String(a)), await digest(String(b)));
}

export async function createAdminSession(secret, identity) {
  const csrf = b64u(crypto.getRandomValues(new Uint8Array(24)));
  const platformToken = randomHex(32);
  const sessionId = `admin-${crypto.randomUUID()}`;
  const now = Date.now();
  const data = {
    iat: now,
    exp: now + SESSION_SECONDS * 1000,
    csrf,
    nonce: crypto.randomUUID(),
    sid: sessionId,
    uid: String(identity.userId),
    cid: String(identity.companyId),
    role: String(identity.role),
    pt: platformToken
  };
  const payload = b64u(encoder.encode(JSON.stringify(data)));
  const signature = b64u(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload))));
  return { token: `${payload}.${signature}`, csrf, platformToken, sessionId, expiresAt: new Date(data.exp).toISOString() };
}

export function adminCookie(token) {
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearAdminCookie() {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

async function readAdminSession(context) {
  const secret = String(context.env.ADMIN_SESSION_SECRET || "").trim();
  const token = cookie(context.request, ADMIN_COOKIE);
  if (!secret || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64u(sig), encoder.encode(body));
    if (!valid) return null;
    const data = JSON.parse(decoder.decode(fromB64u(body)));
    if (Number(data.exp) <= Date.now() || !data.csrf || !data.uid || !data.cid || !data.pt) return null;
    return data;
  } catch {
    return null;
  }
}

export async function requireAdmin(context) {
  if (!context.env.DB) {
    return { ok: false, response: json({ ok: false, code: "DB_NOT_CONFIGURED", message: "Binding D1 DB não configurado." }, 503) };
  }
  if (!context.env.ADMIN_SESSION_SECRET) {
    return { ok: false, response: json({ ok: false, code: "ADMIN_NOT_CONFIGURED", message: "Configure ADMIN_SESSION_SECRET como secret no Cloudflare." }, 503) };
  }

  const signed = await readAdminSession(context);
  if (!signed) {
    return { ok: false, response: json({ ok: false, code: "UNAUTHORIZED", message: "Sessão administrativa inválida ou expirada." }, 401) };
  }

  const tenantResult = await requireStoreTenant(context, { allowPreview: true });
  if (!tenantResult.ok) return tenantResult;
  const tenant = tenantResult.tenant;

  if (!tenant.companyId || signed.cid !== tenant.companyId) {
    return { ok: false, response: json({ ok: false, code: "TENANT_MISMATCH", message: "Esta conta não possui acesso a esta empresa." }, 403) };
  }

  const tokenHash = await sha256Hex(signed.pt);
  const dbSession = await context.env.DB.prepare(`
    SELECT s.id session_id, s.user_id, s.company_id, s.expires_at,
           u.name, u.email, u.role, u.active
    FROM platform_sessions s
    JOIN platform_users u ON u.id=s.user_id
    WHERE s.id=?1 AND s.token_hash=?2 AND s.user_id=?3 AND s.company_id=?4
    LIMIT 1
  `).bind(signed.sid, tokenHash, signed.uid, tenant.companyId).first();

  if (!dbSession || !dbSession.active || Date.parse(dbSession.expires_at) <= Date.now()) {
    return { ok: false, response: json({ ok: false, code: "SESSION_EXPIRED", message: "Sessão administrativa expirada." }, 401) };
  }
  if (!STORE_ADMIN_ROLES.has(dbSession.role)) {
    return { ok: false, response: json({ ok: false, code: "FORBIDDEN", message: "Perfil sem acesso ao painel desta loja." }, 403) };
  }
  if (dbSession.company_id !== tenant.companyId || signed.role !== dbSession.role) {
    return { ok: false, response: json({ ok: false, code: "TENANT_MISMATCH", message: "Sessão não pertence a esta empresa." }, 403) };
  }

  const method = context.request.method.toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const origin = context.request.headers.get("origin");
    if (origin && origin !== new URL(context.request.url).origin) {
      return { ok: false, response: json({ ok: false, code: "BAD_ORIGIN", message: "Origem não autorizada." }, 403) };
    }
    if (!await secureEqual(context.request.headers.get("x-csrf-token") || "", signed.csrf)) {
      return { ok: false, response: json({ ok: false, code: "CSRF", message: "Validação CSRF falhou." }, 403) };
    }
  }

  await context.env.DB.prepare("UPDATE platform_sessions SET last_seen_at=?1 WHERE id=?2")
    .bind(new Date().toISOString(), dbSession.session_id).run();

  return {
    ok: true,
    session: { ...signed, ...dbSession },
    tenant,
    storeId: tenant.storeId,
    companyId: tenant.companyId,
    user: {
      id: dbSession.user_id,
      name: dbSession.name,
      email: dbSession.email,
      role: dbSession.role
    }
  };
}

export function clean(value, max = 500) {
  return String(value ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

export function sanitizeHtml(value, max = 50000) {
  return clean(value, max)
    .replace(/<(script|style|iframe|object|embed|form|meta|link)[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|meta|link)\b[^>]*\/?\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*(javascript:|data:text\/html)[\s\S]*?\2/gi, ' $1="#"');
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

export async function logAdmin(db, action, entityType = null, entityId = null, payload = null, storeId = "salvatex") {
  try {
    await db.prepare(`INSERT INTO admin_logs (store_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
      .bind(storeId, action, entityType, entityId, payload ? JSON.stringify(payload) : null, new Date().toISOString()).run();
  } catch (_) {}
}
