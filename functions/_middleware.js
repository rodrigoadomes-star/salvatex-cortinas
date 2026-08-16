const CSP=["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","form-action 'self' https://accounts.google.com","script-src 'self' 'unsafe-inline' https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net","style-src 'self' 'unsafe-inline' https://accounts.google.com","img-src 'self' data: blob: https://*.googleusercontent.com https://www.facebook.com https://www.google-analytics.com https://www.googletagmanager.com","font-src 'self' data:","connect-src 'self' https://accounts.google.com https://challenges.cloudflare.com https://oauth2.googleapis.com https://openidconnect.googleapis.com https://www.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://www.facebook.com https://graph.facebook.com","frame-src https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com","media-src 'self' blob:","worker-src 'self' blob:","upgrade-insecure-requests"].join("; ");

const PAGE_BOOTSTRAP=`
<style id="site-bootstrap-style">
  html.site-booting body{visibility:hidden!important}
  html.site-booting{background:#fbfaf8}
</style>
<script id="site-bootstrap-script">
(function(){
  var root=document.documentElement;
  root.classList.add('site-booting');
  var originalFetch=window.fetch;
  var pending=0;
  var domReady=document.readyState!=='loading';
  var readyTimer=0;
  var finished=false;

  function tracked(input){
    try{
      var raw=typeof input==='string'?input:(input&&input.url)||'';
      var url=new URL(raw,location.href);
      if(url.origin!==location.origin)return false;
      return url.pathname.indexOf('/api/')===0||url.pathname.indexOf('/admin/api/')===0||url.pathname.indexOf('/platform/api/')===0||url.pathname.indexOf('/radz/api/')===0;
    }catch(_){return false}
  }

  function finish(){
    if(finished)return;
    finished=true;
    clearTimeout(readyTimer);
    root.classList.remove('site-booting');
    root.classList.add('site-ready');
    var style=document.getElementById('site-bootstrap-style');
    if(style)style.remove();
  }

  function schedule(){
    if(finished||!domReady||pending>0)return;
    clearTimeout(readyTimer);
    readyTimer=setTimeout(function(){if(domReady&&pending===0)finish()},60);
  }

  window.fetch=function(){
    var args=arguments;
    var watch=tracked(args[0]);
    if(watch){pending++;clearTimeout(readyTimer)}
    var result;
    try{result=originalFetch.apply(this,args)}catch(error){if(watch){pending=Math.max(0,pending-1);schedule()}throw error}
    if(!watch)return result;
    return Promise.resolve(result).finally(function(){pending=Math.max(0,pending-1);schedule()});
  };

  if(!domReady){
    document.addEventListener('DOMContentLoaded',function(){domReady=true;schedule()},{once:true});
  }else{
    schedule();
  }

  setTimeout(finish,2000);
})();
</script>`;

class HeadBootstrap{
  element(element){element.prepend(PAGE_BOOTSTRAP,{html:true})}
}

export async function onRequest(context){
  const response=await context.next();
  const headers=new Headers(response.headers);
  headers.set("content-security-policy",CSP);
  headers.set("x-content-type-options","nosniff");
  headers.set("x-frame-options","DENY");
  headers.set("referrer-policy","strict-origin-when-cross-origin");
  headers.set("permissions-policy","camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("cross-origin-opener-policy","same-origin-allow-popups");
  headers.set("strict-transport-security","max-age=31536000; includeSubDomains");
  if(new URL(context.request.url).pathname.startsWith("/admin"))headers.set("cache-control","no-store");

  const contentType=headers.get("content-type")||"";
  if(response.status===200&&contentType.includes("text/html")){
    headers.delete("content-length");
    const secured=new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    return new HTMLRewriter().on("head",new HeadBootstrap()).transform(secured);
  }

  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
