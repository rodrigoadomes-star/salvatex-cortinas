(function () {
  const state = { enabled: false, enforced: false, token: "", widgetId: null };

  function loadScript() {
    if (window.turnstile) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.getElementById("salvatex-turnstile-api");
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "salvatex-turnstile-api";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function init() {
    const container = document.getElementById("checkout-turnstile");
    if (!container) return;
    try {
      const response = await fetch("/api/turnstile-config", { cache: "no-store" });
      const config = await response.json();
      if (!response.ok || !config.enabled || !config.sitekey) return;
      state.enabled = true;
      state.enforced = Boolean(config.enforced);
      container.hidden = false;
      await loadScript();
      state.widgetId = window.turnstile.render(container, {
        sitekey: config.sitekey,
        theme: "auto",
        action: "create_order",
        callback(token) { state.token = token; },
        "expired-callback"() { state.token = ""; },
        "error-callback"() { state.token = ""; }
      });
    } catch {
      if (state.enforced) container.hidden = false;
    }
  }

  window.SalvatexTurnstile = {
    getToken() { return state.token; },
    isRequired() { return state.enforced; },
    reset() {
      state.token = "";
      if (window.turnstile && state.widgetId !== null) window.turnstile.reset(state.widgetId);
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
