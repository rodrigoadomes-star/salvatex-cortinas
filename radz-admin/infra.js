(()=>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
let active=false,busy=false;
function badge(ok,optional=false){
  if(optional&&!ok)return '<span class="status trial">Opcional</span>';
  return `<span class="status ${ok?"active":"disabled"}">${ok?"OK":"Faltando"}</span>`;
}
function rows(items,optional=false){return Object.entries(items||{}).map(([name,ok])=>`<tr><td><strong>${esc(name)}</strong></td><td>${badge(ok,optional)}</td></tr>`).join("")}
async function load(){
 if(!active||busy)return;busy=true;
 const content=$("#section-content");if(content)content.innerHTML='<article class="config-card"><h2>Infraestrutura</h2><p>Verificando ambiente Cloudflare…</p></article>';
 try{
  const r=await fetch('/radz/api/health',{credentials:'same-origin',headers:{accept:'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.code||`Falha (${r.status})`);
  const optionalMissing=d.schema?.pages?.optionalColumnsMissing||[];
  const core=d.checks?.core||d.checks?.radz||{};
  const meta=d.checks?.optional_meta_ads||{};
  const google=d.checks?.optional_google_ads||{};
  const runtimeLabel=d.ready?'Operacional':'Atenção necessária';
  const runtimeClass=d.ready?'active':'trial';
  content.innerHTML=`
  <div class="cards">
    <article class="config-card">
      <h2>Runtime principal</h2>
      <p><span class="status ${runtimeClass}">${runtimeLabel}</span></p>
      <p>O núcleo da RADZ HUB está separado das integrações opcionais. Meta Ads e Google Ads não bloqueiam o funcionamento da plataforma.</p>
      ${d.missing?.length?`<p class="form-result"><strong>Itens obrigatórios faltando:</strong><br>${d.missing.map(esc).join('<br>')}</p>`:'<p class="form-result"><strong>Todos os itens obrigatórios monitorados estão disponíveis.</strong></p>'}
    </article>
    <article class="config-card"><h2>Bindings</h2><div class="table-wrap"><table><thead><tr><th>Binding</th><th>Status</th></tr></thead><tbody>${rows(d.checks?.bindings)}</tbody></table></div></article>
  </div>
  <div class="cards">
    <article class="config-card"><h2>Núcleo RADZ HUB</h2><p>Autenticação, sessões e proteção da plataforma.</p><div class="table-wrap"><table><thead><tr><th>Variável</th><th>Status</th></tr></thead><tbody>${rows(core)}</tbody></table></div></article>
    <article class="config-card"><h2>Integrações opcionais</h2><p>Essas integrações podem ser configuradas quando a empresa decidir utilizá-las. A ausência delas não indica falha da plataforma.</p><h3>Meta Ads (Beta)</h3><div class="table-wrap"><table><tbody>${rows(meta,true)}</tbody></table></div><h3 style="margin-top:18px">Google Ads OAuth</h3><div class="table-wrap"><table><tbody>${rows(google,true)}</tbody></table></div></article>
  </div>
  <div class="cards">
    <article class="config-card"><h2>D1 — estruturas essenciais</h2><div class="table-wrap"><table><thead><tr><th>Estrutura</th><th>Status</th></tr></thead><tbody>${rows(d.checks?.d1)}</tbody></table></div></article>
    <article class="config-card"><h2>Compatibilidade da tabela pages</h2><p>${d.schema?.pages?.exists?'Tabela base encontrada.':'Tabela base ausente ou incompleta.'}</p>${optionalMissing.length?`<p class="form-result"><strong>Colunas opcionais ainda ausentes:</strong><br>${optionalMissing.map(esc).join('<br>')}<br><br>O endpoint público usa fallback compatível.</p>`:'<p class="form-result"><strong>Schema de páginas completo.</strong></p>'}</article>
  </div>`;
 }catch(e){if(content)content.innerHTML=`<article class="config-card"><h2>Não foi possível verificar</h2><p>${esc(e.message)}</p></article>`}finally{busy=false}
}
const nav=$("#radz-nav");
nav?.addEventListener('click',e=>{const b=e.target.closest('[data-section="infra"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();active=true;nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));const title=$("#section-title");if(title)title.textContent='Infraestrutura';load();},true);
nav?.addEventListener('click',e=>{if(!e.target.closest('[data-section="infra"]'))active=false});
$("#refresh")?.addEventListener('click',()=>{if(active)setTimeout(load,0)},true);
})();