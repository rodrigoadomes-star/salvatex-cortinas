// ============================================================
// CARRINHO - SALVATEX CORTINAS
// ============================================================

const CHAVE_CARRINHO =
  "salvatexCarrinho";


// ============================================================
// CONFIGURAÇÕES DE FRETE
// ============================================================

const CONFIG_FRETE = {

  minimoFreteGratisCortinas:
    500,

  producaoMin:
    5,

  producaoMax:
    10,

  entregaMin:
    6,

  entregaMax:
    12

};


// ============================================================
// ESTADO DO FRETE
// ============================================================

let estadoFrete = {

  cep:
    "",

  calculado:
    false,

  gratis:
    false,

  valor:
    null

};


// ============================================================
// BRL
// ============================================================

function brl(valor) {

  return Number(
    valor || 0
  ).toLocaleString(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL"
    }
  );

}


// ============================================================
// MEDIDA
// ============================================================

function formatarMedida(
  valor
) {

  return Number(
    valor || 0
  )
    .toFixed(2)
    .replace(".", ",");

}


// ============================================================
// LER CARRINHO
// ============================================================

function obterCarrinho() {

  try {

    const dados =
      localStorage.getItem(
        CHAVE_CARRINHO
      );


    if (!dados) {

      return [];

    }


    const carrinho =
      JSON.parse(
        dados
      );


    return Array.isArray(
      carrinho
    )
      ? carrinho
      : [];

  } catch (erro) {

    console.error(
      "Erro ao carregar carrinho:",
      erro
    );


    return [];

  }

}


// ============================================================
// SALVAR CARRINHO
// ============================================================

function salvarCarrinho(
  carrinho
) {

  localStorage.setItem(
    CHAVE_CARRINHO,
    JSON.stringify(
      carrinho
    )
  );

}


// ============================================================
// REMOVER ITEM
// ============================================================

function removerItemCarrinho(
  id
) {

  const carrinho =
    obterCarrinho();


  const novoCarrinho =
    carrinho.filter(
      (item) =>
        String(item.id) !==
        String(id)
    );


  salvarCarrinho(
    novoCarrinho
  );


  resetarFrete();


  renderizarCarrinho();

}


// ============================================================
// RESETAR FRETE
// ============================================================

function resetarFrete() {

  estadoFrete = {

    cep:
      "",

    calculado:
      false,

    gratis:
      false,

    valor:
      null

  };


  const cep =
    document.getElementById(
      "cep-frete"
    );


  if (cep) {

    cep.value =
      "";

  }

}


// ============================================================
// CRIA DETALHE
// ============================================================

function criarDetalhe(
  titulo,
  valor
) {

  const div =
    document.createElement(
      "div"
    );


  const strong =
    document.createElement(
      "strong"
    );


  strong.textContent =
    titulo +
    ": ";


  const span =
    document.createElement(
      "span"
    );


  span.textContent =
    valor ||
    "—";


  div.appendChild(
    strong
  );


  div.appendChild(
    span
  );


  return div;

}


// ============================================================
// PLACEHOLDER
// ============================================================

function criarPlaceholder(
  texto
) {

  const elemento =
    document.createElement(
      "div"
    );


  elemento.className =
    "carrinho-item-sem-imagem";


  elemento.textContent =
    texto;


  return elemento;

}


// ============================================================
// CORTINA
// ============================================================

