(()=>{
  if(window.__RADZ_CONFIGURATOR_EDITABLE_LABELS__) return;
  window.__RADZ_CONFIGURATOR_EDITABLE_LABELS__=true;

  let label='Não quero trilho ou varão';

  function apply(){
    const select=document.getElementById('trilho-select');
    if(!select) return;
    const option=[...select.options].find(o=>o.value==='Não')||select.options[1];
    if(option) option.textContent=label;
  }

  async function load(){
    try{
      const r=await fetch('/api/layout',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      const d=await r.json().catch(()=>({}));
      const v=String(d?.layout?.configuratorLabels?.noFinishOption||'').trim();
      if(v) label=v;
    }catch(e){console.warn('[RADZ configurator labels]',e)}
    apply();
  }

  const observer=new MutationObserver(apply);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('salvatex:layout-ready',()=>{load();apply()});
  document.addEventListener('change',e=>{if(e.target?.id==='trilho-select') apply()});
  load();
})();
