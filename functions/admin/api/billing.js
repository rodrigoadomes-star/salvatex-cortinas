import { json, requireAdmin } from "./_auth.js";
export async function onRequestGet(context){
 const auth=await requireAdmin(context);if(!auth.ok)return auth.response; const db=context.env.DB; const month=new Date().toISOString().slice(0,7);
 const store=await db.prepare(`SELECT platform_fee_percent,platform_fee_minimum_cents FROM stores WHERE id='salvatex'`).first();
 const row=await db.prepare(`SELECT COALESCE(SUM(total_cents),0) gross FROM orders WHERE store_id='salvatex' AND substr(created_at,1,7)=?1 AND status NOT IN ('cancelado','reembolsado')`).bind(month).first();
 const gross=Number(row?.gross||0), percent=Number(store?.platform_fee_percent||.01), minimum=Number(store?.platform_fee_minimum_cents||15000), calculated=Math.round(gross*percent), due=Math.max(minimum,calculated);
 return json({ok:true,referenceMonth:month,grossSalesCents:gross,feePercent:percent,minimumFeeCents:minimum,calculatedFeeCents:calculated,amountDueCents:due});
}
