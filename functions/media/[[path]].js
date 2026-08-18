import {resolvePublicStore} from '../api/_tenant.js';
function safeStore(s){return String(s||'tenant').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'tenant'}
export async function onRequestGet(context){
  if(!context.env.MEDIA)return new Response("MEDIA_NOT_CONFIGURED",{status:503});
  const store=await resolvePublicStore(context);if(!store)return new Response("NOT_FOUND",{status:404});
  const key=Array.isArray(context.params.path)?context.params.path.join("/"):String(context.params.path||"");if(!key||key.startsWith("private/"))return new Response("NOT_FOUND",{status:404,headers:{"cache-control":"no-store"}});
  const tenantPrefix=`tenants/${safeStore(store.id)}/configuradores/`,legacyAllowed=store.id==='salvatex'&&key.startsWith('configuradores/');if(!key.startsWith(tenantPrefix)&&!legacyAllowed)return new Response("NOT_FOUND",{status:404,headers:{"cache-control":"no-store"}});
  const object=await context.env.MEDIA.get(key);if(!object)return new Response("NOT_FOUND",{status:404});const metadataStore=String(object.customMetadata?.storeId||'');if(metadataStore&&metadataStore!==store.id)return new Response("NOT_FOUND",{status:404});
  const headers=new Headers();object.writeHttpMetadata(headers);headers.set("etag",object.httpEtag);headers.set("cache-control","public, max-age=31536000, immutable");headers.set("x-content-type-options","nosniff");headers.set("content-security-policy","default-src 'none'; sandbox");return new Response(object.body,{headers});
}
