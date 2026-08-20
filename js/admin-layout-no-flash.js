(()=>{
  const STYLE_ID='radz-layout-no-flash-style';
  let observer=null;

  function content(){return document.getElementById('view-content')}
  function isLayout(){return location.hash==='#layout'}

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      body.radz-layout-loading #view-content{visibility:hidden!important;opacity:0!important}
      body.radz-layout-loading #view-content::before{content:''}
    `;
    document.head.appendChild(style);
  }

  function stopObserver(){
    if(observer){observer.disconnect();observer=null}
  }

  function revealWhenVisualReady(){
    ensureStyle();
    stopObserver();
    if(!isLayout()){
      document.body.classList.remove('radz-layout-loading');
      return;
    }
    document.body.classList.add('radz-layout-loading');
    const c=content();
    if(!c)return;

    const reveal=()=>{
      if(c.querySelector('.ve-shell')){
        document.body.classList.remove('radz-layout-loading');
        stopObserver();
        return true;
      }
      return false;
    };

    if(reveal())return;
    observer=new MutationObserver(reveal);
    observer.observe(c,{childList:true,subtree:true});

    // Fail-safe: nunca deixa o painel invisível se uma API falhar.
    setTimeout(()=>{
      document.body.classList.remove('radz-layout-loading');
      stopObserver();
    },8000);
  }

  // Captura antes do handler legado do admin.js para impedir o frame antigo de aparecer.
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="layout"]')){
      ensureStyle();
      document.body.classList.add('radz-layout-loading');
    }
  },true);

  window.addEventListener('hashchange',()=>{
    if(isLayout())revealWhenVisualReady();
    else{
      document.body.classList.remove('radz-layout-loading');
      stopObserver();
    }
  });

  document.addEventListener('DOMContentLoaded',()=>{
    if(isLayout())revealWhenVisualReady();
  },{once:true});
})();