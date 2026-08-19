import { json, requireAdmin, clean, slugify, cents, logAdmin } from "../../_auth.js";
async function columns(db){const info=await db.prepare('PRAGMA table_info(products)').all();return new Set((info.results||[]).map(r=>String(r.name||'')))}
async function uniqueSlug(db,storeId,value,id){const base=slugify(value)||`produto-${String(id).slice(0,8)}`;for(let i=0;i<50;i++){const candidate=i?`${base}-${i+1}`:base;const row=await db.prepare('SELECT id FROM products WHERE store_id=?1 AND slug=?2 AND id<>?3 LIMIT 1').bind(storeId,candidate,id).first();if(!row)return candidate}return `${base}-${crypto.randomUUID().slice(0,8)}`}
export async function onRequestPut(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;const storeId=a.storeId,id=String(context.params.id||''),requestId=crypto.randomUUID().slice(0,10);
  const current=await context.env.DB.prepare('SELECT id FROM products WHERE id=?1 AND store_id=?2 LIMIT 1').bind(id,storeId).first();if(!current)return json({ok:false,message:'Produto não encontrado.'},404);
  let b={};try{b=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
  const name=clean(b.name,240);if(!name)return json({ok:false,message:'Nome obrigatório.'},400);
  const categoryId=clean(b.categoryId,160)||null;if(categoryId){const category=await context.env.DB.prepare('SELECT id FROM categories WHERE id=?1 AND store_id=?2 LIMIT 1').bind(categoryId,storeId).first();if(!category)return json({ok:false,message:'A categoria selecionada não pertence a esta loja.'},422)}
  try{
    const cols=await columns(context.env.DB),slug=await uniqueSlug(context.env.DB,storeId,b.slug||name,id),now=new Date().toISOString();
    const values={category_id:categoryId,name,slug,sku:clean(b.sku,120)||null,product_type:clean(b.productType||b.saleType||'pronta_entrega',80)||'pronta_entrega',sale_type:clean(b.saleType||'pronta_entrega',80)||'pronta_entrega',configurator:clean(b.configurator,120)||null,description:clean(b.description,5000),base_price_cents:cents(b.basePrice),compare_price_cents:b.comparePrice==null||b.comparePrice===''?null:cents(b.comparePrice),stock:b.stock===''||b.stock==null?null:Math.max(0,Math.floor(Number(b.stock)||0)),track_stock:b.trackStock?1:0,active:b.active===false?0:1,featured:b.featured?1:0,image_url:clean(b.imageUrl,1000)||null,updated_at:now};
    const names=Object.keys(values).filter(k=>cols.has(k));if(!names.length)return json({ok:false,message:'Estrutura de produtos incompatível.'},503);
    const sql=names.map((k,i)=>`${k}=?${i+1}`).join(','),binds=names.map(k=>values[k]);binds.push(id,storeId);
    await context.env.DB.prepare(`UPDATE products SET ${sql} WHERE id=?${names.length+1} AND store_id=?${names.length+2}`).bind(...binds).run();
    await logAdmin(context.env.DB,'product_updated','product',id,{name,slug},storeId);return json({ok:true,slug});
  }catch(error){console.error('[product update]',requestId,storeId,String(error?.message||error));return json({ok:false,message:`Não foi possível atualizar o produto. Referência: ${requestId}.`},500)}
}
export async function onRequestDelete(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;const storeId=a.storeId,id=String(context.params.id||'');
  const exists=await context.env.DB.prepare('SELECT id FROM products WHERE id=?1 AND store_id=?2 LIMIT 1').bind(id,storeId).first();if(!exists)return json({ok:false,message:'Produto não encontrado.'},404);
  await context.env.DB.prepare('DELETE FROM products WHERE id=?1 AND store_id=?2').bind(id,storeId).run();await logAdmin(context.env.DB,'product_deleted','product',id,null,storeId);return json({ok:true});
}
