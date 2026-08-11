// ============================================================
// PAGAMENTO - SALVATEX CORTINAS
// ============================================================

// ============================================================
// CHAVES DO SISTEMA
//
// Mantemos compatibilidade com os dois nomes usados
// anteriormente durante o desenvolvimento.
// ============================================================

const CHAVE_PEDIDO_PRINCIPAL =
  "salvatex_pedido_atual";

const CHAVE_PEDIDO_ALTERNATIVA =
  "salvatexPedidoAtual";

const CHAVE_CARRINHO =
  "salvatexCarrinho";


// ============================================================
// CONFIGURAÇÕES
// ============================================================

const PAGAMENTO_CONFIG = {

  parcelas:
    Number(
      CONFIG?.parcelas || 10
    ),

  freteGratisMinimo:
    500,

  producao:
    "5 a 10 dias úteis",

  entrega:
    "6 a 12 dias úteis após o envio"

};


// ============================================================
// ESTADO
// ============================================================

let formaPagamentoSelecionada =
  "";

let pedidoAtual =
  null;


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
// FORMATAR MEDIDA
// ============================================================

function formatarMedida(valor) {

  return Number(
    valor || 0
  )
    .toFixed(2)
    .replace(".", ",");

}


// ============================================================
// LER JSON DO LOCALSTORAGE
// ============================================================

function lerJSON(chave) {

  try {

    const valor =
      localStorage.getItem(
        chave
      );


    if (!valor) {

      return null;

    }


    return JSON.parse(
      valor
    );

  } catch (erro) {

    console.error(
      "Erro ao ler:",
      chave,
      erro
    );


    return null;

  }

}


// ============================================================
// OBTER PEDIDO
// ============================================================

function obterPedido() {

  // ==========================================================
  // PRIMEIRA CHAVE
  // ==========================================================

  const pedidoPrincipal =
    lerJSON(
      CHAVE_PEDIDO_PRINCIPAL
    );


  if (
    pedidoPrincipal &&
    Array.isArray(
      pedidoPrincipal.itens
    ) &&
    pedidoPrincipal.itens.length
  ) {

    return pedidoPrincipal;

  }


  // ==========================================================
  // SEGUNDA CHAVE
  // ==========================================================

  const pedidoAlternativo =
    lerJSON(
      CHAVE_PEDIDO_ALTERNATIVA
    );


  if (
    pedidoAlternativo &&
    Array.isArray(
      pedidoAlternativo.itens
    ) &&
    pedidoAlternativo.itens.length
  ) {

    return pedidoAlternativo;

  }


  // ==========================================================
  // FALLBACK DIRETO DO CARRINHO
  // ==========================================================

  const carrinho =
    lerJSON(
      CHAVE_CARRINHO
    );


  if (
    Array.isArray(
      carrinho
    ) &&
    carrinho.length
  ) {

    return {

      itens:
        carrinho,

      criadoEm:
        new Date()
          .toISOString()

    };

  }


  return null;

}


// ============================================================
// IDENTIFICAR TIPO DO ITEM
// ============================================================

function itemEhTrilho(item) {

  return (
    item.tipo === "trilho"
  );

}


// ============================================================
// CALCULAR TOTAIS
// ============================================================

function calcularTotais(itens) {

  let cortinas = 0;

  let trilhos = 0;


  itens.forEach(
    (item) => {

      const valor =
        Number(
          item.total || 0
        );


      if (
        itemEhTrilho(item)
      ) {

        trilhos +=
          valor;

      } else {

        cortinas +=
          valor;

      }

    }
  );


  return {

    cortinas,

    trilhos,

    produtos:
      cortinas +
      trilhos

  };

}


// ============================================================
// FRETE
//
// REGRA:
//
// Apenas cortinas contam para atingir R$ 500.
//
// Se atingir R$ 500 em cortinas:
// frete grátis inclusive para trilho/varão comprado junto.
//
// Trilho sozinho não recebe frete grátis.
// ============================================================

