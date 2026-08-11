export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}

export function cents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function safeJson(value, fallback = null) {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

export function cleanText(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export function createOrderNumber() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `STX-${y}${m}${d}-${random}`;
}

export function normalizeItem(raw, index = 0) {
  const quantity = Math.max(1, Math.min(999, Math.trunc(Number(raw?.quantidade ?? 1) || 1)));
  const unit = Number(raw?.valorUnitario ?? 0);
  const total = Number(raw?.total ?? unit * quantity);

  if (!Number.isFinite(unit) || !Number.isFinite(total) || unit < 0 || total < 0) {
    throw new Error(`Valor inválido no item ${index + 1}.`);
  }

  const expected = unit * quantity;
  if (Math.abs(expected - total) > 0.02) {
    throw new Error(`Total inconsistente no item ${index + 1}.`);
  }

  return {
    id: cleanText(raw?.id || crypto.randomUUID(), 160),
    grupoId: cleanText(raw?.grupoId, 160),
    produtoId: cleanText(raw?.produtoId, 160),
    varianteId: cleanText(raw?.varianteId, 160),
    categoria: cleanText(raw?.categoria || "outros", 120).toLowerCase(),
    categoriaNome: cleanText(raw?.categoriaNome, 160),
    tipoVenda: cleanText(raw?.tipoVenda, 80),
    configurador: cleanText(raw?.configurador, 120),
    sku: cleanText(raw?.sku, 120),
    nome: cleanText(raw?.nome || "Produto", 240),
    imagem: cleanText(raw?.imagem, 1000),
    quantidade: quantity,
    valorUnitario: unit,
    total,
    detalhes: Array.isArray(raw?.detalhes) ? raw.detalhes.slice(0, 100) : [],
    dados: raw?.dados && typeof raw.dados === "object" ? raw.dados : {},
    snapshot: raw?.snapshot && typeof raw.snapshot === "object" ? raw.snapshot : {}
  };
}

export function normalizeOrder(body) {
  if (!body || typeof body !== "object") throw new Error("Pedido inválido.");
  if (!Array.isArray(body.itens) || body.itens.length === 0) throw new Error("O pedido não possui itens.");
  if (body.itens.length > 100) throw new Error("Quantidade de itens acima do limite.");

  const items = body.itens.map(normalizeItem);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const cliente = body.cliente && typeof body.cliente === "object" ? body.cliente : {};

  if (!cleanText(cliente.nome, 240)) throw new Error("Nome do cliente é obrigatório.");
  if (!cleanText(cliente.email, 320)) throw new Error("E-mail do cliente é obrigatório.");

  const freightValue = body?.frete?.valor;
  const freight = freightValue === null || freightValue === undefined || freightValue === ""
    ? null
    : Number(freightValue);

  if (freight !== null && (!Number.isFinite(freight) || freight < 0)) {
    throw new Error("Frete inválido.");
  }

  const discount = Number(body?.totais?.desconto ?? 0);
  const safeDiscount = Number.isFinite(discount) && discount >= 0 ? discount : 0;
  const total = subtotal + (freight || 0) - safeDiscount;

  if (total < 0) throw new Error("Total do pedido inválido.");

  return {
    clientReference: cleanText(body.id || body.clientReference || crypto.randomUUID(), 180),
    source: cleanText(body.origem || "loja_online", 80),
    channel: cleanText(body.canal || "site", 80),
    status: cleanText(body.status || "aguardando_pagamento", 80),
    stage: cleanText(body.etapa || "pagamento", 80),
    cliente,
    entrega: body.entrega || null,
    frete: body.frete || null,
    pagamento: body.pagamento || { forma: "", status: "nao_iniciado" },
    antifraude: body.antifraude || { provedor: "", status: "nao_iniciado" },
    prazos: body.prazos || null,
    totaisPorCategoria: body.totaisPorCategoria || {},
    observacoesInternas: cleanText(body.observacoesInternas, 4000),
    items,
    subtotal,
    freight,
    discount: safeDiscount,
    total
  };
}