function criarItemCortina(
  item
) {

  const artigo =
    document.createElement(
      "article"
    );


  artigo.className =
    "carrinho-item";


  // ==========================================================
  // FOTO
  // ==========================================================

  if (
    item.imagem
  ) {

    const imagem =
      document.createElement(
        "img"
      );


    imagem.className =
      "carrinho-item-imagem";


    imagem.src =
      item.imagem;


    imagem.alt =
      `${item.tecido || "Cortina"} ${item.cor || ""}`;


    imagem.onerror =
      () => {

        imagem.replaceWith(
          criarPlaceholder(
            "Imagem da cortina"
          )
        );

      };


    artigo.appendChild(
      imagem
    );

  } else {

    artigo.appendChild(
      criarPlaceholder(
        "Imagem da cortina"
      )
    );

  }


  // ==========================================================
  // CONTEÚDO
  // ==========================================================

  const conteudo =
    document.createElement(
      "div"
    );


  conteudo.className =
    "carrinho-item-conteudo";


  const topo =
    document.createElement(
      "div"
    );


  topo.className =
    "carrinho-item-topo";


  const titulo =
    document.createElement(
      "h3"
    );


  titulo.className =
    "carrinho-item-titulo";


  titulo.textContent =
    item.tecido
      ? "Cortina " +
        item.tecido
      : "Cortina sob medida";


  const preco =
    document.createElement(
      "div"
    );


  preco.className =
    "carrinho-item-preco";


  preco.textContent =
    brl(
      item.total
    );


  topo.appendChild(
    titulo
  );


  topo.appendChild(
    preco
  );


  conteudo.appendChild(
    topo
  );


  // ==========================================================
  // DETALHES
  // ==========================================================

  const detalhes =
    document.createElement(
      "div"
    );


  detalhes.className =
    "carrinho-item-detalhes";


  detalhes.appendChild(
    criarDetalhe(
      "Modelo",
      item.modelo
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Tecido",
      item.tecido
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Cor",
      item.cor
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Forro",
      item.forro
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Ambiente",

      formatarMedida(
        item.larguraAmbiente ??
        item.largura
      ) +

      " × " +

      formatarMedida(
        item.altura
      ) +

      " m"
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Consumo de tecido",

      formatarMedida(
        item.consumoTecido
      ) +

      " × " +

      formatarMedida(
        item.altura
      ) +

      " m"
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Franzimento",

      String(
        item.franzimento ||
        ""
      )
        .replace(
          ".",
          ","
        ) +

      "x"
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Barra",

      item.barra
        ? item.barra +
          " cm"
        : "Sob consulta"
    )
  );


  conteudo.appendChild(
    detalhes
  );


  // ==========================================================
  // REMOVER
  // ==========================================================

  const acoes =
    document.createElement(
      "div"
    );


  acoes.className =
    "carrinho-item-acoes";


  const remover =
    document.createElement(
      "button"
    );


  remover.type =
    "button";


  remover.className =
    "carrinho-remover";


  remover.textContent =
    "Remover cortina";


  remover.addEventListener(
    "click",
    () => {

      removerItemCarrinho(
        item.id
      );

    }
  );


  acoes.appendChild(
    remover
  );


  conteudo.appendChild(
    acoes
  );


  artigo.appendChild(
    conteudo
  );


  return artigo;

}


// ============================================================
// TRILHO / VARÃO
// ============================================================

function criarItemTrilho(
  item
) {

  const artigo =
    document.createElement(
      "article"
    );


  artigo.className =
    "carrinho-item";


  artigo.appendChild(
    criarPlaceholder(
      "Trilho / Varão"
    )
  );


  const conteudo =
    document.createElement(
      "div"
    );


  conteudo.className =
    "carrinho-item-conteudo";


  const topo =
    document.createElement(
      "div"
    );


  topo.className =
    "carrinho-item-topo";


  const titulo =
    document.createElement(
      "h3"
    );


  titulo.className =
    "carrinho-item-titulo";


  titulo.textContent =
    item.produto ||
    item.trilho ||
    "Trilho / Varão";


  const preco =
    document.createElement(
      "div"
    );


  preco.className =
    "carrinho-item-preco";


  preco.textContent =
    brl(
      item.total
    );


  topo.appendChild(
    titulo
  );


  topo.appendChild(
    preco
  );


  conteudo.appendChild(
    topo
  );


  const detalhes =
    document.createElement(
      "div"
    );


  detalhes.className =
    "carrinho-item-detalhes";


  detalhes.appendChild(
    criarDetalhe(
      "Produto",

      item.produto ||
      item.trilho
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Medida",

      formatarMedida(
        item.largura
      ) +

      " m"
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Quantidade",

      String(
        item.quantidade ||
        1
      )
    )
  );


  conteudo.appendChild(
    detalhes
  );


  const acoes =
    document.createElement(
      "div"
    );


  acoes.className =
    "carrinho-item-acoes";


  const remover =
    document.createElement(
      "button"
    );


  remover.type =
    "button";


  remover.className =
    "carrinho-remover";


  remover.textContent =
    "Remover item";


  remover.addEventListener(
    "click",
    () => {

      removerItemCarrinho(
        item.id
      );

    }
  );


  acoes.appendChild(
    remover
  );


  conteudo.appendChild(
    acoes
  );


  artigo.appendChild(
    conteudo
  );


  return artigo;

}


