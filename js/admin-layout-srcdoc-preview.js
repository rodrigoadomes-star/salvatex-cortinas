(()=>{
  if(window.__RADZ_SRCDOC_PREVIEW__) return;
  window.__RADZ_SRCDOC_PREVIEW__ = true;

  let loading = false;
  let lastFrame = null;
  let retryTimer = 0;

  function withBase(html){
    const base = `<base href="${location.origin}/">`;
    if(/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${base}`);
    return `<!doctype html><html><head>${base}</head><body>${html}</body></html>`;
  }

  function showPreviewError(frame,message){
    const safe=String(message||'Não foi possível carregar o espelho da loja.').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    frame.removeAttribute('src');
    frame.srcdoc=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{height:100%;margin:0;font-family:Inter,system-ui,sans-serif;background:#f8fafc;color:#344054}.x{height:100%;display:grid;place-items:center;text-align:center;padding:32px;box-sizing:border-box}.c{max-width:520px}.c h2{margin:0 0 8px;color:#102a43}.c p{margin:0;line-height:1.5}</style></head><body><div class="x"><div class="c"><h2>Espelho indisponível</h2><p>${safe}</p></div></div></body></html>`;
  }

  async function loadPreview(frame){
    if(!frame || loading) return;
    loading=true;
    lastFrame=frame;
    frame.dataset.radzSrcdocLoading='1';
    try{
      const url='/?radz-preview=1&_='+Date.now();
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'text/html'}});
      if(!response.ok) throw new Error(`Falha ao carregar a loja (${response.status}).`);
      const html=withBase(await response.text());
      frame.removeAttribute('src');
      frame.srcdoc=html;
      frame.dataset.radzSrcdocReady='1';
    }catch(error){
      showPreviewError(frame,error?.message||'Não foi possível carregar o espelho da loja.');
    }finally{
      frame.dataset.radzSrcdocLoading='0';
      loading=false;
    }
  }

  function ensure(){
    if(location.hash!=='#layout') return;
    const frame=document.getElementById('ve-frame');
    if(!frame) return;
    if(frame!==lastFrame || !frame.dataset.radzSrcdocReady) loadPreview(frame);
  }

  document.addEventListener('click',event=>{
    const reload=event.target.closest?.('#ve-reload');
    if(!reload) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const frame=document.getElementById('ve-frame');
    if(frame){
      frame.dataset.radzSrcdocReady='';
      loadPreview(frame);
    }
  },true);

  const observer=new MutationObserver(()=>{
    clearTimeout(retryTimer);
    retryTimer=setTimeout(ensure,20);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  window.addEventListener('hashchange',()=>setTimeout(ensure,0));
  setTimeout(ensure,0);
})();
