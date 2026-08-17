(() => {
  const message = document.querySelector("#form-message");
  const show = (text, ok = false) => { if (message) { message.textContent = text; message.className = `message ${ok ? "ok" : "error"}`; } };
  const jsonFetch = async (url, payload) => {
    const response = await fetch(url, { method:"POST", credentials:"same-origin", headers:{"content-type":"application/json","accept":"application/json"}, body:JSON.stringify(payload) });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) throw new Error("A publicação do servidor ainda não está configurada.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Não foi possível concluir.");
    return data;
  };
  const register = document.querySelector("#register-form");
  if (register) register.addEventListener("submit", async (event) => {
    event.preventDefault(); show("Criando sua loja...", true);
    const form = new FormData(register); const data = Object.fromEntries(form.entries());
    data.turnstileToken = window.turnstileToken || "";
    try { const result = await jsonFetch("/platform/api/register", data); window.location.assign(result.redirect || "/platform-admin/"); }
    catch (error) { show(error.message); }
  });
  const login = document.querySelector("#login-form");
  if (login) login.addEventListener("submit", async (event) => {
    event.preventDefault(); show("Entrando...", true);
    const data = Object.fromEntries(new FormData(login).entries()); data.turnstileToken = window.turnstileToken || "";
    try { const result = await jsonFetch("/platform/api/login", data); window.location.assign(result.redirect || "/platform-admin/"); }
    catch (error) { show(error.message); }
  });
})();


