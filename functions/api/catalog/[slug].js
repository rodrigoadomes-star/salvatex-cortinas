import { json } from "../_lib.js";
import { requireStoreTenant } from "../../_shared/tenant.js";

function parseJSON(value, fallback){
  try { return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}

export async function onRequestGet(context){
  if(!context.env.DB) return json({ok:false,message:"Banco indisponível"},503);
  const tenantAuth = await requireStoreTenant(context,{allowPreview:true});
  if(!tenantAuth.ok) return tenantAuth.response;
  const slug = String(context.params.slug || "").trim();
  if(!slug) return json({ok:false,message:"Produto não informado"},400);

  try {
    const p = await context.env.DB.prepare(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p
      LEFT JOIN categories c ON c.id=p.category_id
      WHERE p.store_id=?1 AND p.active=1 AND p.slug=?2
      LIMIT 1
    `).bind(tenantAuth.tenant.storeId,slug).first();

    if(!p) return json({ok:false,message:"Produto não encontrado"},404);

    return json({ok:true,product:{
      id:p.id,
      categoryId:p.category_id,
      categoryName:p.category_name||"",
      categorySlug:p.category_slug||"",
      name:p.name,
      slug:p.slug,
      sku:p.sku||"",
      productType:p.product_type,
      saleType:p.sale_type,
      configurator:p.configurator||"",
      description:p.description||"",
      basePriceCents:Number(p.base_price_cents||0),
      comparePriceCents:p.compare_price_cents==null?null:Number(p.compare_price_cents),
      stock:p.stock==null?null:Number(p.stock),
      trackStock:Boolean(p.track_stock),
      featured:Boolean(p.featured),
      imageUrl:p.image_url||"",
      images:parseJSON(p.images_json,[]),
      options:parseJSON(p.options_json,{}),
      metadata:parseJSON(p.metadata_json,{})
    }});
  } catch(error){
    console.error("catalog product error",error);
    return json({ok:false,message:"Não foi possível carregar o produto"},500);
  }
}
