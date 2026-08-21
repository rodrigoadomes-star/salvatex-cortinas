(()=>{
  if(window.__RADZ_CONFIGURATOR_EDITABLE_LABELS__) return;
  window.__RADZ_CONFIGURATOR_EDITABLE_LABELS__=true;

  let label='Não quero trilho ou varão';
  let selectObserver=null;

  function apply(){
    const select=document.getElementById('trilho-select');
    if(!select) return false;
    const option=[...select.options].find(o=>o.value==='Não')||select.options[1];
    if(option && option.textContent!==label) option.textContent=label;
    return true;
  }

  function watchSelect(){
    const select=document.getElementById('trilho-select');
    if(!select) return;
    if(select.dataset.radzEditableLabelBound==='1') return;
    select.dataset.radzEditableLabelBound='1';
    selectObserver?.disconnect();
    selectObserver=new MutationObserver(()=>apply());
    selectObserver.observe(select,{childList:true,subtree:true});
    apply();
  }

  async function load(){
    try{
      const r=await fetch('/api/layout',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      const d=await r.json().catch(()=>({}));
      const v=String(d?.layout?.configuratorLabels?.noFinishOption||'').trim();
      if(v) label=v;
    }catch(e){console.warn('[RADZ configurator labels]',e)}
    apply();
    watchSelect();
  }

  const bootObserver=new MutationObserver(()=>{
    if(document.getElementById('trilho-select')){
      watchSelect();
      bootObserver.disconnect();
    }
  });
  bootObserver.observe(document.body||document.documentElement,{childList:true,subtree:true});

  window.addEventListener('salvatex:layout-ready',()=>{load()});
  document.addEventListener('change',e=>{if(e.target?.id==='trilho-select') apply()});
  load();
})();
