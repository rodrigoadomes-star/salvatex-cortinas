(()=>{
  if(window.__RADZ_DYNAMIC_CONFIGURATORS__)return;
  window.__RADZ_DYNAMIC_CONFIGURATORS__=true;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const csrf=()=>window.ADMIN?.csrf||sessionStorage.getItem('salvatexAdminCsrf')||'';
  async function req(url,opt={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers:{accept:'application/json','content-type':'application/json','x-csrf-token':csrf(),...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`Falha (${r.status})`);return d;}
  function iconFor(c){if(c.icon)return c.icon;return c.tipo==='persiana'?'▤':'◇';}
  function ensureType(c){try{if(typeof CONFIGURATOR_TYPES!=='undefined'&&!CONFIGURATOR_TYPES.some(x=>x.id===c.id))CONFIGURATOR_TYPES.push({id:c.id,nome:c.nome,icon:iconFor(c),tipo:c.tipo||'cortina'});}catch{}}
  function makeButton(c){const b=document.createElement('button');b.type='button';b.className='configurator-switch';b.dataset.configurator=c.id;b.innerHTML=`<span class="configurator-icon">${esc(iconFor(c))}</span><span><strong>${esc(c.nome||'Configurador')}</strong><small>${c.tipo==='persiana'?'Cálculo por área':'Produto sob medida'}</small></span>`;b.onclick=async()=>{document.querySelectorAll('.configurator-switch').forEach(x=>x.classList.toggle('active',x===b));try{await renderConfiguratorEditor(c.id);}catch(e){alert(e.message||'Não foi possível abrir o configurador.');}};return b;}
  async function refresh(){
    if(location.hash!=='#configurators')return;
    const list=document.getElementById('configurator-switcher');if(!list)return;
    let data;try{data=await req('/admin/api/configurators');}catch{return;}
    for(const c of data.configurators||[]){ensureType(c);let b=list.querySelector(`.configurator-switch[data-configurator="${CSS.escape(c.id)}"]`);if(!b){b=makeButton(c);list.appendChild(b);}else{const s=b.querySelector('strong');if(s)s.textContent=c.nome||'Configurador';}}
    let add=list.querySelector('[data-add-configurator]');
    if(!add){add=document.createElement('button');add.type='button';add.dataset.addConfigurator='1';add.className='ghost-btn';add.style.cssText='width:100%;margin-top:12px;border-style:dashed';add.textContent='+ Adicionar configurador';list.appendChild(add);add.onclick=openCreate;}
  }
  function openCreate(){
    const name=prompt('Nome do novo configurador:','Novo configurador');if(!name)return;
    const type=confirm('Este configurador será de cálculo por área?\n\nOK = área (ex.: persiana)\nCancelar = produto sob medida')?'persiana':'cortina';
    req('/admin/api/configurators',{method:'POST',body:JSON.stringify({nome:name,tipo:type})}).then(async d=>{const c=d.configurator;ensureType(c);await refresh();const b=document.querySelector(`.configurator-switch[data-configurator="${CSS.escape(c.id)}"]`);b?.click();}).catch(e=>alert(e.message));
  }
  let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(refresh,80)}).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('hashchange',()=>setTimeout(refresh,80));setTimeout(refresh,120);
})();
