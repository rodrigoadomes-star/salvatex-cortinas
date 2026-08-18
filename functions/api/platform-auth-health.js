import { hashPassword, verifyPassword } from "../platform/api/_lib.js";

export async function onRequestGet() {
  const started = Date.now();
  try {
    const hashed = await hashPassword("radz-health-test-A1");
    const verified = await verifyPassword("radz-health-test-A1", hashed.hash, hashed.salt, hashed.iterations);
    return Response.json({
      ok: verified === true,
      helper: "platform/api/_lib.js",
      engine: "node:crypto/pbkdf2Sync",
      hashLength: String(hashed.hash || "").length,
      saltLength: String(hashed.salt || "").length,
      iterations: hashed.iterations,
      verified,
      elapsedMs: Date.now() - started
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({
      ok: false,
      helper: "platform/api/_lib.js",
      engine: "node:crypto/pbkdf2Sync",
      errorName: String(error?.name || "Error"),
      errorMessage: String(error?.message || error || "unknown").slice(0, 180),
      elapsedMs: Date.now() - started
    }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
