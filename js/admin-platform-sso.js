(()=>{
  let booted=false;
  function showApp(data={}){
    const login=document.getElementById('admin-login'),app=document.getElementById('admin-app');
    if(login)login.style.display='none';
    if(app)app.hidden=false;
    if(data.csrfToken&&typeof ADMIN!=='undefined'){
      ADMIN.csrf=data.csrfToken;
      sessionStorage.setItem('salvatexAdminCsrf',ADMIN.csrf);
    }
    if(data.store&&typeof window.RADZ_APPLY_ADMIN_BRAND==='function')window.RADZ_APPLY_ADMIN_BRAND(data.store);
  }
  async function timedFetch(url,opt={},ms=5000){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
    try{return await fetch(url,{...opt,signal:controller.signal})}finally{clearTimeout(timer)}
  }
  async function bootSso(){
    if(booted)return;booted=true;
    try{
      const current=await timedFetch('/admin/api/session',{credentials:'same-origin',cache:'no-store'});
      if(current.ok){
        const data=await current.json().catch(()=>({}));
        showApp(data);
        if(typeof navigate==='function')await navigate(location.hash.slice(1)||'dashboard');
        window.RADZ_FEATURES?.reload?.();
        return;
      }
      const r=await timedFetch('/admin/api/platform-sso',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:'{}'});
      if(!r.ok)return;
      const d=await r.json().catch(()=>({}));
      showApp(d);
      if(typeof navigate==='function')await navigate(location.hash.slice(1)||'dashboard');
      window.RADZ_FEATURES?.reload?.();
    }catch(error){
      console.warn('[RADZ admin SSO]',error?.name==='AbortError'?'tempo limite excedido':error);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootSso,{once:true});else bootSso();
})();
