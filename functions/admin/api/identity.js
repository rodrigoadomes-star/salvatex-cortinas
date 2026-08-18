import {json} from './_auth.js';
import {resolveStore} from './_tenant.js';

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,message:'Banco de dados não configurado.'},503);
  const store=await resolveStore(context);
  if(!store)return json({ok:false,message:'Empresa não identificada para este domínio.'},404);
  return json({ok:true,store:{id:store.id,slug:store.slug,name:store.name,host:store.host}});
}
