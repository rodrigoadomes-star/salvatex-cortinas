import { randomToken, sha256 } from "../../platform/api/_lib.js";

const encoder = new TextEncoder();
const COOKIE = "__Host-radzhub_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const SUPER_ROLES = new Set(["platform_owner", "platform_support", "platform_finance"]);

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function b64u(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64u(value) {
  let s = value.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export function cookie(request, name) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

async function key(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function digest(value) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(String(value)))
  );
}

export async function secureEqual(a, b) {
  return crypto.subtle.timingSafeEqual(await digest(a), await digest(b));
}

async function tableExists(db,name){
  try{
    const row=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?1 LIMIT 1").bind(name).first();
    return Boolean(row);
  }catch{return false}
}

export async function resolvePlatformRoles(db,userId,baseRole=null){
  const fallback=SUPER_ROLES.has(baseRole)?[baseRole]:[];
  if(!db||!userId||!await tableExists(db,"platform_user_roles"))return fallback;
  try{
    const rows=await db.prepare(`SELECT ur.role_code
      FROM platform_user_roles ur
      JOIN platform_roles r ON r.code=ur.role_code AND r.scope='platform' AND r.active=1
      WHERE ur.user_id=?1
        AND ur.company_id IS NULL
        AND ur.active=1
        AND (ur.expires_at IS NULL OR ur.expires_at>datetime('now'))
      ORDER BY CASE ur.role_code WHEN 'platform_owner' THEN 0 WHEN 'platform_support' THEN 1 WHEN 'platform_finance' THEN 2 ELSE 9 END`)
      .bind(userId).all();
    const roles=(rows.results||[]).map(x=>x.role_code).filter(x=>SUPER_ROLES.has(x));
    return roles.length?roles:fallback;
  }catch{return fallback}
}

function primaryRole(roles,baseRole=null){
  for(const role of ["platform_owner","platform_support","platform_finance"]){
    if(roles.includes(role))return role;
  }
  return baseRole;
}

// Compatibilidade temporária com a chave mestra antiga.
export async function createSession(secret) {
  const csrf = b64u(crypto.getRandomValues(new Uint8Array(24)));
  const payload = b64u(
    encoder.encode(
      JSON.stringify({
        iat: Date.now(),
        exp: Date.now() + SESSION_SECONDS * 1000,
        csrf,
        role: "platform_owner",
        roles: ["platform_owner"],
        legacy: true,
        nonce: crypto.randomUUID(),
      })
    )
  );
  const signature = b64u(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await key(secret),
        encoder.encode(payload)
      )
    )
  );
  return { token: `${payload}.${signature}`, csrf };
}

export function sessionCookie(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

async function readLegacy(context, token) {
  const secret = String(context.env.RADZ_ADMIN_SESSION_SECRET || "").trim();
  if (!secret || !token || token.startsWith("v2.")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      fromB64u(sig),
      encoder.encode(body)
    );
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64u(body)));
    if (Number(data.exp) <= Date.now() || !data.csrf || data.role !== "platform_owner") return null;
    return {
      ...data,
      roles: ["platform_owner"],
      user_id: null,
      name: "Administrador RADZ HUB (chave mestra)",
      email: null,
      legacy: true,
    };
  } catch {
    return null;
  }
}

export async function createStoredAdminSession(context, user) {
  const raw = randomToken(40);
  const token = `v2.${raw}`;
  const tokenHash = await sha256(token);
  const csrf = await sha256(`radz-csrf:${token}`);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString();
  const id = crypto.randomUUID();

  await context.env.DB.prepare(`INSERT INTO platform_sessions
    (id,user_id,company_id,token_hash,expires_at,created_at,last_seen_at)
    VALUES (?1,?2,NULL,?3,?4,?5,?5)`)
    .bind(id, user.id, tokenHash, expiresAt, now.toISOString())
    .run();

  return { token, csrf, expiresAt, sessionId: id };
}

async function readStored(context, token) {
  if (!token.startsWith("v2.") || !context.env.DB) return null;
  const tokenHash = await sha256(token);
  const row = await context.env.DB.prepare(`SELECT
      s.id session_id,s.user_id,s.expires_at,s.last_seen_at,
      u.name,u.email,u.role base_role,u.active
    FROM platform_sessions s
    JOIN platform_users u ON u.id=s.user_id
    WHERE s.token_hash=?1 AND s.company_id IS NULL
    LIMIT 1`)
    .bind(tokenHash)
    .first();

  const roles=row ? await resolvePlatformRoles(context.env.DB,row.user_id,row.base_role) : [];
  if (!row || !row.active || !roles.length || Date.parse(row.expires_at) <= Date.now()) {
    if (row?.session_id) {
      await context.env.DB.prepare("DELETE FROM platform_sessions WHERE id=?1")
        .bind(row.session_id)
        .run()
        .catch(() => {});
    }
    return null;
  }

  await context.env.DB.prepare("UPDATE platform_sessions SET last_seen_at=?1 WHERE id=?2")
    .bind(new Date().toISOString(), row.session_id)
    .run();

  return {
    ...row,
    role: primaryRole(roles,row.base_role),
    roles,
    csrf: await sha256(`radz-csrf:${token}`),
    legacy: false,
  };
}

