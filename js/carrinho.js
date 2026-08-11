// ============================================================
// CARRINHO - SALVATEX CORTINAS
// ============================================================

const CHAVE_CARRINHO = "salvatexCarrinho";


// ============================================================
// FORMATAÇÃO BRL
// ============================================================

function brl(valor) {

  return Number(
    valor || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

}


// ============================================================
// FORMATA MEDIDA
// ============================================================

function formatarMedida(valor) {

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
// LIMPAR CARRINHO
// ============================================================

function limparCarrinho() {

  localStorage.removeItem(
    CHAVE_CARRINHO
  );


  renderizarCarrinho();

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


  renderizarCarrinho();

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
    titulo + ": ";


  const span =
    document.createElement(
      "span"
    );


  span.textContent =
    valor || "—";


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

  const placeholder =
    document.createElement(
      "div"
    );


  placeholder.className =
    "carrinho-item-sem-imagem";


  placeholder.textContent =
    texto;


  return placeholder;

}


// ============================================================
// CRIAR ITEM — CORTINA
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
  // IMAGEM
  // ==========================================================

  if (item.imagem) {

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


  // ==========================================================
  // TOPO
  // ==========================================================

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
      ? `Cortina ${item.tecido}`
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
        item.franzimento || ""
      )
        .replace(".", ",") +
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
  // AÇÕES
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
// CRIAR ITEM — TRILHO / VARÃO
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


  // ==========================================================
  // PLACEHOLDER
  //
  // Depois podemos colocar foto própria de cada trilho/varão.
  // ==========================================================

  artigo.appendChild(
    criarPlaceholder(
      "Trilho / Varão"
    )
  );


  // ==========================================================
  // CONTEÚDO
  // ==========================================================

  const conteudo =
    document.createElement(
      "div"
    );


  conteudo.className =
    "carrinho-item-conteudo";


  // ==========================================================
  // TOPO
  // ==========================================================

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
        item.quantidade || 1
      )
    )
  );


  conteudo.appendChild(
    detalhes
  );


  // ==========================================================
  // AÇÕES
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
// CRIAR ITEM
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
// MOSTRAR CARRINHO VAZIO
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
// ESCONDER CARRINHO VAZIO
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
// CALCULAR TOTAIS
// ============================================================

function calcularTotais(
  carrinho
) {

  let cortinas = 0;

  let trilhos = 0;

  let total = 0;


  carrinho.forEach(
    (item) => {

      const valor =
        Number(
          item.total || 0
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


      total +=
        valor;

    }
  );


  return {
    cortinas,
    trilhos,
    total
  };

}


// ============================================================
// ATUALIZAR RESUMO
// ============================================================

function atualizarResumoCarrinho(
  carrinho
) {

  const totais =
    calcularTotais(
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


  const totalElemento =
    document.getElementById(
      "carrinho-total"
    );


  const parcelamento =
    document.getElementById(
      "carrinho-parcelamento"
    );


  if (
    resumoCortinas
  ) {

    resumoCortinas.textContent =
      brl(
        totais.cortinas
      );

  }


  if (
    resumoTrilhos
  ) {

    resumoTrilhos.textContent =
      brl(
        totais.trilhos
      );

  }


  if (
    linhaTrilhos
  ) {

    linhaTrilhos.style.display =
      totais.trilhos > 0
        ? "flex"
        : "none";

  }


  if (
    totalElemento
  ) {

    totalElemento.textContent =
      brl(
        totais.total
      );

  }


  if (
    parcelamento
  ) {

    const parcelas =
      Number(
        CONFIG?.parcelas ||
        10
      );


    if (
      totais.total > 0
    ) {

      parcelamento.textContent =
        "ou " +
        parcelas +
        "x de " +
        brl(
          totais.total /
          parcelas
        ) +
        " sem juros";

    } else {

      parcelamento.textContent =
        "";

    }

  }

}


// ============================================================
// RENDERIZAR CARRINHO
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
// MONTAR MENSAGEM DO PEDIDO
// ============================================================

function montarMensagemPedido() {

  const carrinho =
    obterCarrinho();


  if (
    !carrinho.length
  ) {

    return "";

  }


  const totais =
    calcularTotais(
      carrinho
    );


  let mensagem =
    "Olá! Gostaria de finalizar este pedido:\n\n";


  let numeroCortina =
    0;


  carrinho.forEach(
    (item) => {

      // ======================================================
      // CORTINA
      // ======================================================

      if (
        item.tipo !==
        "trilho"
      ) {

        numeroCortina++;


        mensagem +=
          "CORTINA " +
          numeroCortina +
          "\n";


        mensagem +=
          "Modelo: " +
          (
            item.modelo ||
            "—"
          ) +
          "\n";


        mensagem +=
          "Tecido: " +
          (
            item.tecido ||
            "—"
          ) +
          "\n";


        mensagem +=
          "Cor: " +
          (
            item.cor ||
            "—"
          ) +
          "\n";


        mensagem +=
          "Forro: " +
          (
            item.forro ||
            "—"
          ) +
          "\n";


        mensagem +=
          "Ambiente: " +
          formatarMedida(
            item.larguraAmbiente ??
            item.largura
          ) +
          " m x " +
          formatarMedida(
            item.altura
          ) +
          " m\n";


        mensagem +=
          "Consumo: " +
          formatarMedida(
            item.consumoTecido
          ) +
          " m x " +
          formatarMedida(
            item.altura
          ) +
          " m\n";


        mensagem +=
          "Franzimento: " +
          String(
            item.franzimento ||
            "—"
          ).replace(
            ".",
            ","
          ) +
          "x\n";


        mensagem +=
          "Barra: " +
          (
            item.barra
              ? item.barra +
                " cm"
              : "Sob consulta"
          ) +
          "\n";


        mensagem +=
          "Valor: " +
          brl(
            item.total
          ) +
          "\n\n";


        return;

      }


      // ======================================================
      // TRILHO / VARÃO
      // ======================================================

      mensagem +=
        "TRILHO / VARÃO\n";


      mensagem +=
        "Produto: " +
        (
          item.produto ||
          item.trilho ||
          "—"
        ) +
        "\n";


      mensagem +=
        "Medida: " +
        formatarMedida(
          item.largura
        ) +
        " m\n";


      mensagem +=
        "Valor: " +
        brl(
          item.total
        ) +
        "\n\n";

    }
  );


  mensagem +=
    "TOTAL DO PEDIDO: " +
    brl(
      totais.total
    );


  return mensagem;

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


  const totais =
    calcularTotais(
      carrinho
    );


  localStorage.setItem(
    "salvatexPedidoAtual",
    JSON.stringify({
      itens:
        carrinho,

      subtotal:
        totais.total,

      criadoEm:
        new Date()
          .toISOString()
    })
  );


  // ==========================================================
  // CHECKOUT SERÁ O PRÓXIMO PASSO
  // ==========================================================

  window.location.href =
    "checkout.html";

}


// ============================================================
// BOTÃO CONTINUAR
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
