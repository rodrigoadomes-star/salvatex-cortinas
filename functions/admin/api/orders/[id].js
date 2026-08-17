import { json, clean, parseJson, logAdmin } from "../_auth.js";
import { requireAdminPermission } from "../_permissions.js";

const ALLOWED = [
  "aguardando_pagamento",
  "pago",
  "em_producao",
  "pronto",
  "enviado",
  "entregue",
  "cancelado",
  "reembolsado"
];

const STAGE_BY_STATUS = {
  aguardando_pagamento: "pagamento",
  pago: "producao",
  em_producao: "producao",
  pronto: "expedicao",
  enviado: "transporte",
  entregue: "concluido",
  cancelado: "cancelado",
  reembolsado: "reembolsado"
};

function safeObject(value, fallback = {}) {
  const parsed = parseJson(value, fallback);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
}

export async function onRequestGet(context) {
  const auth = await requireAdminPermission(context,"company.orders.read");
  if (!auth.ok) return auth.response;

  const id = context.params.id;
  const db = context.env.DB;

  const order = await db
    .prepare(`SELECT * FROM orders WHERE id=?1 AND store_id=?2`)
    .bind(id,auth.storeId)
    .first();

  if (!order) {
    return json({ ok: false, message: "Pedido não encontrado." }, 404);
  }

  const items = await db
    .prepare(`SELECT oi.* FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.order_id=?1 AND o.store_id=?2 ORDER BY oi.created_at, oi.id`)
    .bind(id,auth.storeId)
    .all();

  const events = await db
    .prepare(`SELECT oe.* FROM order_events oe JOIN orders o ON o.id=oe.order_id WHERE oe.order_id=?1 AND o.store_id=?2 ORDER BY oe.created_at DESC, oe.id DESC LIMIT 150`)
    .bind(id,auth.storeId)
    .all();

  return json({
    ok: true,
    order: {
      ...order,
      customer: safeObject(order.customer_json),
      delivery: safeObject(order.delivery_json),
      freight: safeObject(order.freight_json),
      payment: safeObject(order.payment_json),
      antifraud: safeObject(order.antifraud_json),
      deadlines: safeObject(order.deadlines_json),
      totalsByCategory: safeObject(order.totals_by_category_json)
    },
    items: (items.results || []).map((item) => ({
      ...item,
      details: safeObject(item.details_json),
      data: safeObject(item.data_json),
      snapshot: safeObject(item.snapshot_json)
    })),
    events: (events.results || []).map((event) => ({
      ...event,
      payload: safeObject(event.payload_json)
    }))
  });
}

export async function onRequestPatch(context) {
  const auth = await requireAdminPermission(context,"company.orders.write");
  if (!auth.ok) return auth.response;

  const id = context.params.id;
  const db = context.env.DB;

  let body = {};
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, message: "JSON inválido." }, 400);
  }

  const current = await db
    .prepare(`SELECT status, stage, internal_notes, freight_json, payment_json FROM orders WHERE id=?1 AND store_id=?2`)
    .bind(id,auth.storeId)
    .first();

  if (!current) {
    return json({ ok: false, message: "Pedido não encontrado." }, 404);
  }

  const status = clean(body.status || current.status, 80);
  if (!ALLOWED.includes(status)) {
    return json({ ok: false, message: "Status inválido." }, 400);
  }

  const requestedStage = clean(body.stage || "", 80);
  const stage = requestedStage || STAGE_BY_STATUS[status] || current.stage;
  const internalNotes = body.internalNotes === undefined
    ? String(current.internal_notes || "")
    : clean(body.internalNotes, 5000);

  const freight = safeObject(current.freight_json);
  if (body.freight && typeof body.freight === "object") {
    const f = body.freight;
    if (f.carrier !== undefined) freight.carrier = clean(f.carrier, 120);
    if (f.trackingCode !== undefined) freight.trackingCode = clean(f.trackingCode, 160);
    if (f.trackingUrl !== undefined) freight.trackingUrl = clean(f.trackingUrl, 800);
    if (f.status !== undefined) freight.status = clean(f.status, 100);
    if (f.shippedAt !== undefined) freight.shippedAt = clean(f.shippedAt, 80);
  }

  if (status === "enviado" && !freight.shippedAt) {
    freight.shippedAt = new Date().toISOString();
  }

  const payment = safeObject(current.payment_json);
  if (body.payment && typeof body.payment === "object") {
    const p = body.payment;
    if (p.status !== undefined) payment.status = clean(p.status, 100);
    if (p.forma !== undefined) payment.forma = clean(p.forma, 100);
    if (p.externalId !== undefined) payment.externalId = clean(p.externalId, 240);
  }

  if (status === "pago" && !payment.status) {
    payment.status = "aprovado_manual";
  }

  const now = new Date().toISOString();
  const changedStatus = current.status !== status;
  const internalNotesChanged = internalNotes !== String(current.internal_notes || "");

  const payload = {
    status,
    stage,
    internalNotesChanged,
    freight,
    payment
  };

  const statements = [
    db.prepare(`UPDATE orders
      SET status=?1,
          stage=?2,
          internal_notes=?3,
          freight_json=?4,
          payment_json=?5,
          updated_at=?6
      WHERE id=?7 AND store_id=?8`)
      .bind(status, stage, internalNotes, JSON.stringify(freight), JSON.stringify(payment), now, id, auth.storeId)
  ];

  if (changedStatus) {
    statements.push(
      db.prepare(`INSERT INTO order_events(order_id,event_type,from_status,to_status,payload_json,created_at)
        SELECT ?1,'admin_status_changed',?2,?3,?4,?5
        WHERE EXISTS(SELECT 1 FROM orders WHERE id=?1 AND store_id=?6)`)
        .bind(id, current.status, status, JSON.stringify(payload), now, auth.storeId)
    );
  } else if (internalNotesChanged) {
    statements.push(
      db.prepare(`INSERT INTO order_events(order_id,event_type,from_status,to_status,payload_json,created_at)
        SELECT ?1,'admin_internal_note_updated',?2,?3,?4,?5
        WHERE EXISTS(SELECT 1 FROM orders WHERE id=?1 AND store_id=?6)`)
        .bind(id, current.status, status, JSON.stringify(payload), now, auth.storeId)
    );
  } else {
    statements.push(
      db.prepare(`INSERT INTO order_events(order_id,event_type,from_status,to_status,payload_json,created_at)
        SELECT ?1,'admin_order_updated',?2,?3,?4,?5
        WHERE EXISTS(SELECT 1 FROM orders WHERE id=?1 AND store_id=?6)`)
        .bind(id, current.status, status, JSON.stringify(payload), now, auth.storeId)
    );
  }

  await db.batch(statements);
  const adminAction = changedStatus
    ? "order_status_changed"
    : internalNotesChanged
      ? "order_internal_note_updated"
      : "order_updated";

  await logAdmin(db, adminAction, "order", id, {
    from: current.status,
    to: status,
    stage,
    internalNotesChanged,
    freight,
    payment
  }, auth.storeId);

  return json({
    ok: true,
    status,
    stage,
    freight,
    payment,
    internalNotes,
    updatedAt: now
  });
}