// ============================================================
// ESCOLHE TIPO
// ============================================================

function criarItemCarrinho(
  item
) {

  if (
    item.tipo ===
    "trilho"
  ) {

    return criarItemTrilho(
      item
    );

  }


  return criarItemCortina(
    item
  );

}


// ============================================================
// TOTAIS
// ============================================================

function calcularTotais(
  carrinho
) {

  let cortinas =
    0;


  let trilhos =
    0;


  carrinho.forEach(
    (item) => {

      const valor =
        Number(
          item.total ||
          0
        );


      if (
        item.tipo ===
        "trilho"
      ) {

        trilhos +=
          valor;

      } else {

        cortinas +=
          valor;

      }

    }
  );


  const subtotal =
    cortinas +
    trilhos;


  return {

    cortinas,

    trilhos,

    subtotal

  };

}


// ============================================================
// REGRA DE FRETE GRÁTIS
//
// IMPORTANTE:
//
// APENAS O VALOR DAS CORTINAS CONTA PARA OS R$ 500.
//
// TRILHO NÃO ENTRA NO CÁLCULO.
//
// SE AS CORTINAS ATINGIREM R$ 500,
// O TRILHO COMPRADO JUNTO TAMBÉM RECEBE FRETE GRÁTIS.
// ============================================================

function verificarFreteGratis(
  carrinho
) {

  const totais =
    calcularTotais(
      carrinho
    );


  const possuiCortina =
    carrinho.some(
      (item) =>
        item.tipo !==
        "trilho"
    );


  const gratis =
    possuiCortina &&

    totais.cortinas >=
      CONFIG_FRETE
        .minimoFreteGratisCortinas;


  const falta =
    Math.max(
      0,

      CONFIG_FRETE
        .minimoFreteGratisCortinas -

      totais.cortinas
    );


  return {

    gratis,

    falta,

    totalCortinas:
      totais.cortinas,

    possuiCortina

  };

}


// ============================================================
// FORMATA CEP
// ============================================================

function formatarCep(
  valor
) {

  const numeros =
    String(
      valor ||
      ""
    )
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        8
      );


  if (
    numeros.length <=
    5
  ) {

    return numeros;

  }


  return (
    numeros.slice(
      0,
      5
    ) +

    "-" +

    numeros.slice(
      5
    )
  );

}


// ============================================================
// VALIDA CEP
// ============================================================

function cepValido(
  cep
) {

  return /^\d{5}-?\d{3}$/.test(
    cep
  );

}


// ============================================================
// ATUALIZA AVISO DE FRETE
// ============================================================

function atualizarAvisoFrete(
  carrinho
) {

  const regra =
    verificarFreteGratis(
      carrinho
    );


  const gratis =
    document.getElementById(
      "frete-gratis-aviso"
    );


  const falta =
    document.getElementById(
      "frete-falta-aviso"
    );


  const textoFalta =
    document.getElementById(
      "frete-falta-texto"
    );


  const textoGratis =
    document.getElementById(
      "frete-gratis-texto"
    );


  if (
    regra.gratis
  ) {

    if (gratis) {

      gratis.style.display =
        "block";

    }


    if (falta) {

      falta.style.display =
        "none";

    }


    if (textoGratis) {

      textoGratis.textContent =
        "As cortinas do pedido atingiram R$ 500. Trilhos ou varões comprados junto também recebem o benefício.";

    }


    return;

  }


  if (gratis) {

    gratis.style.display =
      "none";

  }


  if (
    regra.possuiCortina &&
    regra.falta > 0
  ) {

    if (falta) {

      falta.style.display =
        "block";

    }


    if (textoFalta) {

      textoFalta.textContent =
        "Faltam " +
        brl(
          regra.falta
        ) +
        " em cortinas para ganhar frete grátis.";

    }

  } else {

    if (falta) {

      falta.style.display =
        "none";

    }

  }

}


// ============================================================
// CALCULAR FRETE
//
// Por enquanto:
//
// - identifica automaticamente frete grátis;
// - valida CEP;
// - frete pago fica "A calcular".
//
// Depois substituiremos a parte do frete pago
// pela API da transportadora.
// ============================================================

