const CSP=["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","form-action 'self' https://accounts.google.com","script-src 'self' 'unsafe-inline' https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net","style-src 'self' 'unsafe-inline' https://accounts.google.com","img-src 'self' data: blob: https://*.googleusercontent.com https://www.facebook.com https://www.google-analytics.com https://www.googletagmanager.com","font-src 'self' data:","connect-src 'self' https://accounts.google.com https://challenges.cloudflare.com https://oauth2.googleapis.com https://openidconnect.googleapis.com https://www.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://www.facebook.com https://graph.facebook.com","frame-src https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com","media-src 'self' blob:","worker-src 'self' blob:","upgrade-insecure-requests"].join("; ");

class ProductionConfiguratorScripts{
  element(element){
    element.append('<script src="/js/configurador-media-forro.js?v=20260816-prod-stock-2"></script>',{html:true});
  }
}

class ProductionAdminScripts{
  element(element){
    element.append('<script src="/js/admin-configurator-combination-stock.js?v=20260816-prod-stock-2"></script>',{html:true});
  }
}

export async function onRequest(context){
  const url=new URL(context.request.url);
  const response=await context.next();
  const headers=new Headers(response.headers);
  headers.set("content-security-policy",CSP);
  headers.set("x-content-type-options","nosniff");
  headers.set("x-frame-options","DENY");
  headers.set("referrer-policy","strict-origin-when-cross-origin");
  headers.set("permissions-policy","camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("cross-origin-opener-policy","same-origin-allow-popups");
  headers.set("strict-transport-security","max-age=31536000; includeSubDomains");
  if(url.pathname.startsWith("/admin"))headers.set("cache-control","no-store");

  const contentType=headers.get("content-type")||"";
  if(response.status===200&&contentType.includes("text/html")){
    headers.delete("content-length");
    const secured=new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    let rewriter=new HTMLRewriter();

    if(url.pathname==="/configurador"||url.pathname==="/configurador.html"){
      rewriter=rewriter.on("body",new ProductionConfiguratorScripts());
    }

    if(url.pathname==="/admin"||url.pathname==="/admin/"||url.pathname==="/admin/index.html"){
      rewriter=rewriter.on("body",new ProductionAdminScripts());
    }

    return rewriter.transform(secured);
  }

  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}