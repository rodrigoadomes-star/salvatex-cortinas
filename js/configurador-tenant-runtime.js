(()=>{
  /*
    A Salvatex é o protótipo legado e já possui um configurador próprio,
    completo e validado. A camada tenant abaixo existe apenas para lojas
    genéricas/multiempresa e NÃO pode reescrever estado, resumo ou opções
    da Salvatex.
  */
  const host=String(location.hostname||'').toLowerCase();
  if(host==='salvatex.radzhub.com.br'||host.startsWith('salvatex.')){
    document.documentElement.dataset.tenantConfiguratorRuntime='legacy-salvatex';
    return;
  }

  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const txt=v=>String(v??'').trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hideBlock=el=>{if(!el)return;el.style.display='none';const title=el.previousElementSibling;if(title?.classList.contains('choice-title'))title.style.display='none'};
  const showBlock=el=>{if(!el)return;el.style.display='';const title=el.previousElementSibling;if(title?.classList.contains('choice-title'))title.style.display=''};
  async function j(url){const r=await fetch(url,{cache:'no-store',credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error('Falha '+r.status);return d}
  function pageHref(p){const t=String(p?.pageType||'');if(t==='configurador_wave')return'/configurador?id=wave';if(t==='configurador_prega_macho')return'/configurador?id=prega-macho';if(t==='configurador_ilhos')return'/configurador?id=cortina-varao';if(t==='configurador_persiana')return'/configurador-persiana?id=persiana';if(t==='link'&&p.externalUrl)return p.externalUrl;return`/pagina.html?slug=${encodeURIComponent(p.slug||'')}`}
  function firstActiveTissue(){return Object.entries(window.CONFIG?.configuradorTecidos||{}).find(([,t])=>t&&t.ativo!==false&&Array.isArray(t.cores)&&t.cores.length&&Object.keys(t.forros||{}).length)?.[0]||Object.entries(window.CONFIG?.configuradorTecidos||{}).find(([,t])=>t&&t.ativo!==false)?.[0]||''}
  function activeColors(t){const x=window.CONFIG?.configuradorTecidos?.[t]||{};return(Array.isArray(x.cores)?x.cores:[]).filter(c=>x.coresAtivas?.[c]!==false)}
  function activeForros(t){return Object.keys(window.CONFIG?.configuradorTecidos?.[t]?.forros||{}).filter(Boolean)}
  function card(name,desc,selected=false){return`<div class="card${selected?' selected':''}" data-value="${esc(name)}"><strong>${esc(name)}</strong>${desc?`<span>${esc(desc)}</span>`:''}</div>`}
  function setState(key,value){if(window.state&&typeof window.state==='object')window.state[key]=value}
  function clearStaleState(){['modelo','tecido','cor','forro'].forEach(k=>setState(k,''));setState('trilho','Não')}
  function showEmptySummary(){
    const summary=$('.summary');if(!summary)return;
    summary.innerHTML='<div id="tenant-summary-empty" class="empty" style="margin:24px">Nenhum produto disponível neste configurador no momento.</div>';
  }
  function render(){
    const c=window.CONFIG||{},cfg=c.configurador||{},tissues=c.configuradorTecidos||{};
    const modelBox=$('#modelos'),tissueBox=$('#tecidos-choice'),colorBox=$('#cores-choice'),liningBox=$('#forros'),track=$('#trilho-select');
    const tissueNames=Object.entries(tissues).filter(([,t])=>t&&t.ativo!==false).map(([n])=>n);
    const noProducts=!tissueNames.length;
    if(noProducts){
      clearStaleState();
      [modelBox,tissueBox,colorBox,liningBox].forEach(el=>{if(el){el.innerHTML='';hideBlock(el)}});
      const know=$('#conhecer-cor');if(know)know.style.display='none';
      const next=$('.next');if(next)next.style.display='none';
      const buy=$('#comprar');if(buy)buy.style.display='none';
      const wa=$('#whatsapp');if(wa)wa.style.display='none';
      const builder=$('.builder');if(builder){builder.classList.add('configurator-empty');let empty=$('#tenant-config-empty');if(!empty){empty=document.createElement('div');empty.id='tenant-config-empty';empty.className='empty';empty.textContent='Nenhum produto disponível neste configurador no momento.';builder.appendChild(empty)}empty.style.display=''}
      showEmptySummary();
      document.documentElement.dataset.tenantConfiguratorRuntime='1';
      return;
    }
    const model=txt(cfg.modelo||cfg.nome);
    if(modelBox){if(model){modelBox.innerHTML=card(model,txt(cfg.descricao)||'Modelo configurado no Painel Admin.',true);showBlock(modelBox);setState('modelo',model)}else{modelBox.innerHTML='';hideBlock(modelBox);setState('modelo','')}}
    if(tissueBox){const selected=tissueNames.includes(window.state?.tecido)?window.state.tecido:(firstActiveTissue()||tissueNames[0]);tissueBox.innerHTML=tissueNames.map(n=>card(n,txt(tissues[n]?.descricao),n===selected)).join('');showBlock(tissueBox);setState('tecido',selected)}
    const selectedTissue=window.state?.tecido||firstActiveTissue(),colors=activeColors(selectedTissue);
    if(colorBox){if(colors.length){const selected=colors.includes(window.state?.cor)?window.state.cor:colors[0];colorBox.innerHTML=colors.map(n=>card(n,'',n===selected)).join('');showBlock(colorBox);setState('cor',selected)}else{colorBox.innerHTML='';hideBlock(colorBox);setState('cor','')}}
    const know=$('#conhecer-cor');if(know)know.style.display=colors.length?'':'none';
    const linings=activeForros(selectedTissue);
    if(liningBox){if(linings.length){const selected=linings.includes(window.state?.forro)?window.state.forro:linings[0],desc=tissues[selectedTissue]?.forroDescricoes||{};liningBox.innerHTML=linings.map(n=>card(n,txt(desc[n]),n===selected)).join('');showBlock(liningBox);setState('forro',selected)}else{liningBox.innerHTML='';hideBlock(liningBox);setState('forro','')}}
    if(track){const entries=Object.entries(c.instalacao||{}),noFinish=txt(cfg.labels?.noFinishOption)||'Não quero trilho ou varão';track.innerHTML='<option value="" disabled selected>Selecione...</option><option value="Não">'+esc(noFinish)+'</option>'+entries.map(([n])=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');const wrap=track.closest('.trilho-select-wrapper'),desc=wrap?.previousElementSibling,title=desc?.previousElementSibling;if(entries.length){if(wrap)wrap.style.display='';if(desc?.classList.contains('trilho-descricao'))desc.style.display='';if(title?.classList.contains('choice-title'))title.style.display=''}else{if(wrap)wrap.style.display='none';if(desc?.classList.contains('trilho-descricao'))desc.style.display='none';if(title?.classList.contains('choice-title'))title.style.display='none';setState('trilho','Não')}}
    const builder=$('.builder');if(builder){builder.classList.remove('configurator-empty');const empty=$('#tenant-config-empty');if(empty)empty.style.display='none'}
    document.documentElement.dataset.tenantConfiguratorRuntime='1'
  }
  async function applyTenantIdentity(){
    try{
      const [sc,ly,pages]=await Promise.all([j('/api/store-config'),j('/api/layout'),j('/api/pages')]),config=sc.config||{},layout=ly.layout||{};
      const name=txt(config.storeName||config.name||config.tradeName||location.hostname.split('.')[0]||'Loja'),logoUrl=layout?.branding?.logo||config.logo||'';
      document.title=`${name} — Configurador`;
      document.querySelectorAll('.logo').forEach(logo=>{logo.href='/';if(logoUrl)logo.innerHTML=`<img src="${esc(logoUrl)}" alt="${esc(name)}" style="display:block;max-height:46px;max-width:200px;object-fit:contain">`;else{logo.innerHTML='';logo.append(document.createTextNode(name.toUpperCase()));const small=document.createElement('small');small.textContent='';logo.appendChild(small)}});
      const nav=$('.navlinks');if(nav){const list=(pages.pages||[]).filter(p=>['principal','cortinas_sob_medida','persianas_sob_medida','pronta_entrega'].includes(p.navGroup)).sort((a,b)=>(a.navOrder||100)-(b.navOrder||100));const contact=layout?.navigation?.contactLabel||layout?.header?.contactLabel||'Contato';nav.innerHTML=list.map(p=>`<a class="page-nav-link" href="${esc(pageHref(p))}">${esc(p.menuLabel||p.title)}</a>`).join('')+`<a href="/#contato">${esc(contact)}</a><a href="/minha-conta.html">Minha conta</a>`;nav.style.display='flex';nav.style.gap='22px';nav.style.alignItems='center'}
      const footer=$('footer .shell');if(footer)footer.textContent=`${name.toUpperCase()} · ${new Date().getFullYear()}`;
      const colors=layout?.branding?.colors||layout?.colors||{};if(colors.primary)document.documentElement.style.setProperty('--layout-primary',colors.primary);if(colors.accent)document.documentElement.style.setProperty('--layout-accent',colors.accent)
    }catch(e){console.error('[RADZ tenant identity]',e)}
  }
  function identity(){const layout=window.SALVATEX_LAYOUT;if(!layout)return;const media=$('.summary > h2');if(media&&layout.configuratorLabels?.mediaTitle)media.textContent=layout.configuratorLabels.mediaTitle}
  function run(){render();identity();applyTenantIdentity();if(Object.keys(window.CONFIG?.configuradorTecidos||{}).length)setTimeout(()=>{try{document.getElementById('recalcular')?.click()}catch{}},0)}
  Promise.resolve(window.CONFIG_READY).then(run).catch(run);
  window.addEventListener('salvatex:layout-ready',()=>{identity();render();applyTenantIdentity()});
  document.addEventListener('click',e=>{const card=e.target.closest('#tecidos-choice .card');if(!card)return;setTimeout(render,0)})
})();
