const CSP=["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","form-action 'self' https://accounts.google.com","script-src 'self' 'unsafe-inline' https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net","style-src 'self' 'unsafe-inline' https://accounts.google.com","img-src 'self' data: blob: https://*.googleusercontent.com https://www.facebook.com https://www.google-analytics.com https://www.googletagmanager.com","font-src 'self' data:","connect-src 'self' https://accounts.google.com https://challenges.cloudflare.com https://oauth2.googleapis.com https://openidconnect.googleapis.com https://www.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://www.facebook.com https://graph.facebook.com","frame-src https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com","media-src 'self' blob:","worker-src 'self' blob:","upgrade-insecure-requests"].join("; ");

const PAGE_BOOTSTRAP=`
<style id="site-bootstrap-style">
  @view-transition{navigation:auto}
  html.site-booting{background:#fbfaf8}
  html.site-booting body{visibility:hidden!important}
  html.configurator-booting body{visibility:hidden!important}
  ::view-transition-old(root){animation:site-hold-old .65s linear both;z-index:2}
  ::view-transition-new(root){animation:site-show-new .65s linear both;z-index:1}
  @keyframes site-hold-old{0%,92%{opacity:1}100%{opacity:0}}
  @keyframes site-show-new{0%,92%{opacity:0}100%{opacity:1}}
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
  var prefetched={};
  function tracked(input){try{var raw=typeof input==='string'?input:(input&&input.url)||'';var url=new URL(raw,location.href);if(url.origin!==location.origin)return false;return url.pathname.indexOf('/api/')===0||url.pathname.indexOf('/admin/api/')===0||url.pathname.indexOf('/platform/api/')===0||url.pathname.indexOf('/radz/api/')===0;}catch(_){return false;}}
  function finish(){if(finished)return;finished=true;clearTimeout(readyTimer);root.classList.remove('site-booting');root.classList.add('site-ready');}
  function schedule(){if(finished||!domReady||pending>0)return;clearTimeout(readyTimer);readyTimer=setTimeout(function(){if(domReady&&pending===0)finish();},20);}
  window.fetch=function(){var args=arguments;var watch=tracked(args[0]);if(watch){pending++;clearTimeout(readyTimer);}var result;try{result=originalFetch.apply(this,args);}catch(error){if(watch){pending=Math.max(0,pending-1);schedule();}throw error;}if(!watch)return result;return Promise.resolve(result).finally(function(){pending=Math.max(0,pending-1);schedule();});};
  function internalLink(anchor){if(!anchor||!anchor.href||anchor.target||anchor.hasAttribute('download'))return null;try{var url=new URL(anchor.href,location.href);if(url.origin!==location.origin)return null;if(url.pathname===location.pathname&&url.search===location.search)return null;return url;}catch(_){return null;}}
  function prefetch(anchor){var url=internalLink(anchor);if(!url||prefetched[url.href])return;prefetched[url.href]=true;originalFetch(url.href,{method:'GET',credentials:'same-origin',cache:'force-cache'}).catch(function(){});}
  document.addEventListener('pointerover',function(e){var a=e.target&&e.target.closest?e.target.closest('a'):null;prefetch(a);},{passive:true});
  document.addEventListener('touchstart',function(e){var a=e.target&&e.target.closest?e.target.closest('a'):null;prefetch(a);},{passive:true});
  if(!domReady){document.addEventListener('DOMContentLoaded',function(){domReady=true;schedule();},{once:true});}else{schedule();}
  setTimeout(finish,1000);
})();
</script>`;

const ANALYTICS_SCRIPT='<script src="/js/radz-analytics.js" defer></script>';
const NO_ANALYTICS_PREFIXES=['/admin','/radz-admin','/platform-admin','/platform','/login','/cadastro','/api/','/radz/api/'];
function shouldTrack(pathname){return !NO_ANALYTICS_PREFIXES.some(prefix=>pathname.startsWith(prefix));}

class HeadBootstrap{
  constructor(track){this.track=track;}
  element(element){
    element.prepend(PAGE_BOOTSTRAP,{html:true});
    if(this.track)element.append(ANALYTICS_SCRIPT,{html:true});
  }
}
class ConfiguratorHtml{element(element){element.setAttribute('class',((element.getAttribute('class')||'')+' configurator-booting').trim());}}
class ProductionConfiguratorScripts{element(element){element.append('<script src="/js/configurador-media-strict.js?v=media-stable-20260817-1"></script><script src="/js/configurador-media-forro.js?v=media-stable-20260817-1"></script><script>(function(){var root=document.documentElement;function reveal(){setTimeout(function(){requestAnimationFrame(function(){requestAnimationFrame(function(){root.classList.remove(\"configurator-booting\");});});},0);}Promise.resolve(window.CONFIG_READY).then(reveal).catch(reveal);setTimeout(reveal,1800);})();</script>',{html:true});}}

export async function onRequest(context){
  const url=new URL(context.request.url);
  const pathname=url.pathname;
  const response=await context.next();
  const headers=new Headers(response.headers);
  headers.set("content-security-policy",CSP);
  headers.set("x-content-type-options","nosniff");
  headers.set("x-frame-options","DENY");
  headers.set("referrer-policy","strict-origin-when-cross-origin");
  headers.set("permissions-policy","camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("cross-origin-opener-policy","same-origin-allow-popups");
  headers.set("strict-transport-security","max-age=31536000; includeSubDomains");
  if(pathname.startsWith("/admin")||pathname.startsWith('/radz-admin')||pathname.startsWith('/platform-admin'))headers.set("cache-control","no-store");

  const contentType=headers.get("content-type")||"";
  if(response.status===200&&contentType.includes("text/html")&&typeof HTMLRewriter!=="undefined"){
    headers.delete("content-length");
    const secured=new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    let rewriter=new HTMLRewriter().on("head",new HeadBootstrap(shouldTrack(pathname)));
    if(pathname==="/configurador"||pathname==="/configurador.html"){
      rewriter=rewriter.on("html",new ConfiguratorHtml()).on("body",new ProductionConfiguratorScripts());
    }
    return rewriter.transform(secured);
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
