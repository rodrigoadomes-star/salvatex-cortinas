// ============================================================
// CARRINHO - SALVATEX
// ESTRUTURA GENÉRICA
// ============================================================

const CHAVE_PEDIDO =
  "salvatex_pedido_atual";


// ============================================================
// CRIAR DETALHE
// ============================================================

function criarDetalhe(
  detalhe
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
    (
      detalhe.rotulo ||
      "Detalhe"
    ) +
    ": ";


  const span =
    document.createElement(
      "span"
    );


  span.textContent =
    detalhe.valor ??
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
// CRIAR ITEM
// ============================================================

function criarItemCarrinho(
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
      item.nome;


    imagem.onerror =
      () => {

        const placeholder =
          document.createElement(
            "div"
          );


        placeholder.className =
          "carrinho-item-sem-imagem";


        placeholder.textContent =
          item.nome;


        imagem.replaceWith(
          placeholder
        );

      };


    artigo.appendChild(
      imagem
    );

  } else {

    const placeholder =
      document.createElement(
        "div"
      );


    placeholder.className =
      "carrinho-item-sem-imagem";


    placeholder.textContent =
      SalvatexCarrinho
        .nomeCategoria(
          item.categoria
        );


    artigo.appendChild(
      placeholder
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
    item.nome;


  const preco =
    document.createElement(
      "div"
    );


  preco.className =
    "carrinho-item-preco";


  preco.textContent =
    SalvatexCarrinho
      .brl(
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
  // CATEGORIA
  // ==========================================================

  const categoria =
    document.createElement(
      "div"
    );


  categoria.style.marginTop =
    "4px";


  categoria.style.fontSize =
    "11px";


  categoria.style.color =
    "#746c63";


  categoria.textContent =
    SalvatexCarrinho
      .nomeCategoria(
        item.categoria
      );


  conteudo.appendChild(
    categoria
  );


  // ==========================================================
  // DETALHES
  // ==========================================================

  if (
    Array.isArray(
      item.detalhes
    ) &&
    item.detalhes.length
  ) {

    const detalhes =
      document.createElement(
        "div"
      );


    detalhes.className =
      "carrinho-item-detalhes";


    item.detalhes.forEach(
      (detalhe) => {

        detalhes.appendChild(
          criarDetalhe(
            detalhe
          )
        );

      }
    );


    conteudo.appendChild(
      detalhes
    );

  }


  // ==========================================================
  // QUANTIDADE
  // ==========================================================

  if (
    Number(
      item.quantidade
    ) > 1
  ) {

    const quantidade =
      document.createElement(
        "div"
      );


    quantidade.style.marginTop =
      "10px";


    quantidade.style.fontSize =
      "12px";


    quantidade.style.color =
      "#746c63";


    quantidade.textContent =
      "Quantidade: " +
      item.quantidade;


    conteudo.appendChild(
      quantidade
    );

  }


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
    "Remover";


  remover.addEventListener(
    "click",
    () => {

      SalvatexCarrinho
        .removerItem(
          item.id
        );


      renderizarCarrinho();

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
// RESUMO DINÂMICO POR CATEGORIA
// ============================================================

function renderizarCategoriasResumo(
  carrinho
) {

  const resumo =
    document.getElementById(
      "carrinho-resumo"
    );


  if (!resumo) {
    return;
  }


  // Esconde linhas antigas fixas.

  const linhaCortinas =
    document
      .getElementById(
        "resumo-cortinas"
      )
      ?.closest(
        ".carrinho-resumo-linha"
      );


  if (linhaCortinas) {

    linhaCortinas.style.display =
      "none";

  }


  const linhaTrilhos =
    document.getElementById(
      "resumo-linha-trilhos"
    );


  if (linhaTrilhos) {

    linhaTrilhos.style.display =
      "none";

  }


  resumo
    .querySelectorAll(
      ".resumo-categoria-dinamica"
    )
    .forEach(
      (linha) =>
        linha.remove()
    );


  const divisor =
    resumo.querySelector(
      ".carrinho-resumo-divisor"
    );


  const totais =
    SalvatexCarrinho
      .calcularTotaisPorCategoria(
        carrinho
      );


  Object.entries(
    totais
  ).forEach(
    (
      [
        categoria,
        valor
      ]
    ) => {

      const linha =
        document.createElement(
          "div"
        );


      linha.className =
        "carrinho-resumo-linha resumo-categoria-dinamica";


      const nome =
        document.createElement(
          "span"
        );


      nome.textContent =
        SalvatexCarrinho
          .nomeCategoria(
            categoria
          );


      const preco =
        document.createElement(
          "strong"
        );


      preco.textContent =
        SalvatexCarrinho
          .brl(
            valor
          );


      linha.appendChild(
        nome
      );


      linha.appendChild(
        preco
      );


      if (divisor) {

        resumo.insertBefore(
          linha,
          divisor
        );

      } else {

        resumo.appendChild(
          linha
        );

      }

    }
  );

}


// ============================================================
// RESUMO
// ============================================================

function atualizarResumoCarrinho(
  carrinho
) {

  renderizarCategoriasResumo(
    carrinho
  );


  const total =
    SalvatexCarrinho
      .calcularTotal(
        carrinho
      );


  const totalElemento =
    document.getElementById(
      "carrinho-total"
    );


  const parcelamento =
    document.getElementById(
      "carrinho-parcelamento"
    );


  if (totalElemento) {

    totalElemento.textContent =
      SalvatexCarrinho
        .brl(
          total
        );

  }


  if (parcelamento) {

    const parcelas =
      Number(
        CONFIG?.parcelas ||
        10
      );


    parcelamento.textContent =
      total > 0
        ? "ou " +
          parcelas +
          "x de " +
          SalvatexCarrinho
            .brl(
              total /
              parcelas
            ) +
          " sem juros"
        : "";

  }

}


// ============================================================
// VAZIO
// ============================================================

function mostrarCarrinhoVazio() {

  const layout =
    document.getElementById(
      "carrinho-layout"
    );


  if (!layout) {
    return;
  }


  layout.innerHTML = `

    <div class="carrinho-vazio">

      <div class="carrinho-vazio-icone">
        🛒
      </div>

      <h2>
        Seu carrinho está vazio
      </h2>

      <p>
        Configure um produto para adicioná-lo
        ao carrinho.
      </p>

      <a
        href="index.html"
        class="carrinho-vazio-botao"
      >
        Configurar minha cortina
      </a>

    </div>

  `;


  layout.style.display =
    "block";

}


// ============================================================
// RENDERIZAR
// ============================================================

function renderizarCarrinho() {

  const carrinho =
    SalvatexCarrinho
      .obterCarrinho();


  if (!carrinho.length) {

    mostrarCarrinhoVazio();

    return;

  }


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
// CONTINUAR PARA CHECKOUT
// ============================================================

function continuarParaEntrega() {

  const carrinho =
    SalvatexCarrinho
      .obterCarrinho();


  if (!carrinho.length) {

    return;

  }


  const totais =
    SalvatexCarrinho
      .calcularTotaisPorCategoria(
        carrinho
      );


  const total =
    SalvatexCarrinho
      .calcularTotal(
        carrinho
      );


  const pedido =
    SalvatexPedido.criarPedido(
      carrinho,
      {
        status: "rascunho",
        etapa: "entrega",
        totaisPorCategoria: totais,
        totais: {
          produtos: total,
          frete: null,
          desconto: 0,
          total: total
        }
      }
    );

  SalvatexPedido.salvarPedido(
    pedido
  );


  window.location.href =
    "checkout.html";

}


// ============================================================
// BOTÃO
// ============================================================

const botaoFinalizar =
  document.getElementById(
    "finalizar-pedido"
  );


if (botaoFinalizar) {

  botaoFinalizar.addEventListener(
    "click",
    continuarParaEntrega
  );

}


// ============================================================
// INICIAR
// ============================================================

renderizarCarrinho();
