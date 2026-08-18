export async function onRequestGet() {
  return Response.json({ ok: true, code: "RADZ_NODE_CRYPTO_READY", version: "2026-08-18-node-crypto-1" }, {
    headers: { "cache-control": "no-store" }
  });
}
