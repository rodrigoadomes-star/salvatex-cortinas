(()=>{
  if(window.__radzAnalyticsLoaded)return; window.__radzAnalyticsLoaded=true;
  const endpoint='/api/analytics/event';
  const uuid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let visitorId=localStorage.getItem('radz_visitor_id'); if(!visitorId){visitorId=uuid();localStorage.setItem('radz_visitor_id',visitorId)}
  let sessionId=sessionStorage.getItem('radz_session_id'); if(!sessionId){sessionId=uuid();sessionStorage.setItem('radz_session_id',sessionId)}
  const params=new URLSearchParams(location.search);
  const device=()=>matchMedia('(max-width: 767px)').matches?'mobile':matchMedia('(max-width: 1100px)').matches?'tablet':'desktop';
  const base=()=>({visitorId,sessionId,path:location.pathname+location.search,pageTitle:document.title,referrer:document.referrer,utmSource:params.get('utm_source'),utmMedium:params.get('utm_medium'),utmCampaign:params.get('utm_campaign'),utmContent:params.get('utm_content'),utmTerm:params.get('utm_term'),deviceType:device()});
  function send(eventType,data={}){
    const payload={...base(),...data,eventType,eventId:data.eventId||uuid()};
    const body=JSON.stringify(payload);
    try{if(navigator.sendBeacon){const ok=navigator.sendBeacon(endpoint,new Blob([body],{type:'application/json'}));if(ok)return Promise.resolve(true)}}catch{}
    return fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',keepalive:true,body}).then(r=>r.ok).catch(()=>false);
  }
  window.RadzAnalytics={track:send,pageView:()=>send('page_view'),productView:(productId)=>send('product_view',{productId}),addToCart:(productId,valueCents=0)=>send('add_to_cart',{productId,valueCents}),checkout:(valueCents=0)=>send('checkout_started',{valueCents}),order:(valueCents=0,eventId)=>send('order_completed',{valueCents,eventId})};
  send('page_view');
  if(/\/produto(?:\.html)?$/i.test(location.pathname)||/\/configurador/i.test(location.pathname)){
    const productId=params.get('id')||document.body?.dataset?.productId||''; send('product_view',{productId});
  }
})();
