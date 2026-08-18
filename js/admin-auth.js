(function(){
  const emailInput=document.getElementById('admin-token-input');
  const passwordInput=document.getElementById('admin-password-input');
  const errorBox=document.getElementById('login-error');
  const notice=document.getElementById('login-notice');
  const forgot=document.getElementById('forgot-password');

  window.login=login=async function(){
    const email=(emailInput?.value||'').trim().toLowerCase();
    const password=passwordInput?.value||'';
    if(errorBox)errorBox.textContent='';
    if(notice){notice.textContent='';notice.className='login-notice'}
    if(!email||!password){if(errorBox)errorBox.textContent='Informe e-mail e senha.';return}
    try{
      const r=await fetch('/admin/api/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||'Não foi possível entrar.');
      ADMIN.csrf=d.csrfToken||'';
      sessionStorage.setItem('salvatexAdminCsrf',ADMIN.csrf);
      if(passwordInput)passwordInput.value='';
      document.getElementById('admin-login').style.display='none';
      document.getElementById('admin-app').hidden=false;
      await navigate(location.hash.slice(1)||'dashboard');
    }catch(e){
      ADMIN.csrf='';sessionStorage.removeItem('salvatexAdminCsrf');
      if(errorBox)errorBox.textContent=e.message;
    }
  };

  forgot?.addEventListener('click',async function(){
    const email=(emailInput?.value||'').trim().toLowerCase();
    if(errorBox)errorBox.textContent='';
    if(notice){notice.textContent='';notice.className='login-notice'}
    if(!email){if(errorBox)errorBox.textContent='Informe seu e-mail acima para recuperar a senha.';emailInput?.focus();return}
    forgot.disabled=true;
    try{
      const r=await fetch('/admin/api/forgot-password',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||'Não foi possível solicitar a recuperação.');
      if(notice){notice.textContent=d.message||'Se o e-mail estiver cadastrado, enviaremos um link de redefinição.';notice.className='login-notice success'}
    }catch(e){if(notice){notice.textContent=e.message;notice.className='login-notice error'}}
    finally{forgot.disabled=false}
  });
})();
