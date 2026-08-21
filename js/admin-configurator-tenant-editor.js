(()=>{
  if(window.__RADZ_CONFIGURATOR_TENANT_EDITOR__)return;
  window.__RADZ_CONFIGURATOR_TENANT_EDITOR__=true;

  const IDS=['wave','prega-macho','cortina-varao','persiana'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const csrf=()=>window.ADMIN?.csrf||sessionStorage.getItem('salvatexAdminCsrf')||'';
  const activeId=()=>document.querySelector('.configurator-switch.active')?.dataset.configurator||'wave';
  let siteUi={productsTitle:'Produtos sob medida'};
  let siteUiLoaded=false;
  let mounting=false;
  let lastForm=null;

  async function req(url,opt={}){
    const headers={accept:'application/json',...(opt.headers||{})};
    if(opt.body!==undefined)headers['content-type']='application/json';
    const token=csrf();
    if(token&&!['GET','HEAD'].includes(String(opt.method||'GET').toUpperCase()))headers['x-csrf-token']=token;
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||`Falha (${r.status})`);
    return d;
  }

  const input=(key,label,value)=>`<label class="form-field"><span>${esc(label)}</span><input data-config-label="${esc(key)}" value="${esc(value)}"></label>`;
  const area=(key,label,value)=>`<label class="form-field full"><span>${esc(label)}</span><textarea data-config-label="${esc(key)}" rows="2">${esc(value)}</textarea></label>`;

  function updateSwitcherName(id,name){
    const strong=document.querySelector(`.configurator-switch[data-configurator="${CSS.escape(id)}"] strong`);
    if(strong&&String(name||'').trim())strong.textContent=String(name).trim();
  }

  function updateEditorTitle(name){
    const title=document.querySelector('#cfg-general-source > .panel .panel-head h2');
    if(title&&String(name||'').trim())title.textContent=String(name).trim();
  }

  function applyProductsTitle(){
    if(location.hash!=='#configurators')return;
    const value=String(siteUi.productsTitle||'Produtos sob medida').trim()||'Produtos sob medida';
    const title=[...document.querySelectorAll('#view-content h1,#view-content h2,#view-content h3')].find(el=>el.textContent.trim()==='Produtos sob medida'||el.dataset.radzProductsTitle==='1');
    if(title){title.dataset.radzProductsTitle='1';title.textContent=value;}
  }

  async function loadSiteUi(){
    if(siteUiLoaded)return;
    try{
      const d=await req('/admin/api/config');
      siteUi={productsTitle:String(d.config?.configuratorUi?.productsTitle||'Produtos sob medida')};
    }catch{}
    siteUiLoaded=true;
  }

  function mountCompanyUi(){
    const picker=document.getElementById('configurator-switcher')?.parentElement;
    if(!picker||picker.querySelector('[data-radz-configurator-ui]'))return;
    const box=document.createElement('div');
    box.dataset.radzConfiguratorUi='1';
    box.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid var(--border,#e4e7ec)';
    box.innerHTML=`<div class="form-field"><label>Nome da seção no painel</label><input data-products-title value="${esc(siteUi.productsTitle)}" placeholder="Produtos sob medida"><small class="field-hint">Ex.: Produtos sob medida, Personalizados, Monte seu produto.</small></div><button type="button" class="ghost-btn" data-save-products-title style="margin-top:8px">Salvar nome da seção</button><small data-products-result class="upload-status"></small>`;
    picker.appendChild(box);
    const inp=box.querySelector('[data-products-title]'),out=box.querySelector('[data-products-result]');
    inp.addEventListener('input',()=>{siteUi.productsTitle=inp.value;applyProductsTitle();});
    box.querySelector('[data-save-products-title]').onclick=async()=>{
      try{
        const value=inp.value.trim()||'Produtos sob medida';
        const d=await req('/admin/api/config');
        const current=d.config||{};
        await req('/admin/api/config',{method:'PUT',body:JSON.stringify({config:{...current,configuratorUi:{...(current.configuratorUi||{}),productsTitle:value}}})});
        siteUi.productsTitle=value;applyProductsTitle();out.style.color='#16794b';out.textContent='Nome salvo.';
      }catch(e){out.style.color='#b42318';out.textContent=e.message;}
    };
  }

  async function hydrateSwitcherNames(){
    if(location.hash!=='#configurators')return;
    await Promise.all(IDS.map(async id=>{
      try{const d=await req('/admin/api/configurators/'+encodeURIComponent(id));const cfg=d.configurator||d.wave||{};updateSwitcherName(id,cfg.nome);}catch{}
    }));
  }

  function bindLiveName(form,id){
    if(form.dataset.radzNameSync==='1')return;
    form.dataset.radzNameSync='1';
    const nameInput=form.querySelector('input[name="nome"]');
    if(!nameInput)return;
    const sync=()=>{const name=nameInput.value.trim()||'Sem nome';updateSwitcherName(id,name);updateEditorTitle(name);};
    nameInput.addEventListener('input',sync);
  }

  function applySecondaryLabel(form,value){
    value=String(value||'Produto secundário').trim()||'Produto secundário';
    const tab=form.querySelector('.cfg-option-tab[data-option-tab="trilhos-varoes"] span');if(tab)tab.textContent=value;
    const pageRoot=form.querySelector('.cfg-option-page[data-option-page="trilhos-varoes"]');
    const page=pageRoot?.querySelector('h2');if(page)page.textContent=value;
    const help=pageRoot?.querySelector('.panel-head p');if(help)help.textContent='Cadastre e gerencie os itens complementares disponíveis neste configurador.';
    const section=form.querySelector('#cfg-trilhos-section .panel-head h2');if(section)section.textContent='Cadastro de '+value.toLowerCase();
    form.dataset.radzSecondaryReady='1';
  }

  async function mountLabels(form,id){
    form.querySelectorAll('[data-radz-config-labels]').forEach((el,i)=>{if(i>0)el.remove();});
    if(form.querySelector(`[data-radz-config-labels="${CSS.escape(id)}"]`))return;
    const d=await req('/admin/api/configurators/'+encodeURIComponent(id));
    if(location.hash!=='#configurators'||document.getElementById('cfg-form')!==form||activeId()!==id)return;
    const cfg=d.configurator||d.wave||{},l=cfg.labels||{};
    updateSwitcherName(id,cfg.nome);
    const section=document.createElement('section');
    section.className='panel configurator-section';
    section.dataset.radzConfigLabels=id;
    section.innerHTML=`<div class="panel-head"><div><h2>Textos e estrutura visual</h2><p>Personalize os textos deste configurador sem alterar os dados das outras empresas.</p></div></div><div class="form-grid">${input('kicker','Texto superior',l.kicker||'CONFIGURADOR')}${input('pageTitle','Título da página',l.pageTitle||cfg.nome||'Configure seu produto')}${area('pageDescription','Descrição da página',l.pageDescription||cfg.descricao||'')}${input('formTitle','Título do formulário',l.formTitle||'Configure seu produto')}${area('formSubtitle','Texto abaixo do título',l.formSubtitle||'')}${input('step1','Etapa 1',l.step1||'Produto')}${input('step2','Etapa 2',l.step2||'Material')}${input('step3','Etapa 3',l.step3||'Opção')}${input('step4','Etapa 4',l.step4||'Acabamento')}${input('step5','Etapa 5',l.step5||'Resumo')}${input('widthLabel','Campo largura',l.widthLabel||'Largura')}${input('heightLabel','Campo altura',l.heightLabel||'Altura')}${input('modelLabel','Título modelo',l.modelLabel||'Modelo')}${input('fabricLabel','Título material',l.fabricLabel||'Material')}${input('liningLabel','Título opção/forro',l.liningLabel||'Opção')}${input('colorLabel','Título cor',l.colorLabel||'Cor')}${input('trackLabel','Título do acabamento no site',l.trackLabel||'Acabamento')}${input('secondaryProductLabel','Nome de trilhos/varões ou produto secundário',l.secondaryProductLabel||'Produto secundário')}${input('noFinishOption','Texto para não incluir acabamento',l.noFinishOption||'Não quero trilho ou varão')}${input('summaryTitle','Título do resumo',l.summaryTitle||'Resumo')}${input('addToCartLabel','Botão do carrinho',l.addToCartLabel||'Adicionar ao carrinho')}</div><div class="form-actions"><button type="button" class="primary-btn" data-save-config-labels>Salvar textos</button><span data-config-label-result style="font-size:12px;font-weight:700"></span></div>`;
    const general=document.getElementById('cfg-general-source');
    const first=general?.querySelector(':scope > .panel');
    if(first)first.insertAdjacentElement('afterend',section);else (general||form).appendChild(section);
    const secondary=section.querySelector('[data-config-label="secondaryProductLabel"]');
    applySecondaryLabel(form,secondary?.value);
    secondary?.addEventListener('input',()=>applySecondaryLabel(form,secondary.value));
    section.querySelector('[data-save-config-labels]').onclick=async()=>{
      const btn=section.querySelector('[data-save-config-labels]'),out=section.querySelector('[data-config-label-result]');
      btn.disabled=true;out.textContent='Salvando…';
      try{
        const latest=await req('/admin/api/configurators/'+encodeURIComponent(id));
        const current=latest.configurator||latest.wave||{};
        const labels={...(current.labels||{})};
        section.querySelectorAll('[data-config-label]').forEach(el=>labels[el.dataset.configLabel]=el.value.trim());
        const nome=form.querySelector('input[name="nome"]')?.value.trim()||current.nome;
        const payload={...current,nome,labels};
        const body=id==='wave'?{wave:payload}:{configurator:payload};
        const saved=await req('/admin/api/configurators/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(body)});
        const next=saved.configurator||saved.wave||payload;
        updateSwitcherName(id,next.nome||nome);updateEditorTitle(next.nome||nome);applySecondaryLabel(form,next.labels?.secondaryProductLabel||labels.secondaryProductLabel);
        out.style.color='#16794b';out.textContent='Textos salvos.';
      }catch(e){out.style.color='#b42318';out.textContent=e.message;}
      finally{btn.disabled=false;}
    };
  }

  async function mount(){
    if(location.hash!=='#configurators'||mounting)return;
    const form=document.getElementById('cfg-form');
    if(!form)return;
    if(lastForm===form&&form.dataset.radzTenantReady==='1')return;
    mounting=true;
    try{
      await loadSiteUi();
      if(document.getElementById('cfg-form')!==form)return;
      mountCompanyUi();applyProductsTitle();
      const id=activeId();
      bindLiveName(form,id);
      await mountLabels(form,id);
      form.dataset.radzTenantReady='1';
      lastForm=form;
    }catch(e){console.warn('[RADZ configurator editor]',e)}
    finally{mounting=false;}
  }

  function scheduleMount(delay=120){setTimeout(()=>{if(location.hash==='#configurators')mount();},delay);}
  window.addEventListener('hashchange',()=>{lastForm=null;scheduleMount(180);if(location.hash==='#configurators')setTimeout(hydrateSwitcherNames,220);});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.configurator-switch')){lastForm=null;scheduleMount(180);}
    if(e.target.closest?.('#refresh-view')){lastForm=null;scheduleMount(220);}
  });
  scheduleMount(250);
  if(location.hash==='#configurators')setTimeout(hydrateSwitcherNames,300);
})();