function calcularFrete() {

  const carrinho =
    obterCarrinho();


  if (
    !carrinho.length
  ) {

    return;

  }


  const input =
    document.getElementById(
      "cep-frete"
    );


  const erro =
    document.getElementById(
      "cep-erro"
    );


  const bloco =
    document.getElementById(
      "bloco-entrega"
    );


  const valorFrete =
    document.getElementById(
      "valor-frete"
    );


  const resumoFrete =
    document.getElementById(
      "resumo-frete"
    );


  if (!input) {

    return;

  }


  const cep =
    formatarCep(
      input.value
    );


  input.value =
    cep;


  if (
    !cepValido(
      cep
    )
  ) {

    if (erro) {

      erro.textContent =
        "Informe um CEP válido.";

      erro.style.display =
        "block";

    }


    return;

  }


  if (erro) {

    erro.style.display =
      "none";

  }


  const regra =
    verificarFreteGratis(
      carrinho
    );


  estadoFrete.cep =
    cep;


  estadoFrete.calculado =
    true;


  if (
    regra.gratis
  ) {

    estadoFrete.gratis =
      true;


    estadoFrete.valor =
      0;


    if (valorFrete) {

      valorFrete.textContent =
        "Grátis";

    }


    if (resumoFrete) {

      resumoFrete.textContent =
        "Grátis";

    }

  } else {

    estadoFrete.gratis =
      false;


    estadoFrete.valor =
      null;


    if (valorFrete) {

      valorFrete.textContent =
        "A calcular";

    }


    if (resumoFrete) {

      resumoFrete.textContent =
        "A calcular";

    }

  }


  if (bloco) {

    bloco.style.display =
      "block";

  }


  atualizarResumoCarrinho(
    carrinho
  );

}


// ============================================================
// RESUMO
// ============================================================

function atualizarResumoCarrinho(
  carrinho
) {

  const totais =
    calcularTotais(
      carrinho
    );


  const regraFrete =
    verificarFreteGratis(
      carrinho
    );


  const resumoCortinas =
    document.getElementById(
      "resumo-cortinas"
    );


  const resumoTrilhos =
    document.getElementById(
      "resumo-trilhos"
    );


  const linhaTrilhos =
    document.getElementById(
      "resumo-linha-trilhos"
    );


  const subtotal =
    document.getElementById(
      "carrinho-subtotal"
    );


  const resumoFrete =
    document.getElementById(
      "resumo-frete"
    );


  const total =
    document.getElementById(
      "carrinho-total"
    );


  const parcelamento =
    document.getElementById(
      "carrinho-parcelamento"
    );


  if (resumoCortinas) {

    resumoCortinas.textContent =
      brl(
        totais.cortinas
      );

  }


  if (resumoTrilhos) {

    resumoTrilhos.textContent =
      brl(
        totais.trilhos
      );

  }


  if (linhaTrilhos) {

    linhaTrilhos.style.display =
      totais.trilhos > 0
        ? "flex"
        : "none";

  }


  if (subtotal) {

    subtotal.textContent =
      brl(
        totais.subtotal
      );

  }


  // ==========================================================
  // FRETE GRÁTIS PODE SER IDENTIFICADO
  // ANTES MESMO DO CEP
  // ==========================================================

  if (
    regraFrete.gratis
  ) {

    estadoFrete.gratis =
      true;


    estadoFrete.valor =
      0;


    if (resumoFrete) {

      resumoFrete.textContent =
        "Grátis";

    }

  } else if (
    !estadoFrete.calculado
  ) {

    if (resumoFrete) {

      resumoFrete.textContent =
        "Informe o CEP";

    }

  }


  let totalPedido =
    totais.subtotal;


  if (
    typeof estadoFrete.valor ===
    "number"
  ) {

    totalPedido +=
      estadoFrete.valor;

  }


  if (total) {

    total.textContent =
      brl(
        totalPedido
      );

  }


  if (parcelamento) {

    const parcelas =
      Number(
        CONFIG?.parcelas ||
        10
      );


    parcelamento.textContent =
      "ou " +
      parcelas +
      "x de " +
      brl(
        totalPedido /
        parcelas
      ) +
      " sem juros";

  }


  atualizarAvisoFrete(
    carrinho
  );

}


// ============================================================
// CARRINHO VAZIO
// ============================================================

