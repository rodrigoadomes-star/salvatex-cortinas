(()=>{
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn()}
  ready(()=>{
    const form=document.getElementById('login-form');if(!form)return;
    form.addEventListener('submit',async e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const email=(document.getElementById('admin-token-input')?.value||'').trim().toLowerCase();
      const password=document.getElementById('admin-password-input')?.value||'';
      const error=document.getElementById('login-error'),notice=document.getElementById('login-notice'),button=form.querySelector('button[type="submit"]');
      if(error)error.textContent='';if(notice){notice.textContent='';notice.className='login-notice'}
      if(!email||!password){if(error)error.textContent='Informe e-mail e senha.';return}
      if(button){button.disabled=true;button.dataset.originalText=button.textContent;button.textContent='Entrando…'}
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
      try{
        const r=await fetch('/admin/api/login',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
        const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Não foi possível entrar.');
        if(typeof ADMIN!=='undefined'){ADMIN.csrf=d.csrfToken||'';sessionStorage.setItem('salvatexAdminCsrf',ADMIN.csrf)}
        if(document.getElementById('admin-password-input'))document.getElementById('admin-password-input').value='';
        if(document.getElementById('admin-login'))document.getElementById('admin-login').style.display='none';
        if(document.getElementById('admin-app'))document.getElementById('admin-app').hidden=false;
        if(d.store&&typeof window.RADZ_APPLY_ADMIN_BRAND==='function')window.RADZ_APPLY_ADMIN_BRAND(d.store);
        if(typeof navigate==='function')await navigate(location.hash.slice(1)||'dashboard');
        window.RADZ_FEATURES?.reload?.();
      }catch(err){
        if(typeof ADMIN!=='undefined'){ADMIN.csrf='';sessionStorage.removeItem('salvatexAdminCsrf')}
        if(error)error.textContent=err?.name==='AbortError'?'O servidor demorou para responder. Atualize a página e tente novamente.':(err.message||'Não foi possível entrar.');
      }finally{clearTimeout(timer);if(button){button.disabled=false;button.textContent=button.dataset.originalText||'Entrar no painel'}}
    },true);
  });
})();
