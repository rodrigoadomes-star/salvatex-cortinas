(()=>{
  let featureState={};
  async function loadFeatures(){
    try{
      const r=await fetch('/admin/api/features',{credentials:'same-origin',cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();featureState=d.features||{};
      apply();
    }catch{}
  }
  function enabled(key,defaultValue=false){const f=featureState[key];return f?f.enabled===true:defaultValue;}
  function apply(){
    const configurator=document.querySelector('#admin-nav [data-view="configurators"]');
    if(configurator)configurator.hidden=!enabled('configurator',false);
    const meta=document.querySelector('#admin-nav [data-radz-panel="meta"]');
    if(meta&&featureState.meta_ads)meta.hidden=!enabled('meta_ads',false);
    if(location.hash==='#configurators'&&!enabled('configurator',false))location.hash='dashboard';
  }
  document.addEventListener('DOMContentLoaded',loadFeatures,{once:true});
  window.addEventListener('hashchange',apply);
  window.RADZ_FEATURES={reload:loadFeatures,isEnabled:enabled};
})();
