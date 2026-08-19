(() => {
  const message = document.querySelector("#form-message");
  const show = (text, ok = false) => { if (message) { message.textContent = text; message.className = `message ${ok ? "ok" : "error"}`; } };

  let turnstileWidgetId = null;
  let turnstileEnabled = false;
  window.turnstileToken = "";

  const jsonFetch = async (url, payload) => {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify(payload)
    });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) throw new Error("A publicação do servidor ainda não está configurada.");
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || data.code || "Não foi possível concluir.");
      error.code = data.code || "REQUEST_FAILED";
      throw error;
    }
    return data;
  };

  const loadTurnstileScript = () => new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector('script[data-radz-turnstile]');
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.radzTurnstile = '1';
    script.onload = () => { script.dataset.loaded = '1'; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const hiddenTurnstileToken = () => {
    const slot = document.querySelector('#turnstile-slot');
    const field = slot?.querySelector('input[name="cf-turnstile-response"]') || document.querySelector('input[name="cf-turnstile-response"]');
    return String(field?.value || '').trim();
  };

  const getTurnstileToken = () => {
    if (!turnstileEnabled) return "";
    const hidden = hiddenTurnstileToken();
    if (hidden) { window.turnstileToken = hidden; return hidden; }
    if (window.turnstile && turnstileWidgetId !== null) {
      try {
        const token = String(window.turnstile.getResponse(turnstileWidgetId) || '').trim();
        if (token) { window.turnstileToken = token; return token; }
      } catch {}
    }
    return String(window.turnstileToken || '').trim();
  };

  const requireTurnstileToken = () => {
    if (!turnstileEnabled) return "";
    const token = getTurnstileToken();
    if (token) return token;
    show('Aguarde a verificação de segurança ser concluída.');
    return null;
  };

  const initTurnstile = async () => {
    const slot = document.querySelector('#turnstile-slot');
    if (!slot) return;
    try {
      const response = await fetch('/api/turnstile-config', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('TURNSTILE_CONFIG_FAILED');
      const config = await response.json();
      turnstileEnabled = Boolean(config && config.enabled);
      if (!turnstileEnabled) { slot.hidden = true; return; }
      await loadTurnstileScript();
      turnstileWidgetId = window.turnstile.render(slot, {
        sitekey: config.sitekey,
        theme: 'dark',
        'response-field': true,
        'response-field-name': 'cf-turnstile-response',
        callback(token) {
          window.turnstileToken = String(token || '').trim();
          if (window.turnstileToken && message && /robô|verificação de segurança|Aguarde a verificação/i.test(message.textContent || '')) show('');
        },
        'expired-callback'() { window.turnstileToken = ''; },
        'timeout-callback'() { window.turnstileToken = ''; },
        'error-callback'() { window.turnstileToken = ''; }
      });
    } catch {
      window.turnstileToken = '';
      show('Não foi possível carregar a verificação de segurança. Atualize a página e tente novamente.');
    }
  };

  const resetTurnstile = () => {
    window.turnstileToken = '';
    if (window.turnstile && turnstileWidgetId !== null) {
      try { window.turnstile.reset(turnstileWidgetId); } catch {}
    }
  };

  const handleAuthError = (error) => {
    console.warn('[RADZ auth]', error.code || 'REQUEST_FAILED');
    show(error.message);
    resetTurnstile();
  };

  const register = document.querySelector("#register-form");
  if (register) register.addEventListener("submit", async (event) => {
    event.preventDefault();
    const turnstileToken = requireTurnstileToken();
    if (turnstileToken === null) return;
    show("Criando sua loja...", true);
    const form = new FormData(register);
    const data = Object.fromEntries(form.entries());
    data.turnstileToken = turnstileToken;
    try {
      const result = await jsonFetch("/platform/api/register", data);
      window.location.assign(result.redirect || "/platform-admin/");
    } catch (error) { handleAuthError(error); }
  });

  const login = document.querySelector("#login-form");
  if (login) login.addEventListener("submit", async (event) => {
    event.preventDefault();
    const turnstileToken = requireTurnstileToken();
    if (turnstileToken === null) return;
    show("Entrando...", true);
    const data = Object.fromEntries(new FormData(login).entries());
    data.turnstileToken = turnstileToken;
    try {
      const result = await jsonFetch("/platform/api/login", data);
      window.location.assign(result.redirect || "/platform-admin/");
    } catch (error) { handleAuthError(error); }
  });

  const forgot = document.querySelector('#forgot-password');
  if (forgot && login) forgot.addEventListener('click', async () => {
    const email = String(login.elements.email?.value || '').trim().toLowerCase();
    if (!email) { show('Informe seu e-mail para recuperar a senha.'); login.elements.email?.focus(); return; }
    const turnstileToken = requireTurnstileToken();
    if (turnstileToken === null) return;
    forgot.disabled = true;
    show('Enviando instruções...', true);
    try {
      const result = await jsonFetch('/platform/api/forgot-password', { email, turnstileToken });
      show(result.message || 'Se o e-mail estiver cadastrado, enviaremos um link de redefinição.', true);
    } catch (error) {
      handleAuthError(error);
    } finally {
      forgot.disabled = false;
      resetTurnstile();
    }
  });

  initTurnstile();
})();
