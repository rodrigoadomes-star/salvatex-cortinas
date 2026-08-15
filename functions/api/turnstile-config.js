import { json } from "./_lib.js";

export function onRequestGet(context) {
  const sitekey = String(context.env.TURNSTILE_SITE_KEY || "").trim();
  const enforced = String(context.env.TURNSTILE_ENFORCE || "").toLowerCase() === "true";

  return json({
    ok: true,
    enabled: Boolean(sitekey),
    enforced,
    sitekey
  }, 200, { "Cache-Control": "public, max-age=300" });
}
