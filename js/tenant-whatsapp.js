(()=>{
  const cleanPhone=value=>String(value||'').replace(/\D/g,'');
  const normalizePhone=value=>{
    let phone=cleanPhone(value);
    if(!phone)return '';
    if(phone.length===10||phone.length===11)phone='55'+phone;
    return phone;
  };
  const text=value=>String(value||'').trim();
  async function getJson(url){
    const r=await fetch(url,{cache:'no-store',credentials:'same-origin'});
    if(!r.ok)return null;
    return r.json().catch(()=>null);
  }
  function icon(){return '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C8.86 3 3.02 8.82 3.02 15.98c0 2.52.73 4.99 2.11 7.1L3 29l6.1-2.01a13.02 13.02 0 0 0 6.93 1.9h.01c7.18 0 13.02-5.82 13.02-12.98C29.06 8.82 23.22 3 16.04 3Zm0 23.7h-.01a10.82 10.82 0 0 1-5.51-1.5l-.4-.24-3.62 1.19 1.18-3.52-.26-.42a10.77 10.77 0 0 1-1.65-5.72c0-5.94 4.85-10.77 10.81-10.77 5.96 0 10.81 4.83 10.81 10.77 0 5.94-4.85 10.77-10.81 10.77Zm5.93-8.07c-.33-.16-1.92-.94-2.22-1.05-.3-.11-.52-.16-.74.16-.22.33-.85 1.05-1.04 1.27-.19.22-.38.25-.71.08-.33-.16-1.38-.51-2.63-1.62-.97-.86-1.63-1.92-1.82-2.25-.19-.33-.02-.5.14-.67.15-.15.33-.38.49-.57.16-.19.22-.33.33-.54.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.43-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.13 1.33 3.35.16.22 2.3 3.5 5.57 4.91.78.34 1.38.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.92-.78 2.19-1.54.27-.76.27-1.41.19-1.54-.08-.14-.3-.22-.63-.38Z"/></svg>'}
  function mount(settings){
    const phone=normalizePhone(settings.number);
    if(settings.enabled===false||!phone)return;
    document.querySelector('[data-radz-whatsapp]')?.remove();
    const message=text(settings.message)||'Olá! Vim pelo site e gostaria de mais informações.';
    const side=settings.position==='left'?'left':'right';
    const link=document.createElement('a');
    link.dataset.radzWhatsapp='1';
    link.href=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    link.target='_blank';link.rel='noopener noreferrer';
    link.setAttribute('aria-label','Falar pelo WhatsApp');link.title='Falar pelo WhatsApp';
    link.innerHTML=icon();
    Object.assign(link.style,{position:'fixed',bottom:'22px',[side]:'22px',width:'58px',height:'58px',borderRadius:'50%',background:'#25D366',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 10px 28px rgba(0,0,0,.22)',zIndex:'9998',transition:'transform .18s ease,box-shadow .18s ease'});
    const svg=link.querySelector('svg');Object.assign(svg.style,{width:'34px',height:'34px'});
    link.addEventListener('mouseenter',()=>{link.style.transform='translateY(-2px) scale(1.04)';link.style.boxShadow='0 14px 32px rgba(0,0,0,.27)'});
    link.addEventListener('mouseleave',()=>{link.style.transform='';link.style.boxShadow='0 10px 28px rgba(0,0,0,.22)'});
    document.body.appendChild(link);
  }
  async function boot(){
    try{
      const [layoutData,storeData]=await Promise.all([getJson('/api/layout'),getJson('/api/store-config')]);
      const layout=layoutData?.layout||{},config=storeData?.config||{};
      const saved=layout?.footer?.whatsapp||layout?.whatsapp||{};
      const fallbackNumber=config?.whatsapp||config?.phone||config?.contact?.whatsapp||config?.contact?.phone||layout?.contact?.whatsapp||'';
      const explicit=Object.keys(saved||{}).length>0;
      mount({
        enabled:explicit?saved.enabled!==false:Boolean(fallbackNumber),
        number:saved.number||fallbackNumber,
        message:saved.message||'',
        position:saved.position||'right'
      });
    }catch(error){console.warn('[RADZ WhatsApp]',error)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();