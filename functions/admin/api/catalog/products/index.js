import { json, requireAdmin, clean, slugify, cents, logAdmin } from "../../_auth.js";
import { assertFeature, getEffectiveLimits } from "../../../../platform/api/_entitlements.js";
import { recordPlatformUsage } from "../../_platform-usage.js";

async function allowedCatalog(context,a){
  const enabled=await assertFeature(context.env.DB,a.companyId,"catalog");
  if(!enabled)return {ok:false,response:json({ok:false,code:"FEATURE_DISABLED",message:"O catálogo não está liberado para esta empresa."},403)};
  return {ok:true};
}

export async function onRequestGet(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;
  const entitlement=await allowedCatalog(context,a);if(!entitlement.ok)return entitlement.response;
  const rows=await context.env.DB.prepare(`SELECT p.*, c.name category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.store_id=?1 ORDER BY p.updated_at DESC`).bind(a.storeId).all();
  return json({ok:true,products:rows.results||[]});
}

export async function onRequestPost(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;
  const entitlement=await allowedCatalog(context,a);if(!entitlement.ok)return entitlement.response;

  const limits=await getEffectiveLimits(context.env.DB,a.companyId);
  const productLimit=limits.products_max==null?null:Number(limits.products_max);
  if(productLimit!=null){
    const usage=await context.env.DB.prepare("SELECT COUNT(*) total FROM products WHERE store_id=?1").bind(a.storeId).first();
    if(Number(usage?.total||0)>=productLimit){
      return json({ok:false,code:"PLAN_LIMIT_REACHED",message:`Limite de ${productLimit} produtos atingido.`,limit:productLimit,used:Number(usage?.total||0)},409);
    }
  }

  let b={};try{b=await context.request.json()}catch{return json({ok:false,message:"JSON inválido"},400)}
  const name=clean(b.name,240);if(!name)return json({ok:false,message:"Nome obrigatório"},400);
  const operationId=clean(b.operationId||context.request.headers.get('idempotency-key')||crypto.randomUUID(),160);

  // Quando o ledger avançado já estiver aplicado, uma repetição explícita do mesmo
  // operationId não deve criar outro produto. Sem a migration, o fluxo antigo permanece.
  try{
    const existing=await context.env.DB.prepare(`SELECT entity_id FROM platform_usage_events
      WHERE company_id=?1 AND usage_type='product_created' AND operation_id=?2 LIMIT 1`)
      .bind(a.companyId,operationId).first();
    if(existing?.entity_id){
      return json({ok:true,id:existing.entity_id,duplicate:true,operationId},200);
    }
  }catch(_){}

  const id=crypto.randomUUID(),now=new Date().toISOString();
  await context.env.DB.prepare(`INSERT INTO products(id,store_id,category_id,name,slug,sku,product_type,sale_type,configurator,description,base_price_cents,stock,track_stock,active,featured,image_url,images_json,options_json,metadata_json,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?20)`).bind(id,a.storeId,b.categoryId||null,name,slugify(b.slug||name),clean(b.sku,120),clean(b.productType||"pronta_entrega",80),clean(b.saleType||"pronta_entrega",80),clean(b.configurator,120)||null,clean(b.description,5000),cents(b.basePrice),b.stock===""||b.stock==null?null:Number(b.stock),b.trackStock?1:0,b.active===false?0:1,b.featured?1:0,clean(b.imageUrl,1000)||null,JSON.stringify(Array.isArray(b.images)?b.images:[]),JSON.stringify(b.options||{}),JSON.stringify(b.metadata||{}),now).run();
  await logAdmin(context.env.DB,"product_created","product",id,{name,operationId},a.storeId);
  await context.env.DB.prepare(`INSERT INTO platform_audit_logs(actor_user_id,company_id,action,target_type,target_id,metadata_json,created_at)
    VALUES(?1,?2,'product_created','product',?3,?4,?5)`).bind(a.user.id,a.companyId,id,JSON.stringify({name,storeId:a.storeId,operationId}),now).run().catch(()=>{});
  await recordPlatformUsage(context.env.DB,{companyId:a.companyId,usageType:'product_created',quantity:1,operationId,entityType:'product',entityId:id,metadata:{storeId:a.storeId}});
  return json({ok:true,id,operationId},201)
}
