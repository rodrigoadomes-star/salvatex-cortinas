(() => {
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("admin-email-input");
  const passwordInput = document.getElementById("admin-password-input");
  const errorBox = document.getElementById("login-error");

  function applyIdentity(data) {
    const user = data?.user || {};
    const store = data?.store || {};
    const name = String(user.name || "Administrador");
    const storeName = String(store.name || store.id || "Loja");
    const nameEl = document.getElementById("admin-user-name");
    const storeEl = document.getElementById("admin-store-name");
    const avatarEl = document.getElementById("admin-user-avatar");
    if (nameEl) nameEl.textContent = name;
    if (storeEl) storeEl.textContent = storeName;
    if (avatarEl) avatarEl.textContent = (name.trim()[0] || "A").toUpperCase();
  }

  async function refreshIdentity() {
    try {
      const data = await api("session");
      applyIdentity(data);
    } catch (_) {}
  }

  async function individualLogin(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (errorBox) errorBox.textContent = "";

    const email = String(emailInput?.value || "").trim().toLowerCase();
    const password = String(passwordInput?.value || "");
    if (!email || !password) {
      if (errorBox) errorBox.textContent = "Informe e-mail e senha.";
      return;
    }

    const button = form?.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      const response = await fetch("/admin/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      let data = {};
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(data.message || "Não foi possível entrar no painel.");

      ADMIN.csrf = data.csrfToken || "";
      sessionStorage.setItem("salvatexAdminCsrf", ADMIN.csrf);
      if (passwordInput) passwordInput.value = "";
      applyIdentity(data);
      document.getElementById("admin-login").style.display = "none";
      document.getElementById("admin-app").hidden = false;
      await refreshIdentity();
      await navigate(location.hash.slice(1) || "dashboard");
    } catch (error) {
      ADMIN.csrf = "";
      sessionStorage.removeItem("salvatexAdminCsrf");
      if (errorBox) errorBox.textContent = error.message;
    } finally {
      if (button) button.disabled = false;
    }
  }

  form?.addEventListener("submit", individualLogin, true);

  // Se a sessão já existe e o admin.js restaurou o painel, atualiza nome/loja reais.
  if (ADMIN.csrf && !document.getElementById("admin-app")?.hidden) refreshIdentity();
})();
