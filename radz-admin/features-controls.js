(()=>{
  const FEATURE_LABELS={catalog:'Catálogo',orders:'Pedidos',customers:'Clientes',site_builder:'Editor do site',platform_subdomain:'Subdomínio RADZ',configurator:'Configurador sob medida',ai_ads:'IA de anúncios',meta_ads:'Meta Ads',payments:'Pagamentos',shipping:'Fretes',reports:'Relatórios'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function getJson(url,opt={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers:{accept:'application/json','content-type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Falha ao carregar.');return d;}
  async function renderFeatureControls(){
    const content=document.querySelector('#section-content');if(!content)return;
    content.innerHTML='<div class="config-card"><h2>Carregando recursos…</h2></div>';
    try{
      const [companiesData,overview]=await Promise.all([getJson('/radz/api/companies'),getJson('/radz/api/overview')]);
      const companies=companiesData.companies||[],rows=overview.features||[];
      const map=new Map();for(const r of rows)map.set(`${r.company_id}:${r.feature_key}`,Number(r.enabled)===1);
      const keys=Object.keys(FEATURE_LABELS);
      content.innerHTML=`<div class="cards">${companies.map(c=>`<article class="config-card feature-company" data-company="${esc(c.id)}"><h2>${esc(c.trade_name||c.slug)}</h2><p>Libere apenas os módulos que esta empresa deve utilizar.</p><div class="feature-grid">${keys.map(k=>{const defaultOn=['catalog','orders','customers','site_builder','platform_subdomain'].includes(k);const on=map.has(`${c.id}:${k}`)?map.get(`${c.id}:${k}`):defaultOn;return `<label style="display:flex;justify-content:space-between;gap:18px;align-items:center;padding:9px 0;border-bottom:1px solid #e8edf3"><span>${esc(FEATURE_LABELS[k])}</span><input type="checkbox" data-feature="${k}" ${on?'checked':''}></label>`}).join('')}</div><p class="form-result" aria-live="polite"></p></article>`).join('')}</div>`;
      content.querySelectorAll('[data-feature]').forEach(input=>input.addEventListener('change',saveFeature));
    }catch(e){content.innerHTML=`<div class="config-card"><h2>Não foi possível carregar os recursos</h2><p>${esc(e.message)}</p></div>`}
  }
  async function saveFeature(e){
    const input=e.currentTarget,card=input.closest('[data-company]'),out=card.querySelector('.form-result');
    input.disabled=true;out.textContent='Salvando…';
    try{
      await getJson('/radz/api/features',{method:'PATCH',body:JSON.stringify({companyId:card.dataset.company,featureKey:input.dataset.feature,enabled:input.checked})});
      out.textContent=input.checked?'Recurso liberado.':'Recurso bloqueado.';
    }catch(err){input.checked=!input.checked;out.textContent=err.message}finally{input.disabled=false}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('#radz-nav [data-section="features"]');if(!b)return;setTimeout(renderFeatureControls,0)});
  window.RADZ_FEATURE_CONTROLS={render:renderFeatureControls};
})();
