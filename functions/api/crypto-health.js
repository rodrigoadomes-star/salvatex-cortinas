import { pbkdf2Sync, scryptSync, createHash } from "node:crypto";

function safeError(error) {
  return {
    name: String(error?.name || "Error"),
    message: String(error?.message || error || "unknown").slice(0, 180)
  };
}

export async function onRequestGet() {
  const result = {
    ok: true,
    nodeCryptoImport: true,
    pbkdf2Sync: null,
    scryptSync: null,
    sha256: null
  };

  try {
    const digest = createHash("sha256").update("radz-crypto-health").digest("hex");
    result.sha256 = { ok: /^[0-9a-f]{64}$/.test(digest) };
  } catch (error) {
    result.ok = false;
    result.sha256 = { ok: false, error: safeError(error) };
  }

  try {
    const derived = pbkdf2Sync("test-password", Buffer.from("00112233445566778899aabbccddeeff", "hex"), 1000, 32, "sha256");
    result.pbkdf2Sync = { ok: derived.length === 32 };
  } catch (error) {
    result.ok = false;
    result.pbkdf2Sync = { ok: false, error: safeError(error) };
  }

  try {
    const derived = scryptSync("test-password", Buffer.from("00112233445566778899aabbccddeeff", "hex"), 32, { N: 1024, r: 8, p: 1, maxmem: 8 * 1024 * 1024 });
    result.scryptSync = { ok: derived.length === 32 };
  } catch (error) {
    result.ok = false;
    result.scryptSync = { ok: false, error: safeError(error) };
  }

  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
