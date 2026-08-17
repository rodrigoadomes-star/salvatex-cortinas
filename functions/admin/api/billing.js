import { json } from "./_auth.js";
import { requireAdminPermission } from "./_permissions.js";

export async function onRequestGet(context){
 const auth=await requireAdminPermission(context,"company.finance.read");if(!auth.ok)return auth.response;
 const db=context.env.DB,month=new Date().toISOString().slice(0,7);
 const billing=await db.prepare(`SELECT s.platform_fee_minimum_cents,
   COALESCE(pc.platform_fee_basis_points,CAST(ROUND(s.platform_fee_percent*10000) AS INTEGER),100) fee_basis_points,
   COALESCE(pc.plan_code,'free') plan_code
   FROM stores s
   LEFT JOIN platform_company_stores pcs ON pcs.store_id=s.id
   LEFT JOIN platform_companies pc ON pc.id=pcs.company_id
   WHERE s.id=?1`).bind(auth.storeId).first();
 const row=await db.prepare(`SELECT COALESCE(SUM(total_cents),0) gross FROM orders WHERE store_id=?1 AND substr(created_at,1,7)=?2 AND status NOT IN ('cancelado','reembolsado')`).bind(auth.storeId,month).first();
 const gross=Number(row?.gross||0),basisPoints=Number(billing?.fee_basis_points??100),percent=basisPoints/10000,minimum=Number(billing?.platform_fee_minimum_cents||15000),calculated=Math.round(gross*percent),due=Math.max(minimum,calculated);
 return json({ok:true,referenceMonth:month,planCode:String(billing?.plan_code||"free"),feeBasisPoints:basisPoints,grossSalesCents:gross,feePercent:percent,minimumFeeCents:minimum,calculatedFeeCents:calculated,amountDueCents:due});
}
