// ============================================================
// FUNCIONAMENTO DA PÁGINA
// Normalmente você NÃO precisa editar este arquivo.
// ============================================================

const state = {
  modelo: "Wave",
  tecido: "Gaze de Linho",
  forro: "Forro leve",
  trilho: "Sim"
};

function brl(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function val(id) {
  return document.getElementById(id).value;
}

function dadosAtuais() {
  return {
    modelo: state.modelo,
    tecido: state.tecido,
    forro: state.forro,
    trilho: state.trilho,
    largura: val("largura"),
    altura: val("altura"),
    franzimento: val("franzimento")
  };
}

function bindCards(groupId, key) {
  document.querySelectorAll("#" + groupId + " .card").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll("#" + groupId + " .card").forEach((c) => c.classList.remove("selected"));
      el.classList.add("selected");
      state[key] = el.dataset.value;
      atualizarOrcamento();
    });
  });
}

function atualizarInfoBarra(altura) {
  const info = document.getElementById("barra-info");

  if (altura > CONFIG.altura.calculoMaximo) {
    info.textContent = "Acima de 3,20 m, o acabamento e o valor são definidos em orçamento personalizado.";
    return;
  }

  const regra = obterRegraBarra(altura);

  if (regra.acrescimo) {
    info.textContent = `Para ${altura.toFixed(2).replace('.', ',')} m de altura, a cortina será produzida com barra larga de 20 cm.`;
  } else {
    info.textContent = `Para ${altura.toFixed(2).replace('.', ',')} m de altura, a cortina será produzida com barra de ${regra.tamanho} cm, mantendo o valor tabelado.`;
  }
}

function atualizarResumoBasico(dados, resultado) {
  document.getElementById("sum-modelo").textContent = dados.modelo;
  document.getElementById("sum-tecido").textContent = dados.tecido;
  document.getElementById("sum-forro").textContent = dados.forro;

  const largura = Number(dados.largura) || 0;
  const altura = Number(dados.altura) || 0;

  document.getElementById("sum-medidas").textContent =
    largura.toFixed(2).replace(".", ",") + " × " + altura.toFixed(2).replace(".", ",") + " m";

  document.getElementById("sum-franz").textContent = String(dados.franzimento).replace(".", ",") + "x";

  document.getElementById("sum-trilho").textContent =
    dados.modelo === "Ilhós" || dados.trilho === "Não" ? "Não incluso" : "Incluso";

  const barraResumo = document.getElementById("barra-resumo");
  if (resultado && !resultado.sobConsulta && resultado.barra) {
    document.getElementById("sum-barra").textContent = resultado.barra + " cm";
    barraResumo.textContent = resultado.acrescimoAltura
      ? "Barra larga de 20 cm obrigatória para esta altura."
      : "Barra definida automaticamente pela altura, sem alteração do valor tabelado.";
  } else {
    document.getElementById("sum-barra").textContent = "Sob consulta";
    barraResumo.textContent = "O acabamento será confirmado no orçamento personalizado.";
  }
}

function atualizarOrcamento() {
  const dados = dadosAtuais();
  const altura = Number(dados.altura) || 0;
  atualizarInfoBarra(altura);

  const resultado = calcularOrcamento(dados);
  const preco = document.getElementById("preco");
  const parcelas = document.getElementById("parcelas");
  const comprar = document.getElementById("comprar");

  atualizarResumoBasico(dados, resultado);
  preco.classList.remove("sob-consulta");

  if (resultado.erro) {
    preco.textContent = "Indisponível";
    parcelas.textContent = resultado.mensagem;
    window.currentTotal = null;
    window.currentSobConsulta = false;
    return;
  }

  if (resultado.sobConsulta) {
    preco.textContent = "Sob consulta";
    preco.classList.add("sob-consulta");
    parcelas.textContent = resultado.mensagem;
    comprar.textContent = "Solicitar orçamento";
    window.currentTotal = null;
    window.currentSobConsulta = true;
    window.currentBarra = null;
    window.currentAcrescimoAltura = false;
    return;
  }

  preco.textContent = brl(resultado.total);
  parcelas.textContent =
    "ou " + CONFIG.parcelas + "x de " + brl(resultado.total / CONFIG.parcelas) + " sem juros";

  comprar.textContent = "Solicitar fechamento";
  window.currentTotal = resultado.total;
  window.currentSobConsulta = false;
  window.currentBarra = resultado.barra;
  window.currentAcrescimoAltura = resultado.acrescimoAltura;
}

function mensagemWhatsApp() {
  const dados = dadosAtuais();

  let estimativa = "Sob consulta";
  if (!window.currentSobConsulta && typeof window.currentTotal === "number") {
    estimativa = brl(window.currentTotal);
  }

let barraTexto = "Sob consulta";

if (window.currentBarra) {
  barraTexto = `${window.currentBarra} cm`;
}

  return `Olá! Montei uma cortina no site:
Modelo: ${dados.modelo}
Tecido: ${dados.tecido}
Forro: ${dados.forro}
Medidas: ${dados.largura} m x ${dados.altura} m
Franzimento: ${dados.franzimento}x
Barra: ${barraTexto}
Trilho: ${dados.trilho}
Estimativa: ${estimativa}

Gostaria de confirmar este orçamento.`;
}

function abrirWhatsApp() {
  const numero = String(CONFIG.whatsapp || "").replace(/\D/g, "");
  const texto = encodeURIComponent(mensagemWhatsApp());
  const url = numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

bindCards("modelos", "modelo");
bindCards("tecidos-choice", "tecido");
bindCards("forros", "forro");
bindCards("trilho-choice", "trilho");

["largura", "altura", "franzimento"].forEach((id) => {
  document.getElementById(id).addEventListener("input", atualizarOrcamento);
});

document.getElementById("recalcular").addEventListener("click", () => {
  atualizarOrcamento();
  const toast = document.getElementById("toast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
});

document.getElementById("whatsapp").addEventListener("click", abrirWhatsApp);
document.getElementById("comprar").addEventListener("click", abrirWhatsApp);

atualizarOrcamento();
