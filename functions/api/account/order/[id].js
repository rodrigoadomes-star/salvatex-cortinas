import { json } from "../../_lib.js";
import { requireCustomer } from "../../_customer-auth.js";

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
  const id = context.params.id;
  const order = await context.env.DB.prepare(`SELECT id,order_number,status,stage,currency,customer_account_id,customer_email,delivery_json,freight_json,payment_json,subtotal_cents,freight_cents,discount_cents,total_cents,created_at,updated_at FROM orders WHERE id=?1 AND store_id='salvatex' AND (customer_account_id=?2 OR (?3=1 AND lower(customer_email)=lower(?4)))`).bind(id,auth.user.userId,auth.user.emailVerified?1:0,auth.user.email).first();
  if (!order) return json({ok:false,message:"Pedido não encontrado."},404);

  const [itemsResult,eventsResult] = await Promise.all([
    context.env.DB.prepare(`SELECT id,product_id,category,category_name,sale_type,configurator,sku,name,image,quantity,unit_price_cents,total_cents,details_json,data_json,snapshot_json FROM order_items WHERE order_id=?1 ORDER BY created_at,id`).bind(id).all(),
    context.env.DB.prepare(`SELECT event_type,payload_json,created_at FROM order_events WHERE order_id=?1 ORDER BY created_at DESC`).bind(id).all(),
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

  return json({ok:true,order:{
    id:order.id, order_number:order.order_number, status:order.status, stage:order.stage, currency:order.currency,
    subtotal_cents:order.subtotal_cents, freight_cents:order.freight_cents, discount_cents:order.discount_cents,
    total_cents:order.total_cents, created_at:order.created_at, updated_at:order.updated_at,
    delivery:publicDelivery(order.delivery_json), freight:publicFreight(order.freight_json), payment:publicPayment(order.payment_json),
  },items,invoices});
}

