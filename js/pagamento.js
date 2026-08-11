// ============================================================
// PAGAMENTO - SALVATEX
// ESTRUTURA GENÉRICA
// ============================================================

const CHAVE_PEDIDO =
  "salvatex_pedido_atual";


const PAGAMENTO_CONFIG = {

  parcelas:
    Number(
      CONFIG?.parcelas ||
      10
    )

};


let pedidoAtual =
  null;


let formaPagamentoSelecionada =
  "";


// ============================================================
// PEDIDO
// ============================================================

function obterPedido() {

  try {

    const salvo =
      localStorage.getItem(
        CHAVE_PEDIDO
      );


    if (!salvo) {
      return null;
    }


    const pedido =
      JSON.parse(
        salvo
      );


    if (
      !pedido ||
      !Array.isArray(
        pedido.itens
      ) ||
      !pedido.itens.length
    ) {

      return null;

    }


    pedido.itens =
      SalvatexCarrinho
        .normalizarCarrinho(
          pedido.itens
        );


    return pedido;


  } catch (erro) {

    console.error(
      erro
    );


    return null;

  }

}


// ============================================================
// ITEM
// ============================================================

function criarItemResumo(
  item
) {

  const bloco =
    document.createElement(
      "div"
    );


  bloco.className =
    "pagamento-item";


  const topo =
    document.createElement(
      "div"
    );


  topo.className =
    "pagamento-item-topo";


  const nome =
    document.createElement(
      "strong"
    );


  nome.textContent =
    item.nome;


  const preco =
    document.createElement(
      "strong"
    );


  preco.textContent =
    SalvatexCarrinho
      .brl(
        item.total
      );


  topo.appendChild(
    nome
  );


  topo.appendChild(
    preco
  );


  bloco.appendChild(
    topo
  );


  const categoria =
    document.createElement(
      "div"
    );


  categoria.className =
    "pagamento-item-produto";


  categoria.textContent =
    SalvatexCarrinho
      .nomeCategoria(
        item.categoria
      );


  bloco.appendChild(
    categoria
  );


  item.detalhes.forEach(
    (detalhe) => {

      const linha =
        document.createElement(
          "div"
        );


      linha.className =
        "pagamento-item-detalhe";


      linha.textContent =
        detalhe.rotulo +
        ": " +
        detalhe.valor;


      bloco.appendChild(
        linha
      );

    }
  );


  return bloco;

}


// ============================================================
// ITENS
// ============================================================

function renderizarItens(
  itens
) {

  const container =
    document.getElementById(
      "pagamento-itens"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  itens.forEach(
    (item) => {

      container.appendChild(
        criarItemResumo(
          item
        )
      );

    }
  );

}


// ============================================================
// CLIENTE
// ============================================================

function renderizarCliente(
  pedido
) {

  const container =
    document.getElementById(
      "pagamento-cliente"
    );


  if (!container) {
    return;
  }


  const cliente =
    pedido.cliente ||
    {};


  container.innerHTML =
    "";


  if (!cliente.nome) {
    return;
  }


  const nome =
    document.createElement(
      "strong"
    );


  nome.textContent =
    cliente.nome;


  container.appendChild(
    nome
  );


  const partes =
    [];


  if (cliente.endereco) {

    partes.push(
      cliente.endereco +
      (
        cliente.numero
          ? ", " +
            cliente.numero
          : ""
      )
    );

  }


  if (cliente.complemento) {

    partes.push(
      cliente.complemento
    );

  }


  if (cliente.bairro) {

    partes.push(
      cliente.bairro
    );

  }


  if (
    cliente.cidade ||
    cliente.estado
  ) {

    partes.push(
      [
        cliente.cidade,
        cliente.estado
      ]
        .filter(Boolean)
        .join(" - ")
    );

  }


  if (cliente.cep) {

    partes.push(
      "CEP " +
      cliente.cep
    );

  }


  if (partes.length) {

    const endereco =
      document.createElement(
        "span"
      );


    endereco.textContent =
      partes.join(
        " · "
      );


    container.appendChild(
      endereco
    );

  }

}


// ============================================================
// CATEGORIAS DINÂMICAS
// ============================================================

function renderizarCategoriasResumo(
  itens
) {

  const resumo =
    document.querySelector(
      ".pagamento-resumo"
    );


  if (!resumo) {
    return;
  }


  const cortinas =
    document
      .getElementById(
        "pagamento-total-cortinas"
      )
      ?.closest(
        ".pagamento-resumo-linha"
      );


  if (cortinas) {

    cortinas.style.display =
      "none";

  }


  const trilhos =
    document.getElementById(
      "pagamento-linha-trilhos"
    );


  if (trilhos) {

    trilhos.style.display =
      "none";

  }


  resumo
    .querySelectorAll(
      ".pagamento-categoria-dinamica"
    )
    .forEach(
      (elemento) =>
        elemento.remove()
    );


  const divisores =
    resumo.querySelectorAll(
      ".pagamento-resumo-divisor"
    );


  const divisor =
    divisores[
      divisores.length - 1
    ];


  const categorias =
    SalvatexCarrinho
      .calcularTotaisPorCategoria(
        itens
      );


  Object.entries(
    categorias
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
        "pagamento-resumo-linha pagamento-categoria-dinamica";


      linha.innerHTML =
        `
          <span>
            ${SalvatexCarrinho.nomeCategoria(categoria)}
          </span>

          <strong>
            ${SalvatexCarrinho.brl(valor)}
          </strong>
        `;


      if (divisor) {

        resumo.insertBefore(
          linha,
          divisor
        );

      }

    }
  );

}


