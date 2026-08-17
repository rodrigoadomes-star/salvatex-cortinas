import { requireStoreTenant } from "../_shared/tenant.js";
function xml(v){return String(v??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]))}
export async function onRequestGet(context){
  if(!context.env.DB)return new Response('Banco indisponível',{status:503});
  const tenant=await requireStoreTenant(context,{allowPreview:true});if(!tenant.ok)return tenant.response;
  const storeId=tenant.tenant.storeId;
  const [store,rows]=await Promise.all([
    context.env.DB.prepare(`SELECT name FROM stores WHERE id=?1 LIMIT 1`).bind(storeId).first(),
    context.env.DB.prepare(`SELECT id,name,slug,description,base_price_cents,stock,track_stock,image_url FROM products WHERE store_id=?1 AND active=1 ORDER BY updated_at DESC`).bind(storeId).all()
  ]);
  const origin=new URL(context.request.url).origin;
  const brand=store?.name||'Loja';
  const items=(rows.results||[]).map(p=>`<item><g:id>${xml(p.id)}</g:id><g:title>${xml(p.name)}</g:title><g:description>${xml(p.description||p.name)}</g:description><g:link>${xml(origin+'/produto.html?slug='+encodeURIComponent(p.slug))}</g:link><g:image_link>${xml(p.image_url?new URL(p.image_url,origin).toString():'')}</g:image_link><g:availability>${p.track_stock&&Number(p.stock||0)<=0?'out_of_stock':'in_stock'}</g:availability><g:price>${(Number(p.base_price_cents||0)/100).toFixed(2)} BRL</g:price><g:condition>new</g:condition><g:brand>${xml(brand)}</g:brand></item>`).join('');
  const body=`<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>${xml(brand)}</title><link>${xml(origin)}</link><description>${xml('Produtos '+brand)}</description>${items}</channel></rss>`;
  return new Response(body,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public,max-age=900'}})
}