function obterFrete(
  pedido
) {

  const itens =
    pedido.itens || [];


  const totais =
    calcularTotais(
      itens
    );


  const possuiCortina =
    itens.some(
      (item) =>
        !itemEhTrilho(item)
    );


  // ==========================================================
  // SE O CHECKOUT JÁ SALVOU FRETE GRÁTIS
  // ==========================================================

  if (
    pedido.frete &&
    pedido.frete.gratis === true
  ) {

    return {

      gratis:
        true,

      valor:
        0,

      texto:
        "Grátis"

    };

  }


  // ==========================================================
  // CONFERE PELA REGRA
  // ==========================================================

  if (
    possuiCortina &&
    totais.cortinas >=
      PAGAMENTO_CONFIG
        .freteGratisMinimo
  ) {

    return {

      gratis:
        true,

      valor:
        0,

      texto:
        "Grátis"

    };

  }


  // ==========================================================
  // FRETE PAGO
  // ==========================================================

  return {

    gratis:
      false,

    valor:
      null,

    texto:
      "Calculado após o pedido"

  };

}


// ============================================================
// CRIAR LINHA DE DETALHE
// ============================================================

function criarLinhaDetalhe(
  texto
) {

  const div =
    document.createElement(
      "div"
    );


  div.className =
    "pagamento-item-detalhe";


  div.textContent =
    texto;


  return div;

}


// ============================================================
// CRIAR ITEM CORTINA
// ============================================================

function criarResumoCortina(
  item,
  numero
) {

  const bloco =
    document.createElement(
      "div"
    );


  bloco.className =
    "pagamento-item";


  // ==========================================================
  // TOPO
  // ==========================================================

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
    "Cortina " +
    numero;


  const preco =
    document.createElement(
      "strong"
    );


  preco.textContent =
    brl(
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


  // ==========================================================
  // PRODUTO
  // ==========================================================

  const produto =
    document.createElement(
      "div"
    );


  produto.className =
    "pagamento-item-produto";


  produto.textContent =
    (
      item.tecido ||
      "Cortina sob medida"
    ) +
    (
      item.cor
        ? " · " +
          item.cor
        : ""
    );


  bloco.appendChild(
    produto
  );


  // ==========================================================
  // MODELO
  // ==========================================================

  if (item.modelo) {

    bloco.appendChild(
      criarLinhaDetalhe(
        "Modelo: " +
        item.modelo
      )
    );

  }


  // ==========================================================
  // FORRO
  // ==========================================================

  if (item.forro) {

    bloco.appendChild(
      criarLinhaDetalhe(
        "Forro: " +
        item.forro
      )
    );

  }


  // ==========================================================
  // AMBIENTE
  // ==========================================================

  const largura =
    Number(
      item.larguraAmbiente ??
      item.largura ??
      0
    );


  const altura =
    Number(
      item.altura || 0
    );


  if (
    largura > 0 &&
    altura > 0
  ) {

    bloco.appendChild(
      criarLinhaDetalhe(
        "Ambiente: " +
        formatarMedida(
          largura
        ) +
        " × " +
        formatarMedida(
          altura
        ) +
        " m"
      )
    );

  }


  // ==========================================================
  // FRANZIMENTO
  // ==========================================================

  if (item.franzimento) {

    bloco.appendChild(
      criarLinhaDetalhe(
        "Franzimento: " +
        String(
          item.franzimento
        )
          .replace(
            ".",
            ","
          ) +
        "x"
      )
    );

  }


  return bloco;

}


// ============================================================
// CRIAR ITEM TRILHO / VARÃO
// ============================================================

function criarResumoTrilho(
  item
) {

  const bloco =
    document.createElement(
      "div"
    );


  bloco.className =
    "pagamento-item";


  // ==========================================================
  // TOPO
  // ==========================================================

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
    item.produto ||
    item.trilho ||
    "Trilho / Varão";


  const preco =
    document.createElement(
      "strong"
    );


  preco.textContent =
    brl(
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


  // ==========================================================
  // MEDIDA
  // ==========================================================

  if (
    Number(
      item.largura || 0
    ) > 0
  ) {

    bloco.appendChild(
      criarLinhaDetalhe(
        "Medida: " +
        formatarMedida(
          item.largura
        ) +
        " m"
      )
    );

  }


  return bloco;

}


// ============================================================
// RENDERIZAR ITENS
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


  let numeroCortina =
    0;


  itens.forEach(
    (item) => {

      if (
        itemEhTrilho(item)
      ) {

        container.appendChild(
          criarResumoTrilho(
            item
          )
        );


        return;

      }


      numeroCortina++;


      container.appendChild(
        criarResumoCortina(
          item,
          numeroCortina
        )
      );

    }
  );

}


// ============================================================
// RENDERIZAR CLIENTE
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
    pedido.cliente || {};


  if (!cliente.nome) {

    container.innerHTML =
      "";

    return;

  }


  container.innerHTML =
    "";


  const titulo =
    document.createElement(
      "strong"
    );


  titulo.textContent =
    cliente.nome;


  container.appendChild(
    titulo
  );


  // ==========================================================
  // ENDEREÇO
  // ==========================================================

  const partesEndereco = [];


  if (
    cliente.endereco
  ) {

    let endereco =
      cliente.endereco;


    if (
      cliente.numero
    ) {

      endereco +=
        ", " +
        cliente.numero;

    }


    partesEndereco.push(
      endereco
    );

  }


  if (
    cliente.complemento
  ) {

    partesEndereco.push(
      cliente.complemento
    );

  }


  if (
    cliente.bairro
  ) {

    partesEndereco.push(
      cliente.bairro
    );

  }


  if (
    cliente.cidade ||
    cliente.estado
  ) {

    partesEndereco.push(
      [
        cliente.cidade,
        cliente.estado
      ]
        .filter(Boolean)
        .join(" - ")
    );

  }


  if (
    cliente.cep
  ) {

    partesEndereco.push(
      "CEP " +
      cliente.cep
    );

  }


  if (
    partesEndereco.length
  ) {

    const endereco =
      document.createElement(
        "span"
      );


    endereco.textContent =
      partesEndereco.join(
        " · "
      );


    container.appendChild(
      endereco
    );

  }

}


