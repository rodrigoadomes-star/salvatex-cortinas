import {requireCustomer} from "../_customer-auth.js";
import {json} from "../_lib.js";
import {requirePublicStore} from "../_tenant.js";
function safeStore(s){return String(s||'tenant').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'tenant'}
export async function onRequestGet(context){
  const a=await requireCustomer(context);if(!a.ok)return a.response;if(!context.env.MEDIA)return json({ok:false,message:'R2 indisponível.'},503);const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;const storeId=tenant.storeId;
  const u=new URL(context.request.url),orderId=u.searchParams.get('orderId')||'',key=u.searchParams.get('key')||'',tenantPrefix=`private/orders/${safeStore(storeId)}/${orderId}/`,legacyPrefix=`private/orders/${orderId}/`;if(!key.startsWith(tenantPrefix)&&!(storeId==='salvatex'&&key.startsWith(legacyPrefix)))return json({ok:false,message:'Documento inválido.'},400);
  const o=await context.env.DB.prepare(`SELECT id FROM orders WHERE id=?1 AND store_id=?2 AND (customer_account_id=?3 OR (?4=1 AND lower(customer_email)=lower(?5)))`).bind(orderId,storeId,a.user.userId,a.user.emailVerified?1:0,a.user.email).first();if(!o)return json({ok:false,message:'Pedido não encontrado.'},404);
  const obj=await context.env.MEDIA.get(key);if(!obj)return json({ok:false,message:'Arquivo não encontrado.'},404);const metadataStore=String(obj.customMetadata?.storeId||'');if(metadataStore&&metadataStore!==storeId)return json({ok:false,message:'Documento não pertence a esta empresa.'},403);
  const headers=new Headers();headers.set('content-type',obj.httpMetadata?.contentType||'application/octet-stream');headers.set('content-disposition',`attachment; filename="${key.split('/').pop().replace(/\"/g,'')}"`);headers.set('cache-control','private, no-store');return new Response(obj.body,{headers})
}
