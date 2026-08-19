function normalizeHost(host){return String(host||'').trim().toLowerCase().replace(/\.+$/,'')}

export function requestHost(request){
  try{return normalizeHost(new URL(request.url).hostname)}catch{return ''}
}

export function tenantSlugFromHost(host){
  const h=normalizeHost(host);
  if(!h.endsWith('.radzhub.com.br'))return '';
  const slug=h.slice(0,-'.radzhub.com.br'.length).split('.').filter(Boolean)[0]||'';
  if(!slug||['www','admin','app','api','radz'].includes(slug))return '';
  return slug;
}

export async function resolvePublicStore(context){
  const db=context.env.DB;
  if(!db)return null;
  const host=requestHost(context.request),slug=tenantSlugFromHost(host);
  if(!slug)return null;
  try{
    const row=await db.prepare('SELECT id,slug,name,active FROM stores WHERE slug=?1 LIMIT 1').bind(slug).first();
    if(!row||Number(row.active)===0)return null;
    return {id:String(row.id),slug:String(row.slug),name:String(row.name||row.slug),host};
  }catch{return null}
}

export async function requirePublicStore(context,json){
  const store=await resolvePublicStore(context);
  if(!store)return {ok:false,response:json({ok:false,code:'STORE_NOT_FOUND',message:'Empresa não identificada para este domínio.'},404)};
  return {ok:true,store,storeId:store.id};
}