// ============================================================
// ATUALIZAR RESUMO
// ============================================================

function atualizarResumo(
  pedido
) {

  const itens =
    pedido.itens ||
    [];


  const totais =
    calcularTotais(
      itens
    );


  const frete =
    obterFrete(
      pedido
    );


  const totalCortinas =
    document.getElementById(
      "pagamento-total-cortinas"
    );


  const totalTrilhos =
    document.getElementById(
      "pagamento-total-trilhos"
    );


  const linhaTrilhos =
    document.getElementById(
      "pagamento-linha-trilhos"
    );


  const freteElemento =
    document.getElementById(
      "pagamento-frete"
    );


  const totalElemento =
    document.getElementById(
      "pagamento-total"
    );


  const parcelamento =
    document.getElementById(
      "pagamento-parcelamento"
    );


  if (
    totalCortinas
  ) {

    totalCortinas.textContent =
      brl(
        totais.cortinas
      );

  }


  if (
    totalTrilhos
  ) {

    totalTrilhos.textContent =
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
    freteElemento
  ) {

    freteElemento.textContent =
      frete.texto;

  }


  // ==========================================================
  // TOTAL
  //
  // Como frete pago será calculado posteriormente,
  // aqui continua sendo o total dos produtos.
  // ==========================================================

  if (
    totalElemento
  ) {

    totalElemento.textContent =
      brl(
        totais.produtos
      );

  }


  if (
    parcelamento
  ) {

    parcelamento.textContent =
      "ou " +
      PAGAMENTO_CONFIG
        .parcelas +
      "x de " +
      brl(
        totais.produtos /
        PAGAMENTO_CONFIG
          .parcelas
      ) +
      " sem juros";

  }


  window.pagamentoTotais =
    totais;


  window.pagamentoFrete =
    frete;

}


// ============================================================
// ATUALIZAR INFORMAÇÃO DA FORMA DE PAGAMENTO
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


  if (!info) {

    return;

  }


  // ==========================================================
  // NADA SELECIONADO
  // ==========================================================

  if (
    !formaPagamentoSelecionada
  ) {

    info.textContent =
      "Selecione a forma de pagamento para continuar.";


    if (botao) {

      botao.textContent =
        "Finalizar pagamento";

    }


    return;

  }


  // ==========================================================
  // CARTÃO
  // ==========================================================

  if (
    formaPagamentoSelecionada ===
    "cartao"
  ) {

    info.innerHTML =
      `
        <strong>Cartão de crédito</strong>
        <br>
        Pagamento em até
        ${PAGAMENTO_CONFIG.parcelas}x sem juros.
      `;


    if (botao) {

      botao.textContent =
        "Pagar com cartão";

    }


    return;

  }


  // ==========================================================
  // PIX
  // ==========================================================

  if (
    formaPagamentoSelecionada ===
    "pix"
  ) {

    info.innerHTML =
      `
        <strong>PIX</strong>
        <br>
        Pagamento à vista.
      `;


    if (botao) {

      botao.textContent =
        "Pagar com PIX";

    }

  }

}


