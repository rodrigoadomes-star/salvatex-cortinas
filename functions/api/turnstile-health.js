export async function onRequestGet(context) {
  const enforced = String(context.env.TURNSTILE_ENFORCE || "false").toLowerCase() === "true";
  const sitekeyConfigured = Boolean(String(context.env.TURNSTILE_SITE_KEY || "").trim());
  const secretConfigured = Boolean(String(context.env.TURNSTILE_SECRET_KEY || "").trim());

  if (!enforced) {
    return Response.json({ ok: true, enforced: false, sitekeyConfigured, secretConfigured, secretAccepted: null }, {
      headers: { "cache-control": "no-store" }
    });
  }

  if (!secretConfigured) {
    return Response.json({ ok: false, enforced: true, sitekeyConfigured, secretConfigured: false, secretAccepted: false, code: "TURNSTILE_SECRET_MISSING" }, {
      status: 503,
      headers: { "cache-control": "no-store" }
    });
  }

  const form = new FormData();
  form.set("secret", context.env.TURNSTILE_SECRET_KEY);
  form.set("response", "radz-healthcheck-intentionally-invalid-token");

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    if (!response.ok) {
      return Response.json({ ok: false, enforced: true, sitekeyConfigured, secretConfigured: true, secretAccepted: null, code: "TURNSTILE_SITEVERIFY_HTTP" }, {
        status: 503,
        headers: { "cache-control": "no-store" }
      });
    }

    const result = await response.json();
    const errors = Array.isArray(result["error-codes"]) ? result["error-codes"].map(String) : [];
    const secretRejected = errors.includes("invalid-input-secret") || errors.includes("missing-input-secret");

    return Response.json({
      ok: !secretRejected && sitekeyConfigured,
      enforced: true,
      sitekeyConfigured,
      secretConfigured: true,
      secretAccepted: !secretRejected,
      code: secretRejected ? "TURNSTILE_SECRET_INVALID" : (sitekeyConfigured ? "TURNSTILE_SERVER_READY" : "TURNSTILE_SITEKEY_MISSING")
    }, {
      status: !secretRejected && sitekeyConfigured ? 200 : 503,
      headers: { "cache-control": "no-store" }
    });
  } catch {
    return Response.json({ ok: false, enforced: true, sitekeyConfigured, secretConfigured: true, secretAccepted: null, code: "TURNSTILE_SITEVERIFY_UNAVAILABLE" }, {
      status: 503,
      headers: { "cache-control": "no-store" }
    });
  }
}
