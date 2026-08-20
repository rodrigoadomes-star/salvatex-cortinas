(()=>{
  if(window.__RADZ_LAYOUT_PREVIEW_SRCDOC__)return;
  window.__RADZ_LAYOUT_PREVIEW_SRCDOC__=true;

  let busy=false,lastStamp=0;

  async function hydrate(frame){
    if(!frame||busy)return;
    busy=true;
    const stamp=Date.now();
    lastStamp=stamp;
    try{
      frame.removeAttribute('src');
      const res=await fetch('/?radz-preview=1&editor='+stamp,{credentials:'same-origin',cache:'no-store',headers:{accept:'text/html'}});
      if(!res.ok)throw new Error('Falha ao carregar a vitrine ('+res.status+').');
      let html=await res.text();
      if(!/<base\b/i.test(html))html=html.replace(/<head([^>]*)>/i,'<head$1><base href="/">');
      frame.srcdoc=html;
      frame.dataset.radzSrcdoc='1';
    }catch(err){
      console.error('[RADZ preview srcdoc]',err);
      frame.srcdoc='<!doctype html><html><body style="font-family:system-ui;padding:32px;color:#b42318"><strong>Não foi possível carregar o espelho da loja.</strong><p>'+String(err&&err.message||err)+'</p></body></html>';
    }finally{busy=false}
  }

  function findAndHydrate(){
    if(location.hash!=='#layout')return;
    const frame=document.getElementById('ve-frame');
    if(frame&&!frame.dataset.radzSrcdoc)hydrate(frame);
  }

  const observer=new MutationObserver(()=>findAndHydrate());
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});

  document.addEventListener('click',e=>{
    const reload=e.target.closest?.('#ve-reload');
    if(reload){
      e.preventDefault();e.stopImmediatePropagation();
      const frame=document.getElementById('ve-frame');
      if(frame){delete frame.dataset.radzSrcdoc;hydrate(frame)}
    }
  },true);

  window.addEventListener('hashchange',()=>setTimeout(findAndHydrate,0));
  setTimeout(findAndHydrate,0);
})();