// ============================================================
// RESUMO
// ============================================================

function atualizarResumo(
  pedido
) {

  const itens =
    pedido.itens;


  renderizarCategoriasResumo(
    itens
  );


  const produtos =
    SalvatexCarrinho
      .calcularTotal(
        itens
      );


  const frete =
    pedido.frete ||
    SalvatexCarrinho
      .calcularFrete(
        itens
      );


  const freteElemento =
    document.getElementById(
      "pagamento-frete"
    );


  const avisoFrete =
    document.getElementById(
      "pagamento-frete-aviso"
    );


  const totalElemento =
    document.getElementById(
      "pagamento-total"
    );


  const parcelamento =
    document.getElementById(
      "pagamento-parcelamento"
    );


  if (freteElemento) {

    freteElemento.textContent =
      frete.texto ||
      "A calcular";

  }


  if (avisoFrete) {

    avisoFrete.textContent =
      frete.aviso ||
      "";

  }


  const totalFinal =
    produtos +
    (
      Number(
        frete.valor
      ) ||
      0
    );


  if (totalElemento) {

    totalElemento.textContent =
      SalvatexCarrinho
        .brl(
          totalFinal
        );

  }


  if (parcelamento) {

    parcelamento.textContent =
      "ou " +
      PAGAMENTO_CONFIG
        .parcelas +
      "x de " +
      SalvatexCarrinho
        .brl(
          totalFinal /
          PAGAMENTO_CONFIG
            .parcelas
        ) +
      " sem juros";

  }

}


// ============================================================
// OPÇÃO VISUAL
// ============================================================

function atualizarOpcaoSelecionada() {

  document
    .querySelectorAll(
      ".pagamento-opcao"
    )
    .forEach(
      (opcao) => {

        const radio =
          opcao.querySelector(
            'input[name="forma-pagamento"]'
          );


        opcao.classList.toggle(
          "selecionada",
          Boolean(
            radio?.checked
          )
        );

      }
    );

}


// ============================================================
// PAGAMENTO
// ============================================================

function atualizarInformacaoPagamento() {

  const info =
    document.getElementById(
      "pagamento-info"
    );


  const botao =
    document.getElementById(
      "pagamento-finalizar"
    );


  atualizarOpcaoSelecionada();


  if (
    !formaPagamentoSelecionada
  ) {

    if (info) {

      info.textContent =
        "Selecione a forma de pagamento para continuar.";

    }


    if (botao) {

      botao.disabled =
        true;


      botao.textContent =
        "Selecione a forma de pagamento";

    }


    return;

  }


  if (
    formaPagamentoSelecionada ===
    "cartao"
  ) {

    if (info) {

      info.innerHTML =
        `
          <strong>
            Cartão de crédito
          </strong>
          <br>
          Até ${PAGAMENTO_CONFIG.parcelas}x sem juros.
        `;

    }


    if (botao) {

      botao.disabled =
        false;


      botao.textContent =
        "Continuar com cartão";

    }

  }


  if (
    formaPagamentoSelecionada ===
    "pix"
  ) {

    if (info) {

      info.innerHTML =
        `
          <strong>
            PIX
          </strong>
          <br>
          Pagamento à vista.
        `;

    }


    if (botao) {

      botao.disabled =
        false;


      botao.textContent =
        "Continuar com PIX";

    }

  }

}


