(()=>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
let busy=false,lastData=null;

function fmt(value){if(!value)return"—";try{return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(value))}catch{return String(value)}}
function csrf(){return window.__RADZ_META_CSRF||""}
async function request(url,opt={}){
  const method=String(opt.method||"GET").toUpperCase();
  const headers={accept:"application/json","content-type":"application/json",...(opt.headers||{})};
  const token=csrf();
  if(!["GET","HEAD","OPTIONS"].includes(method)&&token)headers["x-csrf-token"]=token;
  const res=await fetch(url,{credentials:"same-origin",...opt,headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.message||data.code||`Falha (${res.status}).`);
  return data;
}
async function loadCsrf(){
  try{const s=await fetch("/radz/api/session",{credentials:"same-origin",headers:{accept:"application/json"}});const d=await s.json();window.__RADZ_META_CSRF=d.csrfToken||""}catch{}
}
function accountOptions(c){
  if(!c.adAccounts?.length)return'<option value="">Nenhuma conta encontrada</option>';
  return c.adAccounts.map(a=>`<option value="${esc(a.id)}" ${a.selected?"selected":""}>${esc(a.name||"Conta sem nome")} · act_${esc(a.id)}${a.currency?` · ${esc(a.currency)}`:""}</option>`).join("");
}
function companyCard(c){
  const connected=Boolean(c.connected),i=c.integration||{},selected=(c.adAccounts||[]).find(a=>a.selected);
  return `<article class="config-card meta-company-card" data-company="${esc(c.id)}">
    <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <div><h2>${esc(c.tradeName)}</h2><p><span class="status ${connected?"active":"disabled"}">${connected?"Meta conectada":"Não conectada"}</span></p></div>
      <a class="primary-link" href="/api/oauth/meta/start?company_id=${encodeURIComponent(c.id)}">${connected?"Reconectar Meta":"Conectar Meta"} ↗</a>
    </div>
    ${connected?`<div class="meta-details">
      <p><strong>Conta Meta:</strong> ${esc(i.metaUserName||"—")}${i.metaUserId?` <small>(${esc(i.metaUserId)})</small>`:""}</p>
      <p><strong>Credencial:</strong> <span class="status active">Armazenada com criptografia 🔒</span></p>
      <p><strong>Contas de anúncios encontradas:</strong> ${Number(i.adAccountsFound||c.adAccounts?.length||0)}</p>
      <p><strong>Conectado em:</strong> ${esc(fmt(i.connectedAt))}</p>
      <p><strong>Última atualização:</strong> ${esc(fmt(i.updatedAt||i.lastCheckedAt))}</p>
      ${i.lastError?`<p class="form-result"><strong>Último erro:</strong> ${esc(i.lastError)}</p>`:""}
      <form class="meta-account-form" data-company="${esc(c.id)}">
        <label>Conta de anúncios autorizada<select name="accountId" ${c.adAccounts?.length?"":"disabled"}>${accountOptions(c)}</select></label>
        <button type="submit" ${c.adAccounts?.length?"":"disabled"}>Salvar conta de anúncios</button>
        <p class="form-result" aria-live="polite">${selected?`Selecionada: ${esc(selected.name||"Conta")} · act_${esc(selected.id)}`:"Selecione a conta que esta empresa usará no tráfego pago."}</p>
      </form>
    </div>`:`<p>Conecte esta empresa à Meta para armazenar a autorização com segurança e listar as contas de anúncios disponíveis.</p>`}
  </article>`;
}
function render(data){
  const content=$("#section-content");
  if(!content||$("#section-title")?.textContent.trim()!=="Meta Ads")return;
  lastData=data;
  content.innerHTML=`<div class="cards">${(data.companies||[]).map(companyCard).join("")||'<article class="config-card"><h2>Nenhuma empresa disponível</h2></article>'}</div>`;
  content.querySelectorAll(".meta-account-form").forEach(form=>form.addEventListener("submit",saveAccount));
}
async function saveAccount(e){
  e.preventDefault();const form=e.currentTarget,out=form.querySelector(".form-result"),button=form.querySelector("button"),accountId=form.accountId.value;
  if(!accountId)return;
  button.disabled=true;out.textContent="Salvando…";
  try{
    await loadCsrf();
    await request("/radz/api/meta",{method:"PATCH",body:JSON.stringify({companyId:form.dataset.company,accountId})});
    out.textContent="Conta de anúncios selecionada.";
    await refresh(true);
  }catch(err){out.textContent=err.message}finally{button.disabled=false}
}
async function refresh(force=false){
  if(busy)return;if($("#section-title")?.textContent.trim()!=="Meta Ads"&&!force)return;
  busy=true;
  const content=$("#section-content");
  if(content&&!lastData)content.innerHTML='<article class="config-card"><h2>Meta Ads</h2><p>Carregando integração…</p></article>';
  try{const data=await request("/radz/api/meta");render(data)}catch(err){if(content)content.innerHTML=`<article class="config-card"><h2>Não foi possível carregar a Meta</h2><p>${esc(err.message)}</p></article>`}finally{busy=false}
}
function schedule(){setTimeout(()=>refresh(),0)}
$("#radz-nav")?.addEventListener("click",e=>{if(e.target.closest('[data-section="meta"]'))schedule()});
$("#refresh")?.addEventListener("click",()=>{if($("#section-title")?.textContent.trim()==="Meta Ads")setTimeout(()=>refresh(true),50)});
const observer=new MutationObserver(()=>{if($("#section-title")?.textContent.trim()==="Meta Ads"&&!busy)schedule()});
const title=$("#section-title");if(title)observer.observe(title,{childList:true,subtree:true,characterData:true});
if(new URLSearchParams(location.search).has("meta"))setTimeout(()=>refresh(true),150);
})();