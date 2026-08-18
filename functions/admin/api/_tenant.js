export function requestHost(request){try{return new URL(request.url).hostname.toLowerCase()}catch{return ''}}

export async function resolveStore(context){
  const host=requestHost(context.request),db=context.env.DB;
  if(!db||!host)return null;

  try{
    const mapped=await db.prepare(`
      SELECT s.id,s.slug,s.name,s.active
      FROM platform_domains d
      JOIN platform_company_stores pcs ON pcs.company_id=d.company_id
      JOIN stores s ON s.id=pcs.store_id
      WHERE lower(d.hostname)=?1 AND d.status='active'
      LIMIT 1
    `).bind(host).first();
    if(mapped&&Number(mapped.active)!==0)return{id:String(mapped.id),slug:String(mapped.slug),name:String(mapped.name||mapped.slug),host};
  }catch{}

  if(host.endsWith('.radzhub.com.br')){
    const slug=host.slice(0,-'.radzhub.com.br'.length).split('.').filter(Boolean)[0]||'';
    if(!slug||['www','admin','app','api','radz'].includes(slug))return null;
    try{
      const row=await db.prepare('SELECT id,slug,name,active FROM stores WHERE slug=?1 LIMIT 1').bind(slug).first();
      if(row&&Number(row.active)!==0)return{id:String(row.id),slug:String(row.slug),name:String(row.name||row.slug),host};
    }catch{}
  }

  return null;
}

export async function requireStore(context,json){const store=await resolveStore(context);if(!store)return{ok:false,response:json({ok:false,code:'STORE_NOT_FOUND',message:'Empresa não identificada para este domínio.'},404)};return{ok:true,store}}
