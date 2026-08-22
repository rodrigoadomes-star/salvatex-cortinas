(()=>{
  const originalPageForm=window.pageForm;
  const originalRenderPages=window.renderPages;
  const isProductHub=x=>['produtos','products'].includes(String(x?.slug||'').toLowerCase());
  const normalizePage=x=>{
    if(!x||typeof x!=='object')return x;
    const copy={...x};
    if(copy.configurator_id&&!isProductHub(copy))copy.page_type='configurador';
    return copy;
  };
  if(typeof originalPageForm==='function'){
    window.pageForm=function(x={},products,allPages){
      return originalPageForm(normalizePage(x),products,(allPages||[]).map(normalizePage));
    };
  }
  if(typeof originalRenderPages==='function'){
    window.renderPages=async function(){
      await originalRenderPages();
      try{
        (ADMIN.cache.pages||[]).forEach((p,i)=>{ADMIN.cache.pages[i]=normalizePage(p)});
        document.querySelectorAll('#view-content tbody tr[data-page]').forEach(row=>{
          let p;try{p=JSON.parse(decodeURIComponent(row.dataset.page||''))}catch{return}
          p=normalizePage(p);row.dataset.page=encodeURIComponent(JSON.stringify(p));
          if(p.configurator_id&&!isProductHub(p)){
            const cells=row.querySelectorAll('td');
            if(cells[2])cells[2].textContent='Configurador';
            const link=cells[3]?.querySelector('a');
            if(link){const id=String(p.configurator_id);link.href=id==='persiana'?'../configurador-persiana.html?id=persiana':'../configurador.html?id='+encodeURIComponent(id)}
          }
        });
      }catch(e){console.warn('[RADZ page configurator compat]',e)}
    };
  }
})();
