(()=>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
let active=false,busy=false;
function badge(ok){return `<span class="status ${ok?"active":"disabled"}">${ok?"OK":"Faltando"}</span>`}
function rows(items){return Object.entries(items||{}).map(([name,ok])=>`<tr><td><strong>${esc(name)}</strong></td><td>${badge(ok)}</td></tr>`).join("")}
async function load(){
 if(!active||busy)return;busy=true;
 const content=$("#section-content");if(content)content.innerHTML='<article class="config-card"><h2>Infraestrutura</h2><p>Verificando ambiente Cloudflare…</p></article>';
 try{
  const r=await fetch('/radz/api/health',{credentials:'same-origin',headers:{accept:'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.code||`Falha (${r.status})`);
  content.innerHTML=`<div class="cards"><article class="config-card"><h2>Runtime principal</h2><p><span class="status ${d.ready?"active":"trial"}">${d.ready?"Pronto para unificação":"Configuração incompleta"}</span></p><p>A RADZ HUB é o runtime principal. Esta verificação mostra apenas se cada binding/variável existe; nenhum valor secreto é exibido.</p>${d.missing?.length?`<p class="form-result"><strong>Faltando:</strong><br>${d.missing.map(esc).join('<br>')}</p>`:'<p class="form-result"><strong>Ambiente completo para os itens monitorados.</strong></p>'}</article><article class="config-card"><h2>Bindings</h2><div class="table-wrap"><table><thead><tr><th>Binding</th><th>Status</th></tr></thead><tbody>${rows(d.checks?.bindings)}</tbody></table></div></article></div><div class="cards"><article class="config-card"><h2>RADZ HUB</h2><div class="table-wrap"><table><thead><tr><th>Variável</th><th>Status</th></tr></thead><tbody>${rows(d.checks?.radz)}</tbody></table></div></article><article class="config-card"><h2>Compatibilidade Salvatex</h2><p>Esses itens são temporariamente necessários enquanto a loja antiga é absorvida pela plataforma principal.</p><div class="table-wrap"><table><thead><tr><th>Variável</th><th>Status</th></tr></thead><tbody>${rows(d.checks?.salvatex_legacy_runtime)}</tbody></table></div></article></div>`;
 }catch(e){if(content)content.innerHTML=`<article class="config-card"><h2>Não foi possível verificar</h2><p>${esc(e.message)}</p></article>`}finally{busy=false}
}
const nav=$("#radz-nav");
nav?.addEventListener('click',e=>{const b=e.target.closest('[data-section="infra"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();active=true;nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));const title=$("#section-title");if(title)title.textContent='Infraestrutura';load();},true);
nav?.addEventListener('click',e=>{if(!e.target.closest('[data-section="infra"]'))active=false});
$("#refresh")?.addEventListener('click',()=>{if(active)setTimeout(load,0)},true);
})();
