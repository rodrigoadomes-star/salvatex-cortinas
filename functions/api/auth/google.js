import { json } from "../_lib.js";
import { signSession,sessionCookie,decodeJwtPart,base64urlBytes } from "../_customer-auth.js";
import { customerTenant,ensureMembership } from './_tenant-account.js';
function parse(v,f={}){try{return JSON.parse(v||'{}')}catch{return f}}
async function marketingClientId(db,storeId){
  if(!db)return'';
  try{
    const own=await db.prepare(`SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key='marketing_config'`).bind(storeId).first();
    const ownId=String(parse(own?.value_json,{}).google?.clientId||'');if(ownId)return ownId;
    const fallback=await db.prepare(`SELECT value_json FROM store_configs WHERE store_id='salvatex' AND config_key='marketing_config'`).first();
    return String(parse(fallback?.value_json,{}).google?.clientId||'');
  }catch{return''}
}
export async function onRequestPost(context){
  const tenant=await customerTenant(context,json);if(!tenant.ok)return tenant.response;
  let b={};try{b=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)};
  const jwt=String(b.credential||''),parts=jwt.split('.');if(parts.length!==3)return json({ok:false,message:'Token Google inválido.'},400);
  const header=decodeJwtPart(parts[0]),payload=decodeJwtPart(parts[1]);if(!header||!payload)return json({ok:false,message:'Token Google inválido.'},400);
  const clientId=String(context.env.GOOGLE_OAUTH_CLIENT_ID||await marketingClientId(context.env.DB,tenant.storeId)||'');if(!clientId)return json({ok:false,message:'Login Google ainda não foi configurado.'},503);
  if(payload.aud!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(payload.iss)||Number(payload.exp||0)*1000<Date.now()||payload.email_verified!==true)return json({ok:false,message:'Token Google não autorizado.'},401);
  const certs=await fetch('https://www.googleapis.com/oauth2/v3/certs',{cf:{cacheTtl:3600,cacheEverything:true}}).then(r=>r.json());
  const jwk=(certs.keys||[]).find(k=>k.kid===header.kid&&k.alg==='RS256');if(!jwk)return json({ok:false,message:'Não foi possível validar a assinatura Google.'},401);
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,base64urlBytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));if(!valid)return json({ok:false,message:'Assinatura Google inválida.'},401);
  const email=String(payload.email||'').toLowerCase(),now=new Date().toISOString();
  let account=await context.env.DB.prepare('SELECT id FROM customer_accounts WHERE email=?1').bind(email).first();const id=account?.id||crypto.randomUUID();
  if(account)await context.env.DB.prepare(`UPDATE customer_accounts SET google_sub=?1,name=?2,picture=?3,email_verified=1,updated_at=?4 WHERE id=?5`).bind(String(payload.sub),String(payload.name||''),String(payload.picture||''),now,id).run();
  else await context.env.DB.prepare(`INSERT INTO customer_accounts(id,email,name,google_sub,picture,provider,email_verified,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,'google',1,?6,?6)`).bind(id,email,String(payload.name||''),String(payload.sub),String(payload.picture||''),now).run();
  await ensureMembership(context.env.DB,tenant.storeId,id);
  const user={sub:id,userId:id,email,name:String(payload.name||''),picture:String(payload.picture||''),provider:'google',emailVerified:true,storeId:tenant.storeId};
  const token=await signSession(context,user);return json({ok:true,user},200,{'Set-Cookie':sessionCookie(token)});
}
