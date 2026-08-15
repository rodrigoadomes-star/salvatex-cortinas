import {
  json,
  cents,
  safeJson,
  cleanText,
  validCpf,
  createOrderNumber,
  normalizeOrder
} from "../_lib.js";
import { readSession } from "../_customer-auth.js";
import { bodyWithin, requireTurnstile, sameOrigin } from "../_security.js";

const STORE_ID = "salvatex";

export async function onRequestPost(context) {
  if (!sameOrigin(context)) return json({ ok:false, message:"Origem não autorizada." }, 403);
  if (!bodyWithin(context, 256 * 1024)) return json({ ok:false, message:"Pedido acima do limite permitido." }, 413);
  if (!context.env.DB) {
    return json({
      ok: false,
      code: "DB_NOT_CONFIGURED",
      message: "O banco de dados ainda não foi configurado no Cloudflare."
    }, 503);
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json({ ok: false, message: "JSON inválido." }, 400);
  }

  const turnstile = await requireTurnstile(context, payload.turnstileToken);
  if (!turnstile.ok) return turnstile.response;

  let order;
  try {
    order = normalizeOrder(payload);
  } catch (error) {
    return json({ ok: false, message: error.message || "Pedido inválido." }, 400);
  }

  const db = context.env.DB;
  const now = new Date().toISOString();
  const session = await readSession(context);

  try {
    const existing = await db.prepare(
      `SELECT id, order_number, status, created_at, customer_email
       FROM orders
       WHERE client_reference = ?1
       LIMIT 1`
    ).bind(order.clientReference).first();

    if (existing) {
      if (!session || String(session.email).toLowerCase() !== String(existing.customer_email || "").toLowerCase()) {
        return json({ ok:false, message:"Este pedido não pode ser alterado por esta sessão." }, 409);
      }
    }

    let orderId;
    let orderNumber;
    let createdAt;
    let previousStatus = null;

    if (existing) {
      orderId = existing.id;
      orderNumber = existing.order_number;
      createdAt = existing.created_at;
      previousStatus = existing.status;
    } else {
      orderId = crypto.randomUUID();
      orderNumber = createOrderNumber();
      createdAt = now;
    }

    const customer = order.cliente || {};
    const cpfDigits = String(customer.cpf || "").replace(/\D/g, "");
    let customerAccount = null;
    if (session?.userId) {
      customerAccount = await db.prepare("SELECT cpf,cpf_locked FROM customer_accounts WHERE id=?1").bind(session.userId).first();
      if (customerAccount?.cpf_locked && cpfDigits && cpfDigits !== customerAccount.cpf) return json({ok:false,message:"O CPF confirmado nesta conta não pode ser alterado."},409);
      if (!customerAccount?.cpf_locked && cpfDigits && !validCpf(cpfDigits)) return json({ok:false,message:"CPF inválido."},400);
    }
    const delivery = order.entrega || {
      cep: customer.cep || "",
      endereco: customer.endereco || "",
      numero: customer.numero || "",
      complemento: customer.complemento || "",
      bairro: customer.bairro || "",
      cidade: customer.cidade || "",
      estado: customer.estado || ""
    };

    const statements = [];

    if (existing) {
      statements.push(
        db.prepare(
          `UPDATE orders SET
             source = ?1,
             channel = ?2,
             status = ?3,
             stage = ?4,
             customer_name = ?5,
             customer_email = ?6,
             customer_phone = ?7,
             customer_cpf = ?8,
             customer_json = ?9,
             delivery_json = ?10,
             freight_json = ?11,
             payment_json = ?12,
             antifraud_json = ?13,
             deadlines_json = ?14,
             totals_by_category_json = ?15,
             subtotal_cents = ?16,
             freight_cents = ?17,
             discount_cents = ?18,
             total_cents = ?19,
             internal_notes = ?20,
             updated_at = ?21
           WHERE id = ?22`
        ).bind(
          order.source,
          order.channel,
          order.status,
          order.stage,
          cleanText(customer.nome, 240),
          cleanText(customer.email, 320),
          cleanText(customer.telefone, 80),
          cleanText(customer.cpf, 40),
          safeJson(customer, {}),
          safeJson(delivery, {}),
          safeJson(order.frete, null),
          safeJson(order.pagamento, {}),
          safeJson(order.antifraude, {}),
          safeJson(order.prazos, null),
          safeJson(order.totaisPorCategoria, {}),
          cents(order.subtotal),
          order.freight === null ? null : cents(order.freight),
          cents(order.discount),
          cents(order.total),
          order.observacoesInternas,
          now,
          orderId
        )
      );

      statements.push(
        db.prepare("DELETE FROM order_items WHERE order_id = ?1").bind(orderId)
      );
    } else {
      statements.push(
        db.prepare(
          `INSERT INTO orders (
             id, store_id, order_number, client_reference, version,
             source, channel, status, stage, currency,
             customer_name, customer_email, customer_phone, customer_cpf,
             customer_json, delivery_json, freight_json, payment_json,
             antifraud_json, deadlines_json, totals_by_category_json,
             subtotal_cents, freight_cents, discount_cents, total_cents,
             internal_notes, created_at, updated_at
           ) VALUES (
             ?1, ?2, ?3, ?4, 4,
             ?5, ?6, ?7, ?8, 'BRL',
             ?9, ?10, ?11, ?12,
             ?13, ?14, ?15, ?16,
             ?17, ?18, ?19,
             ?20, ?21, ?22, ?23,
             ?24, ?25, ?26
           )`
        ).bind(
          orderId,
          STORE_ID,
          orderNumber,
          order.clientReference,
          order.source,
          order.channel,
          order.status,
          order.stage,
          cleanText(customer.nome, 240),
          cleanText(customer.email, 320),
          cleanText(customer.telefone, 80),
          cleanText(customer.cpf, 40),
          safeJson(customer, {}),
          safeJson(delivery, {}),
          safeJson(order.frete, null),
          safeJson(order.pagamento, {}),
          safeJson(order.antifraude, {}),
          safeJson(order.prazos, null),
          safeJson(order.totaisPorCategoria, {}),
          cents(order.subtotal),
          order.freight === null ? null : cents(order.freight),
          cents(order.discount),
          cents(order.total),
          order.observacoesInternas,
          createdAt,
          now
        )
      );
    }

    if (session?.userId) {
      statements.push(db.prepare("UPDATE orders SET customer_account_id=?1 WHERE id=?2").bind(session.userId, orderId));
      if (!customerAccount?.cpf_locked && cpfDigits) statements.push(db.prepare("UPDATE customer_accounts SET cpf=?1,cpf_locked=1,updated_at=?2 WHERE id=?3 AND cpf_locked=0").bind(cpfDigits,now,session.userId));
    }

    for (const item of order.items) {
      statements.push(
        db.prepare(
          `INSERT INTO order_items (
             id, order_id, client_item_id, group_id, product_id, variant_id,
             category, category_name, sale_type, configurator, sku,
             name, image, quantity, unit_price_cents, total_cents,
             details_json, data_json, snapshot_json, created_at
           ) VALUES (
             ?1, ?2, ?3, ?4, ?5, ?6,
             ?7, ?8, ?9, ?10, ?11,
             ?12, ?13, ?14, ?15, ?16,
             ?17, ?18, ?19, ?20
           )`
        ).bind(
          crypto.randomUUID(),
          orderId,
          item.id || null,
          item.grupoId || null,
          item.produtoId || null,
          item.varianteId || null,
          item.categoria,
          item.categoriaNome || null,
          item.tipoVenda || null,
          item.configurador || null,
          item.sku || null,
          item.nome,
          item.imagem || null,
          item.quantidade,
          cents(item.valorUnitario),
          cents(item.total),
          safeJson(item.detalhes, []),
          safeJson(item.dados, {}),
          safeJson(item.snapshot, {}),
          now
        )
      );
    }

    statements.push(
      db.prepare(
        `INSERT INTO order_events (
           order_id, event_type, from_status, to_status, payload_json, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      ).bind(
        orderId,
        existing ? "checkout_updated" : "order_created",
        previousStatus,
        order.status,
        safeJson({ stage: order.stage, source: "checkout" }, {}),
        now
      )
    );

    await db.batch(statements);

    return json({
      ok: true,
      created: !existing,
      pedido: {
        id: orderId,
        numero: orderNumber,
        referenciaCliente: order.clientReference,
        status: order.status,
        etapa: order.stage,
        total: order.total,
        criadoEm: createdAt,
        atualizadoEm: now
      }
    }, existing ? 200 : 201);

  } catch (error) {
    console.error("Erro ao registrar pedido", error);
    return json({
      ok: false,
      code: "ORDER_SAVE_FAILED",
      message: "Não foi possível registrar o pedido no servidor."
    }, 500);
  }
}

export async function onRequestGet() {
  // A listagem ficará protegida pelo painel Admin. Não exponha pedidos publicamente.
  return json({ ok: false, message: "Método não permitido nesta rota pública." }, 405, { allow: "POST" });
}

