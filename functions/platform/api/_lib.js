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

function hexToBytes(value) {
  return new Uint8Array((value.match(/.{1,2}/g) || []).map((byte) => Number.parseInt(byte, 16)));
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

export async function hashPassword(password, saltHex = randomToken(16), iterations = 210000) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations }, material, 256
  );
  return { hash: bytesToHex(bits), salt: saltHex, iterations };
}

export async function verifyPassword(password, expectedHash, salt, iterations) {
  const actual = await hashPassword(password, salt, iterations);
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(actual.hash)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedHash))
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
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

export async function verifyTurnstile(env, request, token) {
  if (String(env.TURNSTILE_ENFORCE || "false").toLowerCase() !== "true") return true;
  if (!env.TURNSTILE_SECRET_KEY || !token) return false;
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

export async function audit(env, request, action, companyId, userId, metadata = {}) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256(`${ip}:${env.PLATFORM_AUDIT_SALT || "radzhub"}`);
  await env.DB.prepare(`INSERT INTO platform_audit_logs
    (actor_user_id, company_id, action, metadata_json, ip_hash, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
    .bind(userId || null, companyId || null, action, JSON.stringify(metadata), ipHash, new Date().toISOString()).run();
}


