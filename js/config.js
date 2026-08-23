// Configuração pública isolada por loja. Preços e opções são sempre carregados do D1.
const CONFIG = {
  whatsapp: "", parcelas: 10, freteGratisMinimo: 0, producao: "", entrega: "",
  altura: { alturaEntradaMaxima: 5, calculoMaximo: 3.2, inicioAcrescimo: 2.8, acrescimoApos280: .25, acimaMaximo: { modo: "consulta", texto: "Medida fora do limite automático. Solicite orçamento personalizado.", textoBotao: "Solicitar orçamento", permitirCarrinho: false } },
  barra: { faixasSemAcrescimo: [], acimaDe280: 20 },
  instalacao: {}, cores: {}, precos: {}, franzimentos: [{ valor: 2, rotulo: "2x" }, { valor: 2.5, rotulo: "2,5x" }, { valor: 3, rotulo: "3x" }],
  mediaConfigurador: [], estoqueCombinacoes: {}, configuradorTecidos: {},
  configurador: { id: "wave", nome: "Configurador", ativo: false, modelo: "Wave", descricao: "", tipo: "cortina", medidas: { larguraMinima: .5, larguraMaxima: 12, alturaMinima: .5 } },
  labels: { kicker: "CONFIGURADOR", pageTitle: "Configure seu produto sob medida", pageDescription: "Informe as medidas e escolha as opções disponíveis.", formTitle: "Configure seu produto", formSubtitle: "Escolha as características abaixo para calcular seu produto.", step1: "Produto", step2: "Material", step3: "Opção", step4: "Acabamento", step5: "Resumo", widthLabel: "Largura", heightLabel: "Altura", modelLabel: "Modelo", fabricLabel: "Material", liningLabel: "Opção", colorLabel: "Cor", trackLabel: "Acabamento", summaryTitle: "Resumo", addToCartLabel: "Adicionar ao carrinho" }
};

function mesclarConfig(alvo, fonte) {
  if (!fonte || typeof fonte !== "object") return alvo;
  Object.entries(fonte).forEach(([chave, valor]) => {
    if (valor && typeof valor === "object" && !Array.isArray(valor) && alvo[chave] && typeof alvo[chave] === "object" && !Array.isArray(alvo[chave])) mesclarConfig(alvo[chave], valor);
    else alvo[chave] = valor;
  });
  return alvo;
}

function aplicarConfigurador(cfg) {
  if (!cfg || typeof cfg !== "object") return;
  const medidas = cfg.medidas || {};
  CONFIG.configurador = {
    id: cfg.id || "wave", nome: cfg.nome || "Configurador", ativo: cfg.ativo === true,
    modelo: cfg.modelo || cfg.nome || "Produto", descricao: cfg.descricao || "", tipo: cfg.tipo || "cortina",
    medidas: { larguraMinima: Number(medidas.larguraMinima ?? .5), larguraMaxima: Number(medidas.larguraMaxima ?? 12), alturaMinima: Number(medidas.alturaMinima ?? .5) }
  };
  if (medidas.alturaEntradaMaxima != null) CONFIG.altura.alturaEntradaMaxima = Number(medidas.alturaEntradaMaxima);
  if (medidas.calculoMaximo != null) CONFIG.altura.calculoMaximo = Number(medidas.calculoMaximo);
  if (medidas.inicioAcrescimo != null) CONFIG.altura.inicioAcrescimo = Number(medidas.inicioAcrescimo);
  if (medidas.acrescimoPercentual != null) CONFIG.altura.acrescimoApos280 = Number(medidas.acrescimoPercentual) / 100;
  CONFIG.altura.acimaMaximo = medidas.acimaMaximo || CONFIG.altura.acimaMaximo;
  CONFIG.barra.faixasSemAcrescimo = Array.isArray(cfg.barra?.faixas) ? cfg.barra.faixas : [];
  if (cfg.barra?.acimaInicio != null) CONFIG.barra.acimaDe280 = Number(cfg.barra.acimaInicio);
  CONFIG.franzimentos = Array.isArray(cfg.franzimentos) ? cfg.franzimentos : [];
  CONFIG.instalacao = cfg.trilhos && typeof cfg.trilhos === "object" ? cfg.trilhos : {};
  CONFIG.cores = {}; CONFIG.precos = {}; CONFIG.configuradorTecidos = {};
  if (cfg.tecidos && typeof cfg.tecidos === "object") Object.entries(cfg.tecidos).forEach(([nome, tecido]) => {
    if (tecido?.ativo === false) return;
    CONFIG.configuradorTecidos[nome] = tecido && typeof tecido === "object" ? tecido : {};
    CONFIG.cores[nome] = Array.isArray(tecido.cores) ? tecido.cores : [];
    CONFIG.precos[nome] = tecido.forros && typeof tecido.forros === "object" ? tecido.forros : {};
  });
  CONFIG.mediaConfigurador = Array.isArray(cfg.midia) ? cfg.midia : [];
  CONFIG.estoqueCombinacoes = cfg.estoqueCombinacoes && typeof cfg.estoqueCombinacoes === "object" ? { ...cfg.estoqueCombinacoes } : {};
  if (cfg.labels && typeof cfg.labels === "object") mesclarConfig(CONFIG.labels, cfg.labels);
}

window.CONFIG = CONFIG;
window.CONFIG_READY = (async () => {
  const raw = String(new URLSearchParams(window.location.search).get("id") || "wave").trim().toLowerCase();
  const configuratorId = /^[a-z0-9][a-z0-9-]{1,47}$/.test(raw) ? raw : "wave";
  try {
    const [siteResp, cfgResp] = await Promise.all([fetch("/api/store-config", { cache: "no-store" }), fetch("/api/configurators/" + encodeURIComponent(configuratorId), { cache: "no-store" })]);
    if (siteResp.ok) { const data = await siteResp.json(); if (data?.ok && data.config) mesclarConfig(CONFIG, data.config); }
    if (cfgResp.ok) {
      const data = await cfgResp.json(), cfg = data?.wave || data?.configurator;
      if (data?.ok && cfg) { aplicarConfigurador(cfg); console.info("Configurador carregado da loja:", configuratorId, data.source || "", data.updatedAt || ""); }
    } else console.warn("Configurador não disponível para esta loja:", configuratorId, cfgResp.status);
  } catch (erro) { console.warn("Configuração remota indisponível; mantendo fallback vazio.", erro); }
  return CONFIG;
})();

if (!document.querySelector("script[data-radz-configurator-labels]")) {
  const script = document.createElement("script");
  script.src = "/js/configurador-labels.js?v=identity-stable-20260823-1";
  script.dataset.radzConfiguratorLabels = "1";
  document.head.appendChild(script);
}
