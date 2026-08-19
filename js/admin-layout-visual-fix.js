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

  let maskTimer=0;
  function showMask(){
    if(document.getElementById('radz-layout-loading-mask'))return;
    const mask=document.createElement('div');
    mask.id='radz-layout-loading-mask';
    mask.innerHTML='<div class="radz-layout-loading-card"><span class="radz-layout-spinner"></span><strong>Carregando editor visual…</strong></div>';
    const style=document.createElement('style');
    style.id='radz-layout-loading-style';
    style.textContent=`#radz-layout-loading-mask{position:fixed;left:202px;top:70px;right:0;bottom:0;background:#f5f7fb;z-index:999;display:grid;place-items:center}#radz-layout-loading-mask .radz-layout-loading-card{display:flex;align-items:center;gap:12px;color:#132238;font:600 14px/1.4 Inter,system-ui,sans-serif}.radz-layout-spinner{width:20px;height:20px;border:2px solid #d7dee8;border-top-color:#102a43;border-radius:50%;animation:radzSpin .75s linear infinite}@keyframes radzSpin{to{transform:rotate(360deg)}}@media(max-width:900px){#radz-layout-loading-mask{left:0}}`;
    if(!document.getElementById(style.id))document.head.appendChild(style);
    document.body.appendChild(mask);
    clearTimeout(maskTimer);maskTimer=setTimeout(removeMask,6000);
  }
  function removeMask(){
    clearTimeout(maskTimer);
    document.getElementById('radz-layout-loading-mask')?.remove();
  }
  function check(){
    if(location.hash==='#layout'){
      if(document.querySelector('.ve-shell'))removeMask();
    }else removeMask();
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-view="layout"]'))showMask();
  },true);
  window.addEventListener('hashchange',()=>{
    if(location.hash==='#layout')showMask(); else removeMask();
    setTimeout(check,0);
  });
  const observer=new MutationObserver(check);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(location.hash==='#layout'){showMask();check();}
})();
