(() => {
  const message = document.querySelector("#form-message");
  const show = (text, ok = false) => { if (message) { message.textContent = text; message.className = `message ${ok ? "ok" : "error"}`; } };

  let turnstileWidgetId = null;
  let turnstileEnabled = false;
  window.turnstileToken = "";

  const jsonFetch = async (url, payload) => {
    const response = await fetch(url, { method:"POST", credentials:"same-origin", headers:{"content-type":"application/json","accept":"application/json"}, body:JSON.stringify(payload) });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) throw new Error("A publicação do servidor ainda não está configurada.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Não foi possível concluir.");
    return data;
  };

  const loadTurnstileScript = () => new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector('script[data-radz-turnstile]');
    if (existing) {
      existing.addEventListener('load', resolve, { once:true });
      existing.addEventListener('error', reject, { once:true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.radzTurnstile = '1';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const initTurnstile = async () => {
    const slot = document.querySelector('#turnstile-slot');
    if (!slot) return;
    try {
      const response = await fetch('/api/turnstile-config', { cache:'no-store', credentials:'same-origin' });
      const config = await response.json();
      turnstileEnabled = Boolean(config && config.enabled);
      if (!turnstileEnabled) {
        slot.hidden = true;
        return;
      }
      await loadTurnstileScript();
      turnstileWidgetId = window.turnstile.render(slot, {
        sitekey: config.sitekey,
        theme: 'dark',
        callback(token) { window.turnstileToken = token || ''; },
        'expired-callback'() { window.turnstileToken = ''; },
        'error-callback'() { window.turnstileToken = ''; }
      });
    } catch (error) {
      window.turnstileToken = '';
      show('Não foi possível carregar a verificação de segurança. Atualize a página e tente novamente.');
    }
  };

  const ensureTurnstile = () => {
    if (!turnstileEnabled) return true;
    if (window.turnstileToken) return true;
    show('Aguarde a verificação de segurança ser concluída.');
    return false;
  };

  const resetTurnstile = () => {
    window.turnstileToken = '';
    if (window.turnstile && turnstileWidgetId !== null) {
      try { window.turnstile.reset(turnstileWidgetId); } catch {}
    }
  };

  const register = document.querySelector("#register-form");
  if (register) register.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ensureTurnstile()) return;
    show("Criando sua loja...", true);
    const form = new FormData(register); const data = Object.fromEntries(form.entries());
    data.turnstileToken = window.turnstileToken || "";
    try { const result = await jsonFetch("/platform/api/register", data); window.location.assign(result.redirect || "/platform-admin/"); }
    catch (error) { show(error.message); resetTurnstile(); }
  });

  const login = document.querySelector("#login-form");
  if (login) login.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ensureTurnstile()) return;
    show("Entrando...", true);
    const data = Object.fromEntries(new FormData(login).entries()); data.turnstileToken = window.turnstileToken || "";
    try { const result = await jsonFetch("/platform/api/login", data); window.location.assign(result.redirect || "/platform-admin/"); }
    catch (error) { show(error.message); resetTurnstile(); }
  });

  initTurnstile();
})();