export async function revokeCurrentSession(context) {
  const token = cookie(context.request, COOKIE);
  if (!token.startsWith("v2.") || !context.env.DB) return;
  const tokenHash = await sha256(token);
  await context.env.DB.prepare("DELETE FROM platform_sessions WHERE token_hash=?1")
    .bind(tokenHash)
    .run();
}

export async function auditRadz(context, auth, action, targetType = null, targetId = null, metadata = {}) {
  if (!context.env.DB) return;
  const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256(`${ip}:${context.env.PLATFORM_AUDIT_SALT || "radzhub"}`);
  const safeMetadata = { ...metadata };
  for (const key of Object.keys(safeMetadata)) {
    if (/password|token|secret|authorization/i.test(key)) delete safeMetadata[key];
  }
  await context.env.DB.prepare(`INSERT INTO platform_audit_logs
    (actor_user_id,company_id,action,target_type,target_id,ip_hash,metadata_json,created_at)
    VALUES (?1,NULL,?2,?3,?4,?5,?6,?7)`)
    .bind(
      auth?.session?.user_id || null,
      action,
      targetType,
      targetId,
      ipHash,
      JSON.stringify(safeMetadata),
      new Date().toISOString()
    )
    .run();
}

export async function requireRadzAdmin(context, roles = ["platform_owner", "platform_support", "platform_finance"]) {
  if (!context.env.DB) {
    return { ok: false, response: json({ ok: false, code: "DB_NOT_CONFIGURED" }, 503) };
  }

  const token = cookie(context.request, COOKIE);
  let session = await readStored(context, token);
  if (!session) session = await readLegacy(context, token);

  if (!session) {
    return {
      ok: false,
      response: json({ ok: false, code: "UNAUTHORIZED", message: "Sessão RADZ HUB inválida ou expirada." }, 401),
    };
  }

  const sessionRoles=Array.isArray(session.roles)?session.roles:[session.role];
  if (!sessionRoles.some(role=>roles.includes(role))) {
    return {
      ok: false,
      response: json({ ok: false, code: "FORBIDDEN", message: "Permissão insuficiente." }, 403),
    };
  }

  const method = context.request.method.toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const origin = context.request.headers.get("origin");
    if (origin && origin !== new URL(context.request.url).origin) {
      return { ok: false, response: json({ ok: false, code: "BAD_ORIGIN" }, 403) };
    }
    if (!await secureEqual(context.request.headers.get("x-csrf-token") || "", session.csrf)) {
      return { ok: false, response: json({ ok: false, code: "CSRF" }, 403) };
    }
  }

  return { ok: true, session };
}

export async function hasRadzPermission(context,auth,permission){
  if(!permission)return true;
  if(auth?.session?.legacy&&auth?.session?.role==="platform_owner")return true;
  const userId=auth?.session?.user_id;
  if(!userId)return false;

  if(await tableExists(context.env.DB,"platform_user_roles")){
    try{
      const row=await context.env.DB.prepare(`SELECT 1 allowed
        FROM platform_user_roles ur
        JOIN platform_roles r ON r.code=ur.role_code AND r.scope='platform' AND r.active=1
        JOIN platform_role_permissions rp ON rp.role_code=ur.role_code
        WHERE ur.user_id=?1
          AND ur.company_id IS NULL
          AND ur.active=1
          AND (ur.expires_at IS NULL OR ur.expires_at>datetime('now'))
          AND rp.permission_code=?2
        LIMIT 1`).bind(userId,permission).first();
      if(row?.allowed)return true;
    }catch{}
  }

  const roles=Array.isArray(auth?.session?.roles)?auth.session.roles:[auth?.session?.role].filter(Boolean);
  if(roles.includes("platform_owner"))return true;
  for(const role of roles){
    try{
      const row=await context.env.DB.prepare(`SELECT 1 allowed FROM platform_role_permissions
        WHERE role_code=?1 AND permission_code=?2 LIMIT 1`).bind(role,permission).first();
      if(row?.allowed)return true;
    }catch{}
  }
  return false;
}

export async function requireRadzPermission(context,permission){
  const auth=await requireRadzAdmin(context);
  if(!auth.ok)return auth;
  if(!await hasRadzPermission(context,auth,permission)){
    return {ok:false,response:json({ok:false,code:"FORBIDDEN",message:"Seu perfil não possui permissão para esta ação."},403)};
  }
  return auth;
}
