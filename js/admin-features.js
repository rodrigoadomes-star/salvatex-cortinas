(()=>{
  let featureState={},loading=false,retryTimer=0;
  function enabled(key,defaultValue=false){const f=featureState[key];return f?f.enabled===true:defaultValue;}
  function apply(){
    const configurator=document.querySelector('#admin-nav [data-view="configurators"]');
    if(configurator)configurator.hidden=!enabled('configurator',false);
    const meta=document.querySelector('#admin-nav [data-radz-panel="meta"]');
    if(meta)meta.hidden=!enabled('meta_ads',false);
    if(location.hash==='#configurators'&&!enabled('configurator',false))location.hash='dashboard';
  }
  async function loadFeatures(retry=true){
    if(loading)return;loading=true;clearTimeout(retryTimer);apply();
    try{
      const r=await fetch('/admin/api/features',{credentials:'same-origin',cache:'no-store'});
      if(!r.ok){if(retry)retryTimer=setTimeout(()=>loadFeatures(true),900);return;}
      const d=await r.json();featureState=d.features||{};apply();
    }catch{if(retry)retryTimer=setTimeout(()=>loadFeatures(true),1200)}finally{loading=false}
  }
  document.addEventListener('DOMContentLoaded',()=>{apply();loadFeatures(true);const app=document.getElementById('admin-app');if(app)new MutationObserver(()=>{if(!app.hidden)loadFeatures(true)}).observe(app,{attributes:true,attributeFilter:['hidden']})},{once:true});
  window.addEventListener('hashchange',()=>{apply();if(!Object.keys(featureState).length)loadFeatures(true)});
  window.addEventListener('focus',()=>{if(!document.getElementById('admin-app')?.hidden)loadFeatures(false)});
  window.RADZ_FEATURES={reload:()=>loadFeatures(false),isEnabled:enabled};
})();
