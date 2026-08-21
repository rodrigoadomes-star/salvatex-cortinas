(()=>{
  if(window.__RADZ_DYNAMIC_CONFIGURATORS__)return;
  window.__RADZ_DYNAMIC_CONFIGURATORS__=true;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const csrf=()=>window.ADMIN?.csrf||sessionStorage.getItem('salvatexAdminCsrf')||'';
  async function req(url,opt={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers:{accept:'application/json','content-type':'application/json','x-csrf-token':csrf(),...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`Falha (${r.status})`);return d;}
  function iconFor(c){if(c.icon)return c.icon;return c.tipo==='persiana'?'▤':'◇';}
  function ensureType(c){try{if(typeof CONFIGURATOR_TYPES!=='undefined'&&!CONFIGURATOR_TYPES.some(x=>x.id===c.id))CONFIGURATOR_TYPES.push({id:c.id,nome:c.nome,icon:iconFor(c),tipo:c.tipo||'cortina'});}catch{}}
  function removeType(id){try{if(typeof CONFIGURATOR_TYPES!=='undefined'){const i=CONFIGURATOR_TYPES.findIndex(x=>x.id===id);if(i>=0)CONFIGURATOR_TYPES.splice(i,1);}}catch{}}
  async function deleteCustom(c,row){
    const ok=confirm(`Excluir o configurador “${c.nome||'Configurador'}”?\n\nEsta ação remove as configurações, materiais, preços e mídias vinculadas a este configurador nesta empresa. Esta ação não pode ser desfeita.`);
    if(!ok)return;
    try{
      await req(`/admin/api/configurators/${encodeURIComponent(c.id)}`,{method:'DELETE'});
      removeType(c.id);
      row?.remove();
      if(window.ACTIVE_CONFIGURATOR_ID===c.id||document.querySelector(`.configurator-switch.active[data-configurator="${CSS.escape(c.id)}"]`)){
        const first=document.querySelector('.configurator-switch[data-configurator]');
        first?.click();
      }
      if(typeof toast==='function')toast('Configurador excluído');
      await refresh(true);
    }catch(e){alert(e.message||'Não foi possível excluir o configurador.');}
  }
  function makeButton(c){
    const row=document.createElement('div');row.className='dynamic-configurator-row';row.dataset.dynamicConfigurator=c.id;row.style.cssText='display:flex;align-items:stretch;gap:6px;width:100%';
    const b=document.createElement('button');b.type='button';b.className='configurator-switch';b.dataset.configurator=c.id;b.style.flex='1 1 auto';b.innerHTML=`<span class="configurator-icon">${esc(iconFor(c))}</span><span><strong>${esc(c.nome||'Configurador')}</strong><small>${c.tipo==='persiana'?'Cálculo por área':'Produto sob medida'}</small></span>`;b.onclick=async()=>{document.querySelectorAll('.configurator-switch').forEach(x=>x.classList.toggle('active',x===b));try{await renderConfiguratorEditor(c.id);}catch(e){alert(e.message||'Não foi possível abrir o configurador.');}};
    row.appendChild(b);
    if(c.builtin===false){const del=document.createElement('button');del.type='button';del.className='dynamic-configurator-delete';del.title='Excluir configurador';del.setAttribute('aria-label',`Excluir ${c.nome||'configurador'}`);del.textContent='×';del.style.cssText='flex:0 0 34px;border:1px solid #e7d7d3;border-radius:9px;background:#fff;color:#b42318;font-size:21px;line-height:1;cursor:pointer';del.onclick=e=>{e.preventDefault();e.stopPropagation();deleteCustom(c,row)};row.appendChild(del);}
    return row;
  }
  async function refresh(force=false){
    if(location.hash!=='#configurators')return;
    const list=document.getElementById('configurator-switcher');if(!list)return;
    let data;try{data=await req('/admin/api/configurators');}catch{return;}
    const seen=new Set();
    for(const c of data.configurators||[]){
      ensureType(c);seen.add(c.id);
      let row=list.querySelector(`.dynamic-configurator-row[data-dynamic-configurator="${CSS.escape(c.id)}"]`);
      let legacy=list.querySelector(`:scope > .configurator-switch[data-configurator="${CSS.escape(c.id)}"]`);
      if(c.builtin){if(legacy){const s=legacy.querySelector('strong');if(s)s.textContent=c.nome||'Configurador';}continue;}
      if(legacy)legacy.remove();
      if(!row){row=makeButton(c);const add=list.querySelector('[data-add-configurator]');list.insertBefore(row,add||null);}else{const s=row.querySelector('strong');if(s)s.textContent=c.nome||'Configurador';}
    }
    list.querySelectorAll('.dynamic-configurator-row').forEach(row=>{if(!seen.has(row.dataset.dynamicConfigurator||''))row.remove();});
    let add=list.querySelector('[data-add-configurator]');
    if(!add){add=document.createElement('button');add.type='button';add.dataset.addConfigurator='1';add.className='ghost-btn';add.style.cssText='width:100%;margin-top:12px;border-style:dashed';add.textContent='+ Adicionar configurador';list.appendChild(add);add.onclick=openCreate;}
  }
  function openCreate(){
    const name=prompt('Nome do novo configurador:','Novo configurador');if(!name)return;
    const type=confirm('Este configurador será de cálculo por área?\n\nOK = área (ex.: persiana)\nCancelar = produto sob medida')?'persiana':'cortina';
    req('/admin/api/configurators',{method:'POST',body:JSON.stringify({nome:name,tipo:type})}).then(async d=>{const c={...d.configurator,builtin:false};ensureType(c);await refresh(true);const b=document.querySelector(`.configurator-switch[data-configurator="${CSS.escape(c.id)}"]`);b?.click();}).catch(e=>alert(e.message));
  }
  let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(refresh,80)}).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('hashchange',()=>setTimeout(refresh,80));setTimeout(refresh,120);
})();
