import { pbkdf2Sync, timingSafeEqual } from "node:crypto";

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });
}

export function clean(value, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

export function normalizeEmail(value) {
  return clean(value, 320).toLowerCase();
}

export function digits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function slugify(value) {
  return clean(value, 120).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 63);
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

export function validCnpj(value) {
  const n = digits(value);
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const calc = (length) => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i += 1) {
      sum += Number(n[i]) * weight--;
      if (weight < 2) weight = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calc(12) === Number(n[12]) && calc(13) === Number(n[13]);
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(digest);
}

// Cloudflare's current Node-compatible PBKDF2 runtime rejects iteration counts above 100000.
// New credentials therefore use the maximum supported count while preserving the existing
// D1 credential format (hash hex + salt hex + stored per-user iteration count).
export async function hashPassword(password, saltHex = randomToken(16), iterations = 100000) {
  const requested = Number(iterations);
  const count = Number.isFinite(requested) && requested > 0 ? Math.min(Math.trunc(requested), 100000) : 100000;
  const derived = pbkdf2Sync(String(password), Buffer.from(saltHex, "hex"), count, 32, "sha256");
  return { hash: derived.toString("hex"), salt: saltHex, iterations: count };
}

export async function verifyPassword(password, expectedHash, salt, iterations) {
  const actual = await hashPassword(password, salt, iterations);
  const expected = String(expectedHash || "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(actual.hash) || !/^[0-9a-f]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual.hash, "hex"), Buffer.from(expected, "hex"));
}

export function sessionCookie(token, maxAge = 28800) {
  return `radzhub_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return "radzhub_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export function cookie(request, name) {
  const source = request.headers.get("cookie") || "";
  const item = source.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

export async function verifyTurnstileDetailed(env, request, token) {
  const enforced = String(env.TURNSTILE_ENFORCE || "false").toLowerCase() === "true";
  if (!enforced) return { ok: true, code: "TURNSTILE_DISABLED" };
  if (!env.TURNSTILE_SECRET_KEY) return { ok: false, code: "TURNSTILE_SECRET_MISSING" };
  if (!String(token || "").trim()) return { ok: false, code: "TURNSTILE_TOKEN_MISSING" };

  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", String(token).trim());

  let response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form
    });
  } catch {
    return { ok: false, code: "TURNSTILE_SITEVERIFY_UNAVAILABLE" };
  }

  if (!response.ok) return { ok: false, code: "TURNSTILE_SITEVERIFY_HTTP" };

  let result;
  try {
    result = await response.json();
  } catch {
    return { ok: false, code: "TURNSTILE_SITEVERIFY_INVALID_RESPONSE" };
  }

  if (result.success === true) return { ok: true, code: "TURNSTILE_OK", hostname: result.hostname || null };

  const errors = Array.isArray(result["error-codes"]) ? result["error-codes"].map(String) : [];
  let code = "TURNSTILE_INVALID";
  if (errors.includes("invalid-input-secret") || errors.includes("missing-input-secret")) code = "TURNSTILE_SECRET_INVALID";
  else if (errors.includes("timeout-or-duplicate")) code = "TURNSTILE_TOKEN_EXPIRED";
  else if (errors.includes("invalid-input-response") || errors.includes("missing-input-response")) code = "TURNSTILE_TOKEN_INVALID";

  return { ok: false, code };
}

export async function verifyTurnstile(env, request, token) {
  const result = await verifyTurnstileDetailed(env, request, token);
  return result.ok;
}

export async function audit(env, request, action, companyId, userId, metadata = {}) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256(`${ip}:${env.PLATFORM_AUDIT_SALT || "radzhub"}`);
  await env.DB.prepare(`INSERT INTO platform_audit_logs
    (actor_user_id, company_id, action, metadata_json, ip_hash, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
    .bind(userId || null, companyId || null, action, JSON.stringify(metadata), ipHash, new Date().toISOString()).run();
}
