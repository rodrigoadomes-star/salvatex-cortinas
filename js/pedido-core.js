// ============================================================
// PEDIDO CORE - SALVATEX
// Base única para pedidos, pagamentos, backend e futuro Admin.
// ============================================================
(function () {
  const CHAVE_PEDIDO = "salvatex_pedido_atual";
  const VERSAO_PEDIDO = 4;

  function agora() {
    return new Date().toISOString();
  }

  function criarNumeroPedidoLocal() {
    // Identificador provisório. O número oficial é criado pelo backend.
    const d = new Date();
    const data = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("");
    const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `LOCAL-${data}-${aleatorio}`;
  }

  function normalizarItens(itens) {
    if (window.SalvatexCarrinho) {
      return SalvatexCarrinho.normalizarCarrinho(itens || []);
    }
    return Array.isArray(itens) ? itens : [];
  }

  function criarPedido(itens, dados = {}) {
    const lista = normalizarItens(itens);
    const totalProdutos = window.SalvatexCarrinho
      ? SalvatexCarrinho.calcularTotal(lista)
      : 0;
    const totaisPorCategoria = window.SalvatexCarrinho
      ? SalvatexCarrinho.calcularTotaisPorCategoria(lista)
      : {};
    const criadoEm = dados.criadoEm || agora();

    return {
      versao: VERSAO_PEDIDO,
      id:
        dados.id ||
        (window.SalvatexCarrinho
          ? SalvatexCarrinho.criarId("pedido")
          : `pedido-${Date.now()}`),
      numero: dados.numero || criarNumeroPedidoLocal(),
      numeroOficial: dados.numeroOficial || "",
      backendId: dados.backendId || "",
      backendRegistrado: Boolean(dados.backendRegistrado),
      origem: dados.origem || "loja_online",
      canal: dados.canal || "site",
      status: dados.status || "rascunho",
      etapa: dados.etapa || "carrinho",
      itens: lista,
      cliente: dados.cliente || null,
      entrega: dados.entrega || null,
      frete: dados.frete || null,
      pagamento:
        dados.pagamento ||
        { forma: "", status: "nao_iniciado" },
      antifraude:
        dados.antifraude ||
        { provedor: "", status: "nao_iniciado" },
      totaisPorCategoria,
      totais:
        dados.totais ||
        {
          produtos: totalProdutos,
          frete: null,
          desconto: 0,
          total: totalProdutos
        },
      prazos: dados.prazos || null,
      observacoesInternas: dados.observacoesInternas || "",
      criadoEm,
      atualizadoEm: agora()
    };
  }

  function normalizarPedido(pedido) {
    if (!pedido || typeof pedido !== "object") return null;

    const base = criarPedido(pedido.itens || [], pedido);

    return {
      ...base,
      ...pedido,
      versao: VERSAO_PEDIDO,
      itens: normalizarItens(pedido.itens),
      numero: pedido.numero || base.numero,
      id: pedido.id || base.id,
      numeroOficial: pedido.numeroOficial || "",
      backendId: pedido.backendId || "",
      backendRegistrado: Boolean(pedido.backendRegistrado)
    };
  }

  function obterPedido() {
    try {
      const salvo = localStorage.getItem(CHAVE_PEDIDO);
      return salvo
        ? normalizarPedido(JSON.parse(salvo))
        : null;
    } catch (erro) {
      console.error("Erro ao ler pedido:", erro);
      return null;
    }
  }

  function salvarPedido(pedido) {
    const normalizado = normalizarPedido({
      ...pedido,
      atualizadoEm: agora()
    });

    if (!normalizado) return null;

    localStorage.setItem(
      CHAVE_PEDIDO,
      JSON.stringify(normalizado)
    );

    return normalizado;
  }

  function atualizarPedido(alteracoes = {}) {
    const atual = obterPedido();
    if (!atual) return null;

    return salvarPedido({
      ...atual,
      ...alteracoes,
      atualizadoEm: agora()
    });
  }

  // ==========================================================
  // REGISTRAR PEDIDO NO BACKEND
  // ==========================================================

  async function registrarNoServidor(pedido = null) {
    const atual = normalizarPedido(pedido || obterPedido());

    if (!atual) {
      throw new Error("Pedido não encontrado.");
    }

    const turnstile = window.SalvatexTurnstile;
    const turnstileToken = turnstile?.getToken?.() || "";
    if (turnstile?.isRequired?.() && !turnstileToken) {
      throw new Error("Confirme a verificação de segurança antes de continuar.");
    }

    const resposta = await fetch("/api/pedidos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ ...atual, turnstileToken })
    });

    let dados = null;

    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }

    if (!resposta.ok || !dados?.ok || !dados?.pedido) {
      turnstile?.reset?.();
      const mensagem =
        dados?.message ||
        "Não foi possível registrar o pedido no servidor.";
      throw new Error(mensagem);
    }

    const salvo = salvarPedido({
      ...atual,
      backendId: dados.pedido.id,
      numeroOficial: dados.pedido.numero,
      numero: dados.pedido.numero,
      backendRegistrado: true,
      status: dados.pedido.status || atual.status,
      etapa: dados.pedido.etapa || atual.etapa,
      backendAtualizadoEm:
        dados.pedido.atualizadoEm || agora()
    });

    return salvo;
  }

  // Reserva da cobrança SaaS. O cálculo real será feito no backend/admin.
  const PLATAFORMA = Object.freeze({
    percentual: 0.01,
    minimoMensal: 150,
    meiosCobranca: ["pix", "boleto"]
  });

  window.SalvatexPedido = {
    CHAVE_PEDIDO,
    VERSAO_PEDIDO,
    PLATAFORMA,
    criarNumeroPedido: criarNumeroPedidoLocal,
    criarPedido,
    normalizarPedido,
    obterPedido,
    salvarPedido,
    atualizarPedido,
    registrarNoServidor
  };
})();