function mostrarCarrinhoVazio() {

  const layout =
    document.getElementById(
      "carrinho-layout"
    );


  const vazio =
    document.getElementById(
      "carrinho-vazio"
    );


  if (layout) {

    layout.style.display =
      "none";

  }


  if (vazio) {

    vazio.hidden =
      false;

  }

}


// ============================================================
// CARRINHO COM PRODUTOS
// ============================================================

function esconderCarrinhoVazio() {

  const layout =
    document.getElementById(
      "carrinho-layout"
    );


  const vazio =
    document.getElementById(
      "carrinho-vazio"
    );


  if (layout) {

    layout.style.display =
      "grid";

  }


  if (vazio) {

    vazio.hidden =
      true;

  }

}


// ============================================================
// RENDERIZA
// ============================================================

function renderizarCarrinho() {

  const carrinho =
    obterCarrinho();


  if (
    !carrinho.length
  ) {

    mostrarCarrinhoVazio();

    return;

  }


  esconderCarrinhoVazio();


  const container =
    document.getElementById(
      "carrinho-itens"
    );


  if (!container) {

    return;

  }


  container.innerHTML =
    "";


  carrinho.forEach(
    (item) => {

      container.appendChild(
        criarItemCarrinho(
          item
        )
      );

    }
  );


  atualizarResumoCarrinho(
    carrinho
  );

}


// ============================================================
// CONTINUAR PARA ENTREGA
// ============================================================

function continuarParaEntrega() {

  const carrinho =
    obterCarrinho();


  if (
    !carrinho.length
  ) {

    return;

  }


  const regra =
    verificarFreteGratis(
      carrinho
    );


  const inputCep =
    document.getElementById(
      "cep-frete"
    );


  const cep =
    inputCep
      ? formatarCep(
          inputCep.value
        )
      : "";


  // ==========================================================
  // CEP OBRIGATÓRIO
  // ==========================================================

  if (
    !cepValido(
      cep
    )
  ) {

    alert(
      "Informe o CEP de entrega antes de continuar."
    );


    if (inputCep) {

      inputCep.focus();

      inputCep.scrollIntoView({
        behavior:
          "smooth",

        block:
          "center"
      });

    }


    return;

  }


  const totais =
    calcularTotais(
      carrinho
    );


  const frete = {

    cep:
      cep,

    gratis:
      regra.gratis,

    valor:
      regra.gratis
        ? 0
        : null,

    status:
      regra.gratis
        ? "gratis"
        : "aguardando_calculo",

    producao: {
      minimo:
        CONFIG_FRETE.producaoMin,

      maximo:
        CONFIG_FRETE.producaoMax
    },

    entrega: {
      minimo:
        CONFIG_FRETE.entregaMin,

      maximo:
        CONFIG_FRETE.entregaMax
    }

  };


  const pedido = {

    itens:
      carrinho,

    subtotal:
      totais.subtotal,

    totalCortinas:
      totais.cortinas,

    totalTrilhos:
      totais.trilhos,

    frete:
      frete,

    total:
      regra.gratis
        ? totais.subtotal
        : null,

    criadoEm:
      new Date()
        .toISOString()

  };


  localStorage.setItem(
    "salvatexPedidoAtual",
    JSON.stringify(
      pedido
    )
  );


  // ==========================================================
  // PRÓXIMA PÁGINA
  // ==========================================================

  window.location.href =
    "checkout.html";

}


// ============================================================
// CEP
// ============================================================

const inputCep =
  document.getElementById(
    "cep-frete"
  );


if (inputCep) {

  inputCep.addEventListener(
    "input",
    () => {

      inputCep.value =
        formatarCep(
          inputCep.value
        );

    }
  );


  inputCep.addEventListener(
    "keydown",
    (evento) => {

      if (
        evento.key ===
        "Enter"
      ) {

        calcularFrete();

      }

    }
  );

}


// ============================================================
// BOTÃO CALCULAR
// ============================================================

const botaoCalcularFrete =
  document.getElementById(
    "calcular-frete"
  );


if (
  botaoCalcularFrete
) {

  botaoCalcularFrete.addEventListener(
    "click",
    calcularFrete
  );

}


// ============================================================
// FINALIZAR
// ============================================================

const botaoFinalizar =
  document.getElementById(
    "finalizar-pedido"
  );


if (
  botaoFinalizar
) {

  botaoFinalizar.addEventListener(
    "click",
    continuarParaEntrega
  );

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

renderizarCarrinho();
