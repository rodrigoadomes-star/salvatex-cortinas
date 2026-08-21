(()=>{
  if(window.__RADZ_CONFIGURATOR_TENANT_EDITOR__)return;
  window.__RADZ_CONFIGURATOR_TENANT_EDITOR__=true;

  const IDS=['wave','prega-macho','cortina-varao','persiana'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const csrf=()=>window.ADMIN?.csrf||sessionStorage.getItem('salvatexAdminCsrf')||'';
  const loadingLabels=new Set();
  let siteUiLoaded=false,siteUiLoading=false,siteUi={productsTitle:'Produtos sob medida'};
  let currentSecondaryLabel='Produto secundário';

  async function req(url,opt={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers:{accept:'application/json','content-type':'application/json','x-csrf-token':csrf(),...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`Falha (${r.status})`);return d;}
  const input=(key,label,value)=>`<label class="form-field"><span>${esc(label)}</span><input data-config-label="${esc(key)}" value="${esc(value)}"></label>`;
  const area=(key,label,value)=>`<label class="form-field full"><span>${esc(label)}</span><textarea data-config-label="${esc(key)}" rows="2">${esc(value)}</textarea></label>`;

  function activeId(){return document.querySelector('.configurator-switch.active')?.dataset.configurator||'wave';}
  function updateSwitcherName(id,name){const strong=document.querySelector(`.configurator-switch[data-configurator="${CSS.escape(id)}"] strong`);if(strong&&String(name||'').trim())strong.textContent=String(name).trim();}
  function updateEditorTitle(name){const title=document.querySelector('#cfg-general-source .panel-head h2');if(title&&String(name||'').trim())title.textContent=String(name).trim();}

  function findByText(root,selector,text){return [...(root||document).querySelectorAll(selector)].find(el=>el.textContent.trim()===text)||null;}
  function applyProductsTitle(){
    if(location.hash!=='#configurators')return;
    const root=document.getElementById('view-content');if(!root)return;
    const value=String(siteUi.productsTitle||'Produtos sob medida').trim()||'Produtos sob medida';
    let title=root.querySelector('[data-radz-products-title]');
    if(!title)title=findByText(root,'h1,h2,h3,strong','Produtos sob medida');
    if(title){title.dataset.radzProductsTitle='1';title.textContent=value;}
  }
  function applySecondaryLabel(){
    if(location.hash!=='#configurators')return;
    const root=document.getElementById('cfg-form');if(!root)return;
    const value=String(currentSecondaryLabel||'Produto secundário').trim()||'Produto secundário';
    const tab=root.querySelector('.cfg-option-tab[data-option-tab="trilhos-varoes"] span');if(tab)tab.textContent=value;
    const page=root.querySelector('.cfg-option-page[data-option-page="trilhos-varoes"] h2');if(page)page.textContent=value;
    const section=root.querySelector('#cfg-trilhos-section .panel-head h2');if(section)section.textContent='Cadastro de '+value.toLowerCase();
  }

  async function loadSiteUi(){
    if(siteUiLoaded||siteUiLoading)return;
    siteUiLoading=true;
    try{const d=await req('/admin/api/config');siteUi={productsTitle:String(d.config?.configuratorUi?.productsTitle||'Produtos sob medida')};siteUiLoaded=true;applyProductsTitle();}
    catch{}finally{siteUiLoading=false;}
  }

  function mountCompanyUi(){
    if(location.hash!=='#configurators')return;
    const root=document.getElementById('view-content');if(!root||root.querySelector('[data-radz-configurator-ui]'))return;
    const picker=document.getElementById('configurator-switcher')?.parentElement;
    if(!picker)return;
    const box=document.createElement('div');box.className='configurator-ui-edit';box.dataset.radzConfiguratorUi='1';box.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid var(--border,#e4e7ec)';
    box.innerHTML=`<div class="form-field"><label>Nome da seção no painel</label><input data-products-title value="${esc(siteUi.productsTitle||'Produtos sob medida')}" placeholder="Produtos sob medida"><small class="field-hint">Ex.: Produtos sob medida, Personalizados, Monte seu produto.</small></div><button type="button" class="ghost-btn" data-save-products-title style="margin-top:8px">Salvar nome da seção</button><small data-products-result class="upload-status"></small>`;
    picker.appendChild(box);
    const inp=box.querySelector('[data-products-title]');
    inp.addEventListener('input',()=>{siteUi.productsTitle=inp.value;applyProductsTitle();});
    box.querySelector('[data-save-products-title]').onclick=async()=>{const result=box.querySelector('[data-products-result]');try{const value=inp.value.trim()||'Produtos sob medida';const d=await req('/admin/api/config');const config=d.config||{};config.configuratorUi={...(config.configuratorUi||{}),productsTitle:value};await req('/admin/api/config',{method:'PUT',body:JSON.stringify({config:{configuratorUi:config.configuratorUi}})});siteUi.productsTitle=value;result.style.color='#16794b';result.textContent='Nome salvo para esta empresa.';applyProductsTitle();}catch(e){result.style.color='#b42318';result.textContent=e.message;}};
  }

  async function hydrateSwitcherNames(){if(location.hash!=='#configurators'||!document.querySelector('#configurator-switcher'))return;await Promise.all(IDS.map(async id=>{try{const d=await req('/admin/api/configurators/'+encodeURIComponent(id));const cfg=d.configurator||d.wave||{};updateSwitcherName(id,cfg.nome);}catch{}}));}
  function bindLiveName(){if(location.hash!=='#configurators')return;const form=document.getElementById('cfg-form');if(!form||form.dataset.radzNameSync==='1')return;form.dataset.radzNameSync='1';const nameInput=form.querySelector('input[name="nome"]');if(!nameInput)return;const sync=()=>{const name=nameInput.value.trim()||'Sem nome';updateSwitcherName(activeId(),name);updateEditorTitle(name);};nameInput.addEventListener('input',sync);nameInput.addEventListener('change',sync);}

  async function mountLabels(){
    if(location.hash!=='#configurators')return;
    const form=document.getElementById('cfg-form');if(!form)return;
    const id=activeId();
    if(form.querySelector(`[data-radz-config-labels="${CSS.escape(id)}"]`)||loadingLabels.has(id))return;
    loadingLabels.add(id);
    // Marca o formulário antes do await: impede corridas do MutationObserver criarem várias seções.
    form.dataset.radzLabelsLoading=id;
    try{
      form.querySelectorAll('[data-radz-config-labels]').forEach(x=>x.remove());
      const d=await req('/admin/api/configurators/'+encodeURIComponent(id));
      if(!document.body.contains(form)||activeId()!==id)return;
      const cfg=d.configurator||d.wave||{};updateSwitcherName(id,cfg.nome);
      const l=cfg.labels||{};currentSecondaryLabel=l.secondaryProductLabel||'Produto secundário';
      const section=document.createElement('section');section.className='panel configurator-section';section.dataset.radzConfigLabels=id;
      section.innerHTML=`<div class="panel-head"><div><h2>Textos e estrutura visual</h2><p>Estes textos pertencem somente a esta empresa e a este configurador. Preços, materiais, fotos e opções continuam separados abaixo.</p></div></div><div class="form-grid">${input('kicker','Texto superior',l.kicker||'CONFIGURADOR')}${input('pageTitle','Título da página',l.pageTitle||cfg.nome||'Configure seu produto')}${area('pageDescription','Descrição da página',l.pageDescription||cfg.descricao||'')}${input('formTitle','Título do formulário',l.formTitle||'Configure seu produto')}${area('formSubtitle','Texto abaixo do título',l.formSubtitle||'')}${input('step1','Etapa 1',l.step1||'Produto')}${input('step2','Etapa 2',l.step2||'Material')}${input('step3','Etapa 3',l.step3||'Opção')}${input('step4','Etapa 4',l.step4||'Acabamento')}${input('step5','Etapa 5',l.step5||'Resumo')}${input('widthLabel','Campo largura',l.widthLabel||'Largura')}${input('heightLabel','Campo altura',l.heightLabel||'Altura')}${input('modelLabel','Título modelo',l.modelLabel||'Modelo')}${input('fabricLabel','Título material',l.fabricLabel||'Material')}${input('liningLabel','Título opção/forro',l.liningLabel||'Opção')}${input('colorLabel','Título cor',l.colorLabel||'Cor')}${input('trackLabel','Título do acabamento no site',l.trackLabel||'Acabamento')}${input('secondaryProductLabel','Nome da classe de produto secundário',l.secondaryProductLabel||'Produto secundário')}${input('summaryTitle','Título do resumo',l.summaryTitle||'Resumo')}${input('addToCartLabel','Botão do carrinho',l.addToCartLabel||'Adicionar ao carrinho')}</div><div class="form-actions" style="justify-content:space-between;gap:12px;flex-wrap:wrap"><button type="button" class="primary-btn" data-save-config-labels>Salvar textos do configurador</button><button type="button" class="ghost-btn" data-reset-config-tenant>Redefinir este configurador</button></div><div data-config-label-result style="font-size:12px;font-weight:700"></div>`;
      const general=document.getElementById('cfg-general-source');const actions=general?.querySelector(':scope > .form-actions');if(actions)general.insertBefore(section,actions);else (general||form).appendChild(section);
      const secondaryInput=section.querySelector('[data-config-label="secondaryProductLabel"]');secondaryInput?.addEventListener('input',()=>{currentSecondaryLabel=secondaryInput.value;applySecondaryLabel();});
      section.querySelector('[data-save-config-labels]').onclick=async()=>{const result=section.querySelector('[data-config-label-result]');try{const latest=await req('/admin/api/configurators/'+encodeURIComponent(id)),current=latest.configurator||latest.wave||{},labels={...(current.labels||{})};section.querySelectorAll('[data-config-label]').forEach(el=>labels[el.dataset.configLabel]=el.value.trim());const nameInput=form.querySelector('input[name="nome"]');const nome=nameInput?.value.trim()||current.nome;const body=id==='wave'?{wave:{...current,nome,labels}}:{configurator:{...current,nome,labels}};const saved=await req('/admin/api/configurators/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(body)});const cfgSaved=saved.configurator||saved.wave||{};currentSecondaryLabel=cfgSaved.labels?.secondaryProductLabel||labels.secondaryProductLabel||'Produto secundário';updateSwitcherName(id,cfgSaved.nome||nome);updateEditorTitle(cfgSaved.nome||nome);applySecondaryLabel();result.style.color='#16794b';result.textContent='Textos salvos somente para esta empresa.';}catch(e){result.style.color='#b42318';result.textContent=e.message;}};
      section.querySelector('[data-reset-config-tenant]').onclick=async()=>{if(!confirm('Redefinir apenas este configurador desta empresa? Isso remove preços, materiais, fotos e opções cadastradas nele.'))return;const result=section.querySelector('[data-config-label-result]');try{await req('/admin/api/configurators/'+encodeURIComponent(id),{method:'DELETE'});result.style.color='#16794b';result.textContent='Configurador desta empresa redefinido. Recarregando…';setTimeout(()=>document.getElementById('refresh-view')?.click(),450);}catch(e){result.style.color='#b42318';result.textContent=e.message;}};
      applySecondaryLabel();
    }catch{}finally{loadingLabels.delete(id);if(form.dataset.radzLabelsLoading===id)delete form.dataset.radzLabelsLoading;}
  }

  function mount(){if(location.hash!=='#configurators')return;loadSiteUi().then(()=>{mountCompanyUi();applyProductsTitle();});bindLiveName();mountLabels();hydrateSwitcherNames();applySecondaryLabel();}
  let timer=0;const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(mount,80)});obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(mount,80));
  document.addEventListener('click',e=>{if(e.target.closest?.('.configurator-switch,.cfg-option-tab'))setTimeout(()=>{mount();applySecondaryLabel();},120);});
  setTimeout(mount,120);
})();
