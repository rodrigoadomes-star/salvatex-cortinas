(()=>{
  async function currentSession(){
    const r=await fetch('/radz/api/session',{credentials:'same-origin'});
    if(!r.ok)return null;
    return r.json().catch(()=>null);
  }

  document.addEventListener('submit',async event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='adv-ai')return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const result=form.querySelector('.adv-result');
    const fd=new FormData(form);
    try{
      if(result)result.textContent='Salvando…';
      const session=await currentSession();
      if(!session?.csrfToken)throw new Error('Sessão RADZ inválida ou expirada.');
      const r=await fetch('/radz/api/ai-settings',{
        method:'PUT',
        credentials:'same-origin',
        headers:{'content-type':'application/json','x-csrf-token':session.csrfToken},
        body:JSON.stringify({
          enabled:fd.get('enabled')==='on',
          provider:fd.get('provider'),
          model:fd.get('model'),
          timeoutMs:Number(fd.get('timeoutMs')||30000),
          temperature:fd.get('temperature')===''?null:Number(fd.get('temperature')),
          prompt:fd.get('prompt'),
          instructions:fd.get('instructions')
        })
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||`Falha (${r.status}).`);
      if(result)result.textContent='Configuração de IA salva.';
    }catch(error){
      if(result)result.textContent=error.message;
    }
  },true);
})();
