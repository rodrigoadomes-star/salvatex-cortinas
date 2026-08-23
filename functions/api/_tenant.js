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
  try{
    const domainStore=await db.prepare(`SELECT s.id,s.slug,s.name,s.active
      FROM platform_domains d
      JOIN platform_company_stores pcs ON pcs.company_id=d.company_id
      JOIN stores s ON s.id=pcs.store_id
      WHERE lower(d.hostname)=?1 AND d.status='active'
      ORDER BY s.created_at LIMIT 1`).bind(host).first();
    if(domainStore&&Number(domainStore.active)!==0)return{id:String(domainStore.id),slug:String(domainStore.slug),name:String(domainStore.name||domainStore.slug),host};
    if(!slug)return null;
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