// ============================================================
// RADIOS
// ============================================================

function configurarFormasPagamento() {

  document
    .querySelectorAll(
      'input[name="forma-pagamento"]'
    )
    .forEach(
      (radio) => {

        radio.addEventListener(
          "change",
          () => {

            formaPagamentoSelecionada =
              radio.value;


            atualizarInformacaoPagamento();

          }
        );

      }
    );

}


// ============================================================
// SALVAR PAGAMENTO
// ============================================================

function salvarFormaPagamento() {

  if (!pedidoAtual) {
    return false;
  }


  pedidoAtual = {

    ...pedidoAtual,

    status:
      "aguardando_pagamento",

    etapa:
      "pagamento",

    pagamento: {

      forma:
        formaPagamentoSelecionada,

      status:
        "aguardando_pagamento",

      atualizadoEm:
        new Date()
          .toISOString()

    },

    atualizadoEm:
      new Date()
        .toISOString()

  };


  pedidoAtual =
    SalvatexPedido.salvarPedido(
      pedidoAtual
    );


  return Boolean(pedidoAtual);

}


// ============================================================
// FINALIZAR
// ============================================================

function finalizarPagamento() {

  if (
    !formaPagamentoSelecionada
  ) {

    alert(
      "Selecione uma forma de pagamento."
    );


    return;

  }


  if (
    !salvarFormaPagamento()
  ) {

    alert(
      "Não foi possível salvar a forma de pagamento."
    );


    return;

  }


  if (
    formaPagamentoSelecionada ===
    "cartao"
  ) {

    alert(
      "Pedido preparado para pagamento com cartão. A integração do gateway será adicionada na próxima etapa."
    );


    return;

  }


  if (
    formaPagamentoSelecionada ===
    "pix"
  ) {

    alert(
      "Pedido preparado para pagamento via PIX. A integração do gateway será adicionada na próxima etapa."
    );

  }

}


// ============================================================
// VAZIO
// ============================================================

function mostrarPedidoVazio() {

  const pagina =
    document.querySelector(
      ".pagina-pagamento"
    );


  if (!pagina) {
    return;
  }


  pagina.innerHTML =
    `

      <div class="pagamento-vazio">

        <h1>
          Pedido não encontrado
        </h1>

        <p>
          Adicione um produto antes
          de continuar.
        </p>

        <a href="index.html">
          Voltar ao configurador
        </a>

      </div>

    `;

}


// ============================================================
// BOTÃO
// ============================================================

document
  .getElementById(
    "pagamento-finalizar"
  )
  ?.addEventListener(
    "click",
    finalizarPagamento
  );


// ============================================================
// INICIAR
// ============================================================

function iniciarPagamento() {

  const pedido =
    obterPedido();


  if (!pedido) {

    mostrarPedidoVazio();

    return;

  }


  if (
    !pedido.cliente?.nome
  ) {

    window.location.href =
      "checkout.html";


    return;

  }


  pedidoAtual =
    pedido;


  if (!pedido.backendRegistrado || !pedido.backendId) {

    console.warn(
      "Pedido ainda não possui confirmação do backend."
    );

  }


  configurarFormasPagamento();


  if (
    pedido.pagamento?.forma
  ) {

    formaPagamentoSelecionada =
      pedido.pagamento.forma;


    const radio =
      document.querySelector(
        `input[name="forma-pagamento"][value="${formaPagamentoSelecionada}"]`
      );


    if (radio) {

      radio.checked =
        true;

    }

  }


  renderizarCliente(
    pedido
  );


  renderizarItens(
    pedido.itens
  );


  atualizarResumo(
    pedido
  );


  atualizarInformacaoPagamento();

}


iniciarPagamento();
