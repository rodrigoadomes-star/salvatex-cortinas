(function(){
  let cfg={};
  const recent=new Map();
  function script(src,id){if(id&&document.getElementById(id))return;const s=document.createElement('script');if(id)s.id=id;s.async=true;s.src=src;document.head.appendChild(s)}
  function enabled(key){return cfg.events?.[key]!==false}
  function eventKey(name){return({page_view:'pageView',view_item:'viewContent',add_to_cart:'addToCart',begin_checkout:'beginCheckout',purchase:'purchase',whatsapp_quote:'whatsappLead'})[name]||name}
  function mapMeta(name){return({page_view:'PageView',view_item:'ViewContent',add_to_cart:'AddToCart',begin_checkout:'InitiateCheckout',purchase:'Purchase',whatsapp_quote:'Lead'})[name]||name}
  function fingerprint(name,params){return [name,params.content_id||params.content_ids?.join(',')||'',params.transaction_id||'',params.link_url||'',params.value||''].join('|')}
  function duplicate(name,params){const key=fingerprint(name,params),now=Date.now(),last=recent.get(key)||0;recent.set(key,now);for(const[k,t]of recent){if(now-t>5000)recent.delete(k)}return now-last<700}

  function initMeta(){
    if(!cfg.meta?.enabled||!cfg.meta.pixelId||window.fbq)return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init',cfg.meta.pixelId);
    if(enabled('pageView'))fbq('track','PageView');
  }

  function initGoogle(){
    const ids=[cfg.google?.tagId,cfg.google?.ga4Id,cfg.google?.adsId].filter(Boolean);
    if(!cfg.google?.enabled||!ids.length)return;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){dataLayer.push(arguments)};
    gtag('js',new Date());
    script('https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ids[0]),'stx-gtag');
    [...new Set(ids)].forEach(id=>gtag('config',id));
    if(cfg.google?.gtmId&&!document.getElementById('stx-gtm')){
      window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
      script('https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(cfg.google.gtmId),'stx-gtm');
    }
  }

  async function track(name,params={},options={}){
    const key=eventKey(name);
    if(!options.force&&!enabled(key))return {skipped:true,reason:'event_disabled'};
    if(!options.allowDuplicate&&duplicate(name,params))return {skipped:true,reason:'duplicate'};
    const eventId=options.eventId||(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());
    const payload={...params};
    if(cfg.meta?.enabled&&window.fbq)fbq('track',mapMeta(name),payload,{eventID:eventId});
    if(cfg.google?.enabled&&window.gtag){
      gtag('event',name,payload);
      if(name==='purchase'&&cfg.google.adsId&&cfg.google.adsConversionLabel)gtag('event','conversion',{send_to:cfg.google.adsId+'/'+cfg.google.adsConversionLabel,value:payload.value||0,currency:payload.currency||'BRL',transaction_id:payload.transaction_id||''});
      if(name==='whatsapp_quote'&&cfg.google.adsId&&cfg.google.adsConversionLabel)gtag('event','conversion',{send_to:cfg.google.adsId+'/'+cfg.google.adsConversionLabel});
    }
    if(cfg.meta?.capiEnabled){
      fetch('/api/track',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventName:mapMeta(name),eventId,url:location.href,params:payload,email:payload.email||'',phone:payload.phone||''})}).catch(()=>{});
    }
    return {ok:true,eventId};
  }

  window.SalvatexTracking={track,getConfig:()=>cfg};

  async function init(){
    try{
      const r=await fetch('/api/marketing',{cache:'no-store'}),d=await r.json();
      cfg=d.config||{};
      initMeta();
      initGoogle();
      document.addEventListener('click',e=>{
        const el=e.target.closest('a,button');if(!el)return;
        const href=el.getAttribute('href')||'',txt=(el.textContent||'').toLowerCase();
        if(/wa\.me|whatsapp|api\.whatsapp/.test(href)||txt.includes('whatsapp')||txt.includes('orçamento'))track('whatsapp_quote',{link_url:href});
        if(el.id==='checkout-continuar')track('begin_checkout',{currency:'BRL'});
      },true);
    }catch(e){console.warn('Marketing indisponível',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
