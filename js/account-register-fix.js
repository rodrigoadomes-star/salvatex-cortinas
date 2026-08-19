(()=>{
  const form=document.getElementById('email-register-form');if(!form)return;
  let widgetId=null;
  const feedback=form.querySelector('.account-feedback');
  async function turnstile(){
    try{const c=await fetch('/api/turnstile-config',{cache:'no-store'}).then(r=>r.json());if(!c.enabled)return;
      for(let i=0;i<40&&!window.turnstile;i++)await new Promise(r=>setTimeout(r,100));
      const slot=form.querySelector('.account-turnstile');if(window.turnstile&&slot)widgetId=turnstile.render(slot,{sitekey:c.sitekey,theme:'light'});
    }catch{}
  }
  const token=()=>widgetId!==null&&window.turnstile?turnstile.getResponse(widgetId):'';
  form.addEventListener('submit',async e=>{
    e.preventDefault();feedback.textContent='';
    const fd=new FormData(form),password=String(fd.get('password')||''),confirm=String(fd.get('confirmPassword')||'');
    if(password!==confirm){feedback.style.color='#a40000';feedback.textContent='As senhas não coincidem.';return;}
    const btn=form.querySelector('[type=submit]');btn.disabled=true;
    try{
      const r=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),password,turnstileToken:token()})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Não foi possível criar a conta.');
      feedback.style.color='#08752b';feedback.textContent='Conta criada com sucesso. Redirecionando…';
      setTimeout(()=>{location.href='/minha-conta.html';},500);
    }catch(err){feedback.style.color='#a40000';feedback.textContent=err.message;if(widgetId!==null&&window.turnstile)turnstile.reset(widgetId)}finally{btn.disabled=false;}
  });
  turnstile();
})();