// ============================================================
// SALVAR FORMA DE PAGAMENTO
// ============================================================

function salvarFormaPagamento() {

  if (!pedidoAtual) {

    return false;

  }


  const pagamento = {

    forma:
      formaPagamentoSelecionada,

    status:
      "aguardando_pagamento",

    atualizadoEm:
      new Date()
        .toISOString()

  };


  const pedidoAtualizado = {

    ...pedidoAtual,

    pagamento:
      pagamento

  };


  // ==========================================================
  // SALVA NAS DUAS CHAVES PARA MANTER COMPATIBILIDADE
  // ==========================================================

  localStorage.setItem(
    CHAVE_PEDIDO_PRINCIPAL,
    JSON.stringify(
      pedidoAtualizado
    )
  );


  localStorage.setItem(
    CHAVE_PEDIDO_ALTERNATIVA,
    JSON.stringify(
      pedidoAtualizado
    )
  );


  pedidoAtual =
    pedidoAtualizado;


  return true;

}


// ============================================================
// FINALIZAR PAGAMENTO
//
// IMPORTANTE:
//
// Ainda NÃO existe integração com Cielo ou Mercado Pago.
//
// Portanto, não coletamos número do cartão e não geramos
// PIX falso.
//
// Quando conectarmos o backend/gateway, esta será a função
// que chamará a API de pagamento.
// ============================================================

function finalizarPagamento() {

  if (
    !formaPagamentoSelecionada
  ) {

    alert(
      "Selecione uma forma de pagamento."
    );


    const primeiraOpcao =
      document.querySelector(
        'input[name="forma-pagamento"]'
      );


    if (primeiraOpcao) {

      primeiraOpcao.scrollIntoView({
        behavior:
          "smooth",

        block:
          "center"
      });

    }


    return;

  }


  if (
    !pedidoAtual
  ) {

    alert(
      "Não foi possível localizar o pedido."
    );


    return;

  }


  salvarFormaPagamento();


  // ==========================================================
  // CARTÃO
  // ==========================================================

  if (
    formaPagamentoSelecionada ===
    "cartao"
  ) {

    alert(
      "Forma de pagamento salva. A integração segura do cartão será conectada na próxima etapa."
    );


    return;

  }


  // ==========================================================
  // PIX
  // ==========================================================

  if (
    formaPagamentoSelecionada ===
    "pix"
  ) {

    alert(
      "Forma de pagamento salva. A geração do PIX será conectada na próxima etapa."
    );

  }

}


// ============================================================
// CONFIGURAR FORMAS DE PAGAMENTO
// ============================================================

function configurarFormasPagamento() {

  const radios =
    document.querySelectorAll(
      'input[name="forma-pagamento"]'
    );


  radios.forEach(
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
// PEDIDO VAZIO
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

      <div
        style="
          max-width:700px;
          margin:80px auto;
          padding:40px 24px;
          text-align:center;
        "
      >

        <h1>
          Pedido não encontrado
        </h1>

        <p>
          Volte ao configurador e adicione
          uma cortina ao carrinho.
        </p>

        <a
          href="index.html"
          style="
            display:inline-block;
            margin-top:18px;
            padding:13px 20px;
            background:#211d18;
            color:#fff;
            border-radius:10px;
          "
        >
          Configurar cortina
        </a>

      </div>

    `;

}


// ============================================================
// BOTÃO FINALIZAR
// ============================================================

const botaoFinalizar =
  document.getElementById(
    "pagamento-finalizar"
  );


if (
  botaoFinalizar
) {

  botaoFinalizar.addEventListener(
    "click",
    finalizarPagamento
  );

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

function iniciarPagamento() {

  const pedido =
    obterPedido();


  if (
    !pedido ||
    !Array.isArray(
      pedido.itens
    ) ||
    !pedido.itens.length
  ) {

    mostrarPedidoVazio();

    return;

  }


  pedidoAtual =
    pedido;


  configurarFormasPagamento();


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


// ============================================================
// INICIAR
// ============================================================

iniciarPagamento();
