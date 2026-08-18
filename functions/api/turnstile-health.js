// RADZ production diagnostic deploy marker: 2026-08-18-radzhub-1
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
    const rawBody = await response.text();
    let parsed = null;
    try { parsed = rawBody ? JSON.parse(rawBody) : null; } catch {}

    if (!response.ok) {
      const errorCodes = Array.isArray(parsed?.["error-codes"]) ? parsed["error-codes"].map(String) : [];
      return Response.json({
        ok: false,
        enforced: true,
        sitekeyConfigured,
        secretConfigured: true,
        secretAccepted: null,
        code: "TURNSTILE_SITEVERIFY_HTTP",
        siteverifyHttpStatus: response.status,
        siteverifyStatusText: response.statusText || null,
        siteverifyContentType: response.headers.get("content-type") || null,
        siteverifyErrorCodes: errorCodes,
        siteverifyBodyType: parsed ? "json" : (rawBody ? "text" : "empty")
      }, {
        status: 503,
        headers: { "cache-control": "no-store" }
      });
    }

    if (!parsed || typeof parsed !== "object") {
      return Response.json({
        ok: false,
        enforced: true,
        sitekeyConfigured,
        secretConfigured: true,
        secretAccepted: null,
        code: "TURNSTILE_SITEVERIFY_INVALID_RESPONSE",
        siteverifyHttpStatus: response.status,
        siteverifyContentType: response.headers.get("content-type") || null,
        siteverifyBodyType: rawBody ? "text" : "empty"
      }, {
        status: 503,
        headers: { "cache-control": "no-store" }
      });
    }

    const errors = Array.isArray(parsed["error-codes"]) ? parsed["error-codes"].map(String) : [];
    const secretRejected = errors.includes("invalid-input-secret") || errors.includes("missing-input-secret");

    return Response.json({
      ok: !secretRejected && sitekeyConfigured,
      enforced: true,
      sitekeyConfigured,
      secretConfigured: true,
      secretAccepted: !secretRejected,
      code: secretRejected ? "TURNSTILE_SECRET_INVALID" : (sitekeyConfigured ? "TURNSTILE_SERVER_READY" : "TURNSTILE_SITEKEY_MISSING"),
      siteverifyHttpStatus: response.status,
      siteverifyErrorCodes: errors
    }, {
      status: !secretRejected && sitekeyConfigured ? 200 : 503,
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    return Response.json({
      ok: false,
      enforced: true,
      sitekeyConfigured,
      secretConfigured: true,
      secretAccepted: null,
      code: "TURNSTILE_SITEVERIFY_UNAVAILABLE",
      fetchErrorName: error?.name || null
    }, {
      status: 503,
      headers: { "cache-control": "no-store" }
    });
  }
}
