import { json, requireAdmin, clean, slugify, cents, logAdmin } from "../../_auth.js";

async function productColumns(db){const info=await db.prepare('PRAGMA table_info(products)').all();return new Set((info.results||[]).map(r=>String(r.name||'')))}
async function uniqueSlug(db,storeId,value,excludeId=''){const base=slugify(value)||`produto-${crypto.randomUUID().slice(0,8)}`;for(let i=0;i<50;i++){const candidate=i?`${base}-${i+1}`:base;let q='SELECT id FROM products WHERE store_id=?1 AND slug=?2';const binds=[storeId,candidate];if(excludeId){q+=' AND id<>?3';binds.push(excludeId)}const row=await db.prepare(q+' LIMIT 1').bind(...binds).first();if(!row)return candidate}return `${base}-${crypto.randomUUID().slice(0,8)}`}
function safeJson(value,fallback){try{return JSON.stringify(value??fallback)}catch{return JSON.stringify(fallback)}}

export async function onRequestGet(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;const storeId=a.storeId;
  try{const rows=await context.env.DB.prepare(`SELECT p.*, c.name category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id AND c.store_id=p.store_id WHERE p.store_id=?1 ORDER BY p.updated_at DESC`).bind(storeId).all();return json({ok:true,products:rows.results||[]})}
  catch(error){console.error('[products list]',storeId,error);return json({ok:false,message:'Não foi possível carregar os produtos.'},500)}
}

export async function onRequestPost(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;const storeId=a.storeId,requestId=crypto.randomUUID().slice(0,10);
  let b={};try{b=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
  const name=clean(b.name,240);if(!name)return json({ok:false,message:'Nome obrigatório.'},400);
  let categoryId=clean(b.categoryId,160)||null;
  if(categoryId){const category=await context.env.DB.prepare('SELECT id FROM categories WHERE id=?1 AND store_id=?2 LIMIT 1').bind(categoryId,storeId).first();if(!category)return json({ok:false,message:'A categoria selecionada não pertence a esta loja.'},422)}
  try{
    const columns=await productColumns(context.env.DB),required=['id','store_id','name','slug','created_at','updated_at'];
    const missing=required.filter(x=>!columns.has(x));if(missing.length)return json({ok:false,code:'PRODUCT_SCHEMA_INCOMPLETE',message:`Estrutura de produtos incompleta: ${missing.join(', ')}.`},503);
    const id=crypto.randomUUID(),now=new Date().toISOString(),slug=await uniqueSlug(context.env.DB,storeId,b.slug||name);
    const values={id,store_id:storeId,category_id:categoryId,name,slug,sku:clean(b.sku,120)||null,product_type:clean(b.productType||b.saleType||'pronta_entrega',80)||'pronta_entrega',sale_type:clean(b.saleType||'pronta_entrega',80)||'pronta_entrega',configurator:clean(b.configurator,120)||null,description:clean(b.description,5000),base_price_cents:cents(b.basePrice),compare_price_cents:b.comparePrice==null||b.comparePrice===''?null:cents(b.comparePrice),stock:b.stock===''||b.stock==null?null:Math.max(0,Math.floor(Number(b.stock)||0)),track_stock:b.trackStock?1:0,active:b.active===false?0:1,featured:b.featured?1:0,image_url:clean(b.imageUrl,1000)||null,images_json:safeJson(Array.isArray(b.images)?b.images:[],[]),options_json:safeJson(b.options||{},{}),metadata_json:safeJson(b.metadata||{},{}),created_at:now,updated_at:now};
    const names=Object.keys(values).filter(k=>columns.has(k)),binds=names.map(k=>values[k]),placeholders=names.map((_,i)=>`?${i+1}`).join(',');
    await context.env.DB.prepare(`INSERT INTO products(${names.join(',')}) VALUES(${placeholders})`).bind(...binds).run();
    await logAdmin(context.env.DB,'product_created','product',id,{name,slug},storeId);
    return json({ok:true,id,slug},201);
  }catch(error){console.error('[product create]',requestId,storeId,String(error?.message||error));const msg=String(error?.message||'').toLowerCase();if(msg.includes('unique'))return json({ok:false,code:'PRODUCT_CONFLICT',message:'Já existe um produto com este identificador. Tente novamente.'},409);return json({ok:false,code:'PRODUCT_CREATE_FAILED',message:`Não foi possível salvar o produto. Referência: ${requestId}.`},500)}
}
