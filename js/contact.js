(function(){
  async function config(){
    return fetch('/api/turnstile-config',{cache:'no-store'})
      .then(r=>r.json())
      .catch(()=>({enabled:false,enforced:false}));
  }

  async function waitForTurnstile(){
    for(let i=0;i<50&&!window.turnstile;i++)await new Promise(r=>setTimeout(r,100));
    return Boolean(window.turnstile);
  }

  async function init(){
    const form=document.getElementById('contact-form');
    if(!form)return;

    const feedback=form.querySelector('.contact-feedback');
    const button=form.querySelector('button[type=submit]');
    const mount=form.querySelector('.contact-turnstile');
    const cfg=await config();
    let widget=null;
    let turnstileReady=!cfg.enforced;

    if(cfg.enabled&&mount){
      const loaded=await waitForTurnstile();
      if(loaded){
        try{
          widget=turnstile.render(mount,{
            sitekey:cfg.sitekey,
            theme:'light',
            callback:function(){turnstileReady=true;feedback.textContent='';},
            'expired-callback':function(){turnstileReady=false;feedback.style.color='#a40000';feedback.textContent='Verificação expirada. Confirme novamente.';},
            'error-callback':function(){turnstileReady=false;feedback.style.color='#a40000';feedback.textContent='Não foi possível carregar a verificação de segurança. Atualize a página e tente novamente.';}
          });
        }catch(error){
          turnstileReady=false;
          feedback.style.color='#a40000';
          feedback.textContent='Não foi possível iniciar a verificação de segurança neste domínio.';
          console.error('Turnstile render',error);
        }
      }else if(cfg.enforced){
        turnstileReady=false;
        feedback.style.color='#a40000';
        feedback.textContent='A verificação de segurança não carregou. Atualize a página.';
      }
    }

    try{
      const d=await fetch('/api/layout',{cache:'no-store'}).then(r=>r.json());
      const number=String(d.layout?.footer?.whatsapp||d.config?.footer?.whatsapp||'').replace(/\D/g,'');
      const link=document.querySelector('[data-contact-whatsapp]');
      if(link&&number){link.href='https://wa.me/'+number;link.textContent='WhatsApp: +'+number}
    }catch{}

    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(cfg.enforced&&!turnstileReady){
        feedback.style.color='#a40000';
        feedback.textContent='Conclua a verificação de segurança antes de enviar.';
        return;
      }

      const data=new FormData(form);
      button.disabled=true;
      feedback.textContent='Enviando…';
      feedback.style.color='';

      try{
        const response=await fetch('/api/contact',{
          method:'POST',
          headers:{'content-type':'application/json'},
          body:JSON.stringify({
            name:data.get('name'),
            email:data.get('email'),
            phone:data.get('phone'),
            message:data.get('message'),
            website:data.get('website'),
            turnstileToken:widget!==null&&window.turnstile?turnstile.getResponse(widget):''
          })
        });
        const body=await response.json();
        if(!response.ok)throw new Error(body.message||'Não foi possível enviar.');
        feedback.style.color='#08752b';
        feedback.textContent=body.message;
        form.reset();
        if(widget!==null&&window.turnstile){turnstile.reset(widget);turnstileReady=!cfg.enforced;}
      }catch(error){
        feedback.style.color='#a40000';
        feedback.textContent=error.message;
        if(widget!==null&&window.turnstile){turnstile.reset(widget);turnstileReady=!cfg.enforced;}
      }finally{
        button.disabled=false;
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
