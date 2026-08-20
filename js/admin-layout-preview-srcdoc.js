(()=>{
  if(window.__RADZ_SRCDOC_PREVIEW__) return;
  window.__RADZ_SRCDOC_PREVIEW__ = true;

  let loading=false;
  let lastFrame=null;
  let retryTimer=0;

  function withBase(html){
    const base=`<base href="${location.origin}/">`;
    if(/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i,`<head$1>${base}`);
    return `<!doctype html><html><head>${base}</head><body>${html}</body></html>`;
  }

  function showPreviewError(frame,message){
    const safe=String(message||'Não foi possível carregar o espelho da loja.').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    frame.removeAttribute('src');
    frame.srcdoc=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{height:100%;margin:0;font-family:Inter,system-ui,sans-serif;background:#f8fafc;color:#344054}.x{height:100%;display:grid;place-items:center;text-align:center;padding:32px;box-sizing:border-box}.c{max-width:520px}.c h2{margin:0 0 8px;color:#102a43}.c p{margin:0;line-height:1.5}</style></head><body><div class="x"><div class="c"><h2>Espelho indisponível</h2><p>${safe}</p></div></div></body></html>`;
  }

  function installNavigationGuard(frame){
    try{
      const doc=frame.contentDocument;
      if(!doc||doc.__radzNavigationGuard) return;
      doc.__radzNavigationGuard=true;
      doc.addEventListener('submit',e=>e.preventDefault(),true);
      doc.addEventListener('click',e=>{
        const el=e.target instanceof Element?e.target:null;
        if(!el) return;
        const interactive=el.closest('a,button,input[type="submit"],input[type="button"]');
        if(interactive) e.preventDefault();
      },true);
    }catch(err){console.warn('[RADZ preview guard]',err)}
  }

  function staticSnapshot(frame){
    if(!frame||frame.dataset.radzSnapshotting==='1'||frame.dataset.radzStaticReady==='1') return;
    frame.dataset.radzSnapshotting='1';
    setTimeout(()=>{
      try{
        const doc=frame.contentDocument;
        if(!doc?.documentElement) throw new Error('Documento do espelho indisponível.');
        const clone=doc.documentElement.cloneNode(true);
        clone.querySelectorAll('script').forEach(s=>s.remove());
        clone.querySelectorAll('*').forEach(el=>{
          [...el.attributes].forEach(a=>{if(/^on/i.test(a.name)) el.removeAttribute(a.name)});
        });
        if(!clone.querySelector('base')){
          const base=doc.createElement('base');
          base.href=location.origin+'/';
          clone.querySelector('head')?.prepend(base);
        }
        frame.dataset.radzStaticReady='1';
        frame.dataset.radzSnapshotting='0';
        frame.removeAttribute('src');
        frame.srcdoc='<!doctype html>'+clone.outerHTML;
      }catch(err){
        frame.dataset.radzSnapshotting='0';
        console.warn('[RADZ preview snapshot]',err);
        installNavigationGuard(frame);
      }
    },700);
  }

  function bindFrame(frame){
    if(!frame||frame.dataset.radzPreviewBound==='1') return;
    frame.dataset.radzPreviewBound='1';
    frame.addEventListener('load',()=>{
      if(frame.dataset.radzStaticReady==='1'){
        installNavigationGuard(frame);
        return;
      }
      staticSnapshot(frame);
    });
  }

  async function loadPreview(frame,force=false){
    if(!frame||loading) return;
    if(!force&&frame===lastFrame&&frame.dataset.radzSrcdocReady==='1'&&!frame.hasAttribute('src')) return;
    loading=true;
    lastFrame=frame;
    bindFrame(frame);
    frame.dataset.radzSrcdocLoading='1';
    frame.dataset.radzStaticReady='';
    frame.dataset.radzSnapshotting='0';
    try{
      const url='/?radz-preview=1&_='+Date.now();
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'text/html'}});
      if(!response.ok) throw new Error(`Falha ao carregar a loja (${response.status}).`);
      const html=withBase(await response.text());
      frame.removeAttribute('src');
      frame.srcdoc=html;
      frame.dataset.radzSrcdocReady='1';
    }catch(error){
      frame.dataset.radzSrcdocReady='';
      showPreviewError(frame,error?.message||'Não foi possível carregar o espelho da loja.');
    }finally{
      frame.dataset.radzSrcdocLoading='0';
      loading=false;
    }
  }

  function ensure(force=false){
    if(location.hash!=='#layout') return;
    const frame=document.getElementById('ve-frame');
    if(!frame) return;
    bindFrame(frame);
    if(force||frame!==lastFrame||frame.hasAttribute('src')||frame.dataset.radzSrcdocReady!=='1') loadPreview(frame,true);
  }

  document.addEventListener('click',event=>{
    const reload=event.target.closest?.('#ve-reload');
    if(!reload) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const frame=document.getElementById('ve-frame');
    if(frame){
      frame.dataset.radzStaticReady='';
      frame.dataset.radzSrcdocReady='';
    }
    ensure(true);
  },true);

  const observer=new MutationObserver(mutations=>{
    let force=false;
    for(const mutation of mutations){
      if(mutation.type==='attributes'&&mutation.attributeName==='src'&&mutation.target?.id==='ve-frame'){
        force=true;
        mutation.target.dataset.radzSrcdocReady='';
      }
      if(mutation.type==='childList') force=true;
    }
    clearTimeout(retryTimer);
    retryTimer=setTimeout(()=>ensure(force),25);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  window.addEventListener('hashchange',()=>setTimeout(()=>ensure(true),0));
  setTimeout(()=>ensure(true),0);
})();
