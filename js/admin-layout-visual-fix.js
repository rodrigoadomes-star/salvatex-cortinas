(()=>{
  if(window.__RADZ_LAYOUT_VISUAL_FIX__)return;
  window.__RADZ_LAYOUT_VISUAL_FIX__=true;

  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init={}){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const url=new URL(raw,location.href);
      const method=String(init.method||(input&&input.method)||'GET').toUpperCase();
      if(url.origin===location.origin&&url.pathname.startsWith('/admin/api/')&&!['GET','HEAD','OPTIONS'].includes(method)){
        const headers=new Headers(init.headers||(input&&input.headers)||{});
        const csrf=sessionStorage.getItem('salvatexAdminCsrf')||window.ADMIN?.csrf||'';
        if(csrf&&!headers.has('x-csrf-token'))headers.set('x-csrf-token',csrf);
        init={...init,headers};
      }
    }catch{}
    return originalFetch(input,init);
  };

  function loadingHtml(){
    return '<div class="panel empty" data-radz-visual-loading style="min-height:260px;display:grid;place-items:center">Carregando editor visual…</div>';
  }

  function suppressLegacyLayout(){
    if(location.hash!=='#layout')return;
    const content=document.getElementById('view-content');
    if(!content||content.querySelector('.ve-shell'))return;

    const legacy=content.querySelector('.layout-editor-grid, #layout-editor-form, [data-layout-page], .layout-editor-nav');
    const text=(content.textContent||'').trim();
    if(legacy||(text.includes('Editar layout')&&text.includes('Cabeçalho')&&text.includes('Página inicial'))){
      content.innerHTML=loadingHtml();
    }
  }

  const observer=new MutationObserver(()=>suppressLegacyLayout());
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-view="layout"]')){
      const content=document.getElementById('view-content');
      if(content)content.innerHTML=loadingHtml();
      queueMicrotask(suppressLegacyLayout);
      setTimeout(suppressLegacyLayout,0);
      setTimeout(suppressLegacyLayout,80);
      setTimeout(suppressLegacyLayout,160);
    }
  },true);

  window.addEventListener('hashchange',()=>{
    if(location.hash==='#layout'){
      const content=document.getElementById('view-content');
      if(content&&!content.querySelector('.ve-shell'))content.innerHTML=loadingHtml();
      queueMicrotask(suppressLegacyLayout);
    }
  });

  if(location.hash==='#layout'){
    const content=document.getElementById('view-content');
    if(content&&!content.querySelector('.ve-shell'))content.innerHTML=loadingHtml();
    suppressLegacyLayout();
  }
})();
