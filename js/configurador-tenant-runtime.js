(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const txt=v=>String(v??'').trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hideBlock=el=>{if(!el)return; el.style.display='none'; const title=el.previousElementSibling; if(title?.classList.contains('choice-title'))title.style.display='none';};
  const showBlock=el=>{if(!el)return; el.style.display=''; const title=el.previousElementSibling; if(title?.classList.contains('choice-title'))title.style.display='';};
  function firstActiveTissue(){return Object.entries(window.CONFIG?.configuradorTecidos||{}).find(([,t])=>t&&t.ativo!==false&&Array.isArray(t.cores)&&t.cores.length&&Object.keys(t.forros||{}).length)?.[0]||Object.entries(window.CONFIG?.configuradorTecidos||{}).find(([,t])=>t&&t.ativo!==false)?.[0]||'';}
  function activeColors(t){const x=window.CONFIG?.configuradorTecidos?.[t]||{};return (Array.isArray(x.cores)?x.cores:[]).filter(c=>x.coresAtivas?.[c]!==false);}
  function activeForros(t){return Object.keys(window.CONFIG?.configuradorTecidos?.[t]?.forros||{}).filter(Boolean);}
  function card(name,desc,selected=false){return `<div class="card${selected?' selected':''}" data-value="${esc(name)}"><strong>${esc(name)}</strong>${desc?`<span>${esc(desc)}</span>`:''}</div>`;}
  function setState(key,value){if(window.state&&typeof window.state==='object')window.state[key]=value;}
  function render(){
    const c=window.CONFIG||{}, cfg=c.configurador||{}, tissues=c.configuradorTecidos||{};
    const modelBox=$('#modelos'), tissueBox=$('#tecidos-choice'), colorBox=$('#cores-choice'), liningBox=$('#forros'), track=$('#trilho-select');
    const tissueNames=Object.entries(tissues).filter(([,t])=>t&&t.ativo!==false).map(([n])=>n);
    const model=txt(cfg.modelo||cfg.nome);
    if(modelBox){ if(model){modelBox.innerHTML=card(model,txt(cfg.descricao)||'Modelo configurado no Painel Admin.',true);showBlock(modelBox);setState('modelo',model);} else {modelBox.innerHTML='';hideBlock(modelBox);} }
    if(tissueBox){
      if(tissueNames.length){const selected=tissueNames.includes(window.state?.tecido)?window.state.tecido:(firstActiveTissue()||tissueNames[0]); tissueBox.innerHTML=tissueNames.map(n=>card(n,txt(tissues[n]?.descricao),n===selected)).join('');showBlock(tissueBox);setState('tecido',selected);}
      else {tissueBox.innerHTML='';hideBlock(tissueBox);setState('tecido','');}
    }
    const selectedTissue=window.state?.tecido||firstActiveTissue();
    const colors=activeColors(selectedTissue);
    if(colorBox){if(colors.length){const selected=colors.includes(window.state?.cor)?window.state.cor:colors[0];colorBox.innerHTML=colors.map(n=>card(n,'',n===selected)).join('');showBlock(colorBox);setState('cor',selected);}else{colorBox.innerHTML='';hideBlock(colorBox);setState('cor','');}}
    const know=$('#conhecer-cor'); if(know)know.style.display=colors.length?'':'none';
    const linings=activeForros(selectedTissue);
    if(liningBox){if(linings.length){const selected=linings.includes(window.state?.forro)?window.state.forro:linings[0];const desc=tissues[selectedTissue]?.forroDescricoes||{};liningBox.innerHTML=linings.map(n=>card(n,txt(desc[n]),n===selected)).join('');showBlock(liningBox);setState('forro',selected);}else{liningBox.innerHTML='';hideBlock(liningBox);setState('forro','');}}
    if(track){const entries=Object.entries(c.instalacao||{});track.innerHTML='<option value="" disabled selected>Selecione...</option><option value="Não">Não quero incluir acabamento</option>'+entries.map(([n])=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');const wrap=track.closest('.trilho-select-wrapper');const desc=wrap?.previousElementSibling;if(entries.length){if(wrap)wrap.style.display='';if(desc?.classList.contains('trilho-descricao'))desc.style.display='';const title=desc?.previousElementSibling;if(title?.classList.contains('choice-title'))title.style.display='';}else{if(wrap)wrap.style.display='none';if(desc?.classList.contains('trilho-descricao'))desc.style.display='none';const title=desc?.previousElementSibling;if(title?.classList.contains('choice-title'))title.style.display='none';setState('trilho','Não');}}
    const noProducts=!tissueNames.length;
    const builder=$('.builder'); if(builder)builder.classList.toggle('configurator-empty',noProducts);
    let empty=$('#tenant-config-empty'); if(noProducts&&!empty&&builder){empty=document.createElement('div');empty.id='tenant-config-empty';empty.className='empty';empty.textContent='Nenhum produto disponível neste configurador no momento.';builder.appendChild(empty);} if(empty)empty.style.display=noProducts?'':'none';
    if(noProducts){['#cores-choice','#forros','#modelos','#tecidos-choice'].forEach(s=>hideBlock($(s))); const next=$('.next');if(next)next.style.display='none';const buy=$('#comprar');if(buy)buy.style.display='none';}
    document.documentElement.dataset.tenantConfiguratorRuntime='1';
  }
  function identity(){const layout=window.SALVATEX_LAYOUT;if(!layout)return;const media=$('.summary > h2');if(media&&layout.configuratorLabels?.mediaTitle)media.textContent=layout.configuratorLabels.mediaTitle;}
  function run(){render();identity();setTimeout(()=>{try{document.getElementById('recalcular')?.click()}catch{}},0);}
  Promise.resolve(window.CONFIG_READY).then(run).catch(run);
  window.addEventListener('salvatex:layout-ready',()=>{identity();render()});
  document.addEventListener('click',e=>{const card=e.target.closest('#tecidos-choice .card');if(!card)return;setTimeout(render,0);});
})();
