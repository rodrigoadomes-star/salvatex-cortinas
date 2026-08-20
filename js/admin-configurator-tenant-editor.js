(()=>{
  if(window.__RADZ_CONFIGURATOR_TENANT_EDITOR__)return;
  window.__RADZ_CONFIGURATOR_TENANT_EDITOR__=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const csrf=()=>window.ADMIN?.csrf||sessionStorage.getItem('salvatexAdminCsrf')||'';
  async function req(url,opt={}){
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers:{accept:'application/json','content-type':'application/json','x-csrf-token':csrf(),...(opt.headers||{})}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||`Falha (${r.status})`);
    return d;
  }
  const input=(key,label,value)=>`<label class="form-field"><span>${esc(label)}</span><input data-config-label="${esc(key)}" value="${esc(value)}"></label>`;
  const area=(key,label,value)=>`<label class="form-field full"><span>${esc(label)}</span><textarea data-config-label="${esc(key)}" rows="2">${esc(value)}</textarea></label>`;

  async function mount(){
    if(location.hash!=='#configurators')return;
    const form=document.getElementById('wave-form');
    if(!form||form.querySelector('[data-radz-config-labels]'))return;
    let cfg={};
    try{const d=await req('/admin/api/configurators/wave');cfg=d.wave||d.configurator||{};}catch{return}
    const l=cfg.labels||{};
    const section=document.createElement('section');
    section.className='panel configurator-section';
    section.dataset.radzConfigLabels='1';
    section.innerHTML=`<div class="panel-head"><div><h2>Textos e estrutura visual</h2><p>Estes textos pertencem somente a esta empresa. Preços, materiais, fotos e opções continuam separados abaixo.</p></div></div>
      <div class="form-grid">
        ${input('kicker','Texto superior',l.kicker||'CONFIGURADOR')}
        ${input('pageTitle','Título da página',l.pageTitle||cfg.nome||'Configure seu produto')}
        ${area('pageDescription','Descrição da página',l.pageDescription||cfg.descricao||'')}
        ${input('formTitle','Título do formulário',l.formTitle||'Configure seu produto')}
        ${area('formSubtitle','Texto abaixo do título',l.formSubtitle||'')}
        ${input('step1','Etapa 1',l.step1||'Produto')}${input('step2','Etapa 2',l.step2||'Material')}${input('step3','Etapa 3',l.step3||'Opção')}${input('step4','Etapa 4',l.step4||'Acabamento')}${input('step5','Etapa 5',l.step5||'Resumo')}
        ${input('widthLabel','Campo largura',l.widthLabel||'Largura')}${input('heightLabel','Campo altura',l.heightLabel||'Altura')}
        ${input('modelLabel','Título modelo',l.modelLabel||'Modelo')}${input('fabricLabel','Título material',l.fabricLabel||'Material')}${input('liningLabel','Título opção/forro',l.liningLabel||'Opção')}${input('colorLabel','Título cor',l.colorLabel||'Cor')}${input('trackLabel','Título acabamento',l.trackLabel||'Acabamento')}
        ${input('summaryTitle','Título do resumo',l.summaryTitle||'Resumo')}${input('addToCartLabel','Botão do carrinho',l.addToCartLabel||'Adicionar ao carrinho')}
      </div>
      <div class="form-actions" style="justify-content:space-between;gap:12px;flex-wrap:wrap"><button type="button" class="primary-btn" id="save-config-labels">Salvar textos do configurador</button><button type="button" class="ghost-btn" id="reset-config-tenant">Redefinir este configurador</button></div><div id="config-label-result" style="font-size:12px;font-weight:700"></div>`;
    const actions=form.querySelector('.form-actions');
    if(actions)form.insertBefore(section,actions);else form.appendChild(section);

    document.getElementById('save-config-labels').onclick=async()=>{
      const result=document.getElementById('config-label-result');
      try{
        const latest=await req('/admin/api/configurators/wave');
        const current=latest.wave||latest.configurator||{};
        const labels={...(current.labels||{})};
        section.querySelectorAll('[data-config-label]').forEach(el=>labels[el.dataset.configLabel]=el.value.trim());
        const saved=await req('/admin/api/configurators/wave',{method:'PUT',body:JSON.stringify({wave:{...current,labels}})});
        result.style.color='#16794b';result.textContent='Textos salvos somente para esta empresa.';
        window.ADMIN&&(window.ADMIN.cache.configuratorWave=saved.wave||saved.configurator);
      }catch(e){result.style.color='#b42318';result.textContent=e.message;}
    };

    document.getElementById('reset-config-tenant').onclick=async()=>{
      if(!confirm('Redefinir apenas o configurador desta empresa? Isso remove preços, materiais, fotos e opções cadastradas neste configurador.'))return;
      const result=document.getElementById('config-label-result');
      try{
        await req('/admin/api/configurators/wave',{method:'DELETE'});
        result.style.color='#16794b';result.textContent='Configurador desta empresa redefinido. Recarregando…';
        setTimeout(()=>document.getElementById('refresh-view')?.click(),500);
      }catch(e){result.style.color='#b42318';result.textContent=e.message;}
    };
  }

  const obs=new MutationObserver(()=>setTimeout(mount,30));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(mount,50));
  setTimeout(mount,100);
})();
