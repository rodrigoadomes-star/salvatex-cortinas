import { json } from "../../_lib.js";
import { requireCustomer } from "../../_customer-auth.js";
import { requireStoreTenant } from "../../../_shared/tenant.js";

function parseObject(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function publicDelivery(value) {
  const d = parseObject(value);
  return { endereco:d.endereco||d.rua||"", numero:d.numero||"", complemento:d.complemento||"", bairro:d.bairro||"", cidade:d.cidade||"", estado:d.estado||"", cep:d.cep||"" };
}
function publicFreight(value) {
  const f = parseObject(value);
  return { gratis:Boolean(f.gratis), texto:f.texto||"", status:f.status||"", carrier:f.carrier||"", trackingCode:f.trackingCode||"", trackingUrl:f.trackingUrl||"" };
}
function publicPayment(value) {
  const p = parseObject(value);
  return { forma:p.forma||p.method||"", status:p.status||"" };
}

export async function onRequestGet(context) {
  const auth = await requireCustomer(context);
  if (!auth.ok) return auth.response;
  const tenantAuth = await requireStoreTenant(context,{allowPreview:true});
  if (!tenantAuth.ok) return tenantAuth.response;
  const id = context.params.id;
  const storeId = tenantAuth.tenant.storeId;
  const order = await context.env.DB.prepare(`SELECT id,order_number,status,stage,currency,customer_account_id,customer_email,delivery_json,freight_json,payment_json,subtotal_cents,freight_cents,discount_cents,total_cents,created_at,updated_at FROM orders WHERE id=?1 AND store_id=?2 AND (customer_account_id=?3 OR (?4=1 AND lower(customer_email)=lower(?5)))`).bind(id,storeId,auth.user.userId,auth.user.emailVerified?1:0,auth.user.email).first();
  if (!order) return json({ok:false,message:"Pedido não encontrado."},404);

  const [itemsResult,eventsResult] = await Promise.all([
    context.env.DB.prepare(`SELECT oi.id,oi.product_id,oi.category,oi.category_name,oi.sale_type,oi.configurator,oi.sku,oi.name,oi.image,oi.quantity,oi.unit_price_cents,oi.total_cents,oi.details_json,oi.data_json,oi.snapshot_json FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.order_id=?1 AND o.store_id=?2 ORDER BY oi.created_at,oi.id`).bind(id,storeId).all(),
    context.env.DB.prepare(`SELECT oe.event_type,oe.from_status,oe.to_status,oe.payload_json,oe.created_at FROM order_events oe JOIN orders o ON o.id=oe.order_id WHERE oe.order_id=?1 AND o.store_id=?2 ORDER BY oe.created_at,oe.id`).bind(id,storeId).all(),
  ]);
  const items = (itemsResult.results||[]).map(item=>({
    id:item.id, product_id:item.product_id, category:item.category, category_name:item.category_name,
    sale_type:item.sale_type, configurator:item.configurator, sku:item.sku, name:item.name, image:item.image,
    quantity:Number(item.quantity||1), unit_price_cents:Number(item.unit_price_cents||0), total_cents:Number(item.total_cents||0),
    details:parseObject(item.details_json), data:parseObject(item.data_json), snapshot:parseObject(item.snapshot_json),
  }));
  const invoices = (eventsResult.results||[]).filter(event=>event.event_type==="invoice_attached").map(event=>{
    const payload=parseObject(event.payload_json);
    return {key:payload.key||"",name:payload.name||"Documento",type:payload.type||"",createdAt:event.created_at};
  }).filter(document=>document.key.startsWith(`private/orders/${id}/`));
  const allowedStatuses=new Set(["aguardando_pagamento","pago","em_producao","pronto","enviado","entregue","cancelado","reembolsado"]);
  const timeline=(eventsResult.results||[]).filter(event=>["order_created","payment_approved","admin_status_changed","shipping_updated"].includes(event.event_type)).map(event=>({
    type:event.event_type,
    fromStatus:allowedStatuses.has(event.from_status)?event.from_status:null,
    toStatus:allowedStatuses.has(event.to_status)?event.to_status:null,
    createdAt:event.created_at,
  }));

  return json({ok:true,order:{
    id:order.id, order_number:order.order_number, status:order.status, stage:order.stage, currency:order.currency,
    subtotal_cents:order.subtotal_cents, freight_cents:order.freight_cents, discount_cents:order.discount_cents,
    total_cents:order.total_cents, created_at:order.created_at, updated_at:order.updated_at,
    delivery:publicDelivery(order.delivery_json), freight:publicFreight(order.freight_json), payment:publicPayment(order.payment_json),
  },items,invoices,timeline});
}
