(()=>{
  async function bootSso(){
    try{
      const current=await fetch('/admin/api/session',{credentials:'same-origin',cache:'no-store'});
      if(current.ok)return;
      const r=await fetch('/admin/api/platform-sso',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:'{}'});
      if(!r.ok)return;
      const d=await r.json();
      if(typeof ADMIN!=='undefined'){ADMIN.csrf=d.csrfToken||'';sessionStorage.setItem('salvatexAdminCsrf',ADMIN.csrf)}
      const login=document.getElementById('admin-login'),app=document.getElementById('admin-app');
      if(login)login.style.display='none';if(app)app.hidden=false;
      if(typeof navigate==='function')await navigate(location.hash.slice(1)||'dashboard');
      window.RADZ_FEATURES?.reload?.();
    }catch{}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootSso,{once:true});else bootSso();
})();
