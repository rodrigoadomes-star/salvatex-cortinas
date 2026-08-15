import {json,cleanText,validEmail} from './_lib.js';
import {sameOrigin,bodyWithin,requireTurnstile} from './_security.js';

async function hash(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'')));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}

export async function onRequestPost(context){
  if(!sameOrigin(context))return json({ok:false,message:'Origem não autorizada.'},403);
  if(!bodyWithin(context,12288))return json({ok:false,message:'Mensagem acima do limite.'},413);
  if(!context.env.DB)return json({ok:false,message:'Atendimento indisponível.'},503);
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:'Dados inválidos.'},400)}
  if(body.website)return json({ok:true,message:'Mensagem recebida.'});
  const turnstile=await requireTurnstile(context,body.turnstileToken);if(!turnstile.ok)return turnstile.response;
  const name=cleanText(body.name,120),email=cleanText(body.email,254).toLowerCase(),phone=cleanText(body.phone,30),message=cleanText(body.message,4000);
  if(name.length<2||!validEmail(email)||message.length<10)return json({ok:false,message:'Preencha nome, e-mail e uma mensagem com pelo menos 10 caracteres.'},400);
  const ipHash=await hash(context.request.headers.get('cf-connecting-ip')||'unknown'),cutoff=new Date(Date.now()-15*60*1000).toISOString();
  const recent=await context.env.DB.prepare('SELECT COUNT(*) n FROM contact_messages WHERE ip_hash=?1 AND created_at>?2').bind(ipHash,cutoff).first();
  if(Number(recent?.n||0)>=5)return json({ok:false,message:'Muitas mensagens enviadas. Aguarde alguns minutos.'},429);
  const account=await context.env.DB.prepare('SELECT id FROM customer_accounts WHERE lower(email)=?1 LIMIT 1').bind(email).first();
  const id=crypto.randomUUID(),now=new Date().toISOString();
  await context.env.DB.prepare(`INSERT INTO contact_messages(id,store_id,customer_account_id,name,email,phone,message,status,ip_hash,created_at,updated_at) VALUES(?1,'salvatex',?2,?3,?4,?5,?6,'unread',?7,?8,?8)`).bind(id,account?.id||null,name,email,phone,message,ipHash,now).run();
  return json({ok:true,message:'Mensagem enviada. A Salvatex responderá pelo e-mail ou telefone informado.'},201);
}

