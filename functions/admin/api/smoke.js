import { json, requireAdmin } from './_auth.js';

export async function onRequestGet(context){
  const auth=await requireAdmin(context);if(!auth.ok)return auth.response;
  const db=context.env.DB,storeId=auth.storeId;
  const checks={};
  const queries={products:`SELECT COUNT(*) n FROM products WHERE store_id=?1`,categories:`SELECT COUNT(*) n FROM categories WHERE store_id=?1`,orders:`SELECT COUNT(*) n FROM orders WHERE store_id=?1`,customers:`SELECT COUNT(*) n FROM customers WHERE store_id=?1`,pages:`SELECT COUNT(*) n FROM pages WHERE store_id=?1`,coupons:`SELECT COUNT(*) n FROM coupons WHERE store_id=?1`};
  for(const [name,sql] of Object.entries(queries)){
    try{const row=await db.prepare(sql).bind(storeId).first();checks[name]={ok:true,count:Number(row?.n||0)}}catch(error){checks[name]={ok:false,error:String(error?.message||error).slice(0,180)}}
  }
  const company=await db.prepare(`SELECT company_id FROM platform_company_stores WHERE store_id=?1 LIMIT 1`).bind(storeId).first().catch(()=>null);
  let features=[];if(company?.company_id){const r=await db.prepare(`SELECT feature_key,enabled FROM platform_features WHERE company_id=?1 ORDER BY feature_key`).bind(company.company_id).all().catch(()=>({results:[]}));features=r.results||[]}
  return json({ok:Object.values(checks).every(x=>x.ok),store:auth.store,companyId:company?.company_id||null,checks,features});
}
