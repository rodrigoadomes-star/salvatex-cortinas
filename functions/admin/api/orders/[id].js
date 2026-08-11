import { json, requireAdmin, clean, parseJson, logAdmin } from "../_auth.js";
const ALLOWED=["aguardando_pagamento","pago","em_producao","pronto","enviado","entregue","cancelado","reembolsado"];
export async function onRequestGet(context){
  const auth=requireAdmin(context); if(!auth.ok)return auth.response; const id=context.params.id; const db=context.env.DB;
  const order=await db.prepare(`SELECT * FROM orders WHERE id=?1 AND store_id='salvatex'`).bind(id).first(); if(!order)return json({ok:false,message:"Pedido não encontrado."},404);
  const items=await db.prepare(`SELECT * FROM order_items WHERE order_id=?1 ORDER BY created_at`).bind(id).all();
  const events=await db.prepare(`SELECT * FROM order_events WHERE order_id=?1 ORDER BY created_at DESC LIMIT 100`).bind(id).all();
  return json({ok:true,order:{...order,customer:parseJson(order.customer_json,{}),delivery:parseJson(order.delivery_json,{}),freight:parseJson(order.freight_json,null),payment:parseJson(order.payment_json,{}),antifraud:parseJson(order.antifraud_json,{}),deadlines:parseJson(order.deadlines_json,null)},items:items.results||[],events:events.results||[]});
}
export async function onRequestPatch(context){
  const auth=requireAdmin(context); if(!auth.ok)return auth.response; const id=context.params.id; const db=context.env.DB; let body={}; try{body=await context.request.json();}catch{return json({ok:false,message:"JSON inválido."},400)}
  const current=await db.prepare(`SELECT status,stage FROM orders WHERE id=?1 AND store_id='salvatex'`).bind(id).first(); if(!current)return json({ok:false,message:"Pedido não encontrado."},404);
  const status=clean(body.status||current.status,80); const stage=clean(body.stage||current.stage,80); if(!ALLOWED.includes(status))return json({ok:false,message:"Status inválido."},400);
  const now=new Date().toISOString(); await db.batch([
    db.prepare(`UPDATE orders SET status=?1, stage=?2, updated_at=?3 WHERE id=?4`).bind(status,stage,now,id),
    db.prepare(`INSERT INTO order_events(order_id,event_type,from_status,to_status,payload_json,created_at) VALUES(?1,'admin_status_changed',?2,?3,?4,?5)`).bind(id,current.status,status,JSON.stringify({stage}),now)
  ]); await logAdmin(db,"order_status_changed","order",id,{from:current.status,to:status,stage});
  return json({ok:true,status,stage,updatedAt:now});
}
