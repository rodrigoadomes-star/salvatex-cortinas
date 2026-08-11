// ============================================================
// PAGAMENTO - SALVATEX CORTINAS
// ============================================================


// ============================================================
// CHAVES DO SISTEMA
// ============================================================

const CHAVE_PEDIDO =
  "salvatex_pedido_atual";

const CHAVE_CARRINHO =
  "salvatexCarrinho";


// ============================================================
// CONFIGURAÇÕES
// ============================================================

const PAGAMENTO_CONFIG = {

  parcelas:
    Number(
      CONFIG?.parcelas ||
      10
    ),

  freteGratisMinimo:
    500,

  producao:
    "5 a 10 dias",

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

function formatarMedida(
  valor
) {

  return Number(
    valor || 0
  )
    .toFixed(2)
    .replace(
      ".",
      ","
    );

}


// ============================================================
// LER JSON
// ============================================================

function lerJSON(
  chave
) {

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
// SALVAR PEDIDO
// ============================================================

function salvarPedido(
  pedido
) {

  try {

    localStorage.setItem(
      CHAVE_PEDIDO,
      JSON.stringify(
        pedido
      )
    );


    pedidoAtual =
      pedido;


    return true;


  } catch (erro) {

    console.error(
      "Erro ao salvar pedido:",
      erro
    );


    return false;

  }

}


// ============================================================
// OBTER PEDIDO
// ============================================================

function obterPedido() {

  // ==========================================================
  // PEDIDO VINDO DO CHECKOUT
  // ==========================================================

  const pedido =
    lerJSON(
      CHAVE_PEDIDO
    );


  if (
    pedido &&
    Array.isArray(
      pedido.itens
    ) &&
    pedido.itens.length
  ) {

    return pedido;

  }


  // ==========================================================
  // FALLBACK DO CARRINHO
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
// IDENTIFICAR ITEM
// ============================================================

function itemEhCortina(
  item
) {

  return (
    item &&
    item.tipo ===
      "cortina"
  );

}


function itemEhTrilho(
  item
) {

  return (
    item &&
    item.tipo ===
      "trilho"
  );

}


// ============================================================
// CALCULAR TOTAIS
// ============================================================

function calcularTotais(
  itens
) {

  let cortinas = 0;

  let trilhos = 0;

  let produtos = 0;


  itens.forEach(
    (item) => {

      const valor =
        Number(
          item.total ||
          0
        );


      if (
        itemEhCortina(
          item
        )
      ) {

        cortinas +=
          valor;

      }


      if (
        itemEhTrilho(
          item
        )
      ) {

        trilhos +=
          valor;

      }


      produtos +=
        valor;

    }
  );


  return {

    cortinas,

    trilhos,

    produtos

  };

}


// ============================================================
// VERIFICAR SE EXISTE CORTINA
// ============================================================

function pedidoTemCortina(
  itens
) {

  return itens.some(
    (item) =>
      itemEhCortina(
        item
      )
  );

}


// ============================================================
// VERIFICAR SE EXISTE TRILHO
// ============================================================

function pedidoTemTrilho(
  itens
) {

  return itens.some(
    (item) =>
      itemEhTrilho(
        item
      )
  );

}


// ============================================================
// FRETE
//
// REGRA:
//
// R$ 500 OU MAIS EM CORTINAS
// = FRETE GRÁTIS.
//
// Trilho/varão comprado junto acompanha
// o frete grátis.
//
// Trilho sozinho não possui frete grátis.
//
// Se não for grátis, o valor será calculado
// posteriormente pela Salvatex.
// ============================================================

function obterFrete(
  pedido
) {

  const itens =
    pedido.itens ||
    [];


  // ==========================================================
  // UTILIZA PRIMEIRO O QUE O CHECKOUT SALVOU
  // ==========================================================

  if (
    pedido.frete
  ) {

    if (
      pedido.frete.gratis ===
      true
    ) {

      return {

        gratis:
          true,

        valor:
          0,

        status:
          "gratis",

        texto:
          "Grátis",

        aviso:
          pedido.frete.aviso ||
          "Seu pedido possui frete grátis."

      };

    }


    if (
      pedido.frete.status ===
      "aguardando_calculo"
    ) {

      return {

        gratis:
          false,

        valor:
          null,

        status:
          "aguardando_calculo",

        texto:
          "A calcular",

        aviso:
          pedido.frete.aviso ||
          "O valor do frete será calculado conforme o CEP de entrega."

      };

    }

  }


  // ==========================================================
  // FALLBACK PELA REGRA
  // ==========================================================

  const totais =
    calcularTotais(
      itens
    );


  const temCortina =
    pedidoTemCortina(
      itens
    );


  const temTrilho =
    pedidoTemTrilho(
      itens
    );


  if (
    temCortina &&
    totais.cortinas >=
      PAGAMENTO_CONFIG
        .freteGratisMinimo
  ) {

    return {

      gratis:
        true,

      valor:
        0,

      status:
        "gratis",

      texto:
        "Grátis",

      aviso:
        temTrilho
          ? "Frete grátis para as cortinas e o trilho/varão deste pedido."
          : "Seu pedido possui frete grátis."

    };

  }


  if (
    temTrilho &&
    !temCortina
  ) {

    return {

      gratis:
        false,

      valor:
        null,

      status:
        "aguardando_calculo",

      texto:
        "A calcular",

      aviso:
        "O frete do trilho/varão será calculado conforme o CEP de entrega."

    };

  }


  return {

    gratis:
      false,

    valor:
      null,

    status:
      "aguardando_calculo",

    texto:
      "A calcular",

    aviso:
      "O valor do frete será calculado conforme o CEP de entrega."

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
  // TECIDO + COR
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

  if (
    item.modelo
  ) {

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

  if (
    item.forro
  ) {

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
      item.larguraAmbiente ||
      item.largura ||
      0
    );


  const altura =
    Number(
      item.altura ||
      0
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

  if (
    item.franzimento
  ) {

    bloco.appendChild(
      criarLinhaDetalhe(
        "Franzimento: " +
        String(
          item.franzimento
        ).replace(
          ".",
          ","
        ) +
        "x"
      )
    );

  }


  // ==========================================================
  // BARRA
  // ==========================================================

  if (
    item.barra
  ) {

    bloco.appendChild(
      criarLinhaDetalhe(
        "Barra: " +
        item.barra +
        " cm"
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
  // IDENTIFICAÇÃO
  // ==========================================================

  const produto =
    document.createElement(
      "div"
    );


  produto.className =
    "pagamento-item-produto";


  produto.textContent =
    "Trilho / Varão";


  bloco.appendChild(
    produto
  );


  // ==========================================================
  // MEDIDA
  // ==========================================================

  const largura =
    Number(
      item.largura ||
      0
    );


  if (
    largura > 0
  ) {

    bloco.appendChild(
      criarLinhaDetalhe(
        "Medida: " +
        formatarMedida(
          largura
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
        itemEhCortina(
          item
        )
      ) {

        numeroCortina++;


        container.appendChild(
          criarResumoCortina(
            item,
            numeroCortina
          )
        );


        return;

      }


      if (
        itemEhTrilho(
          item
        )
      ) {

        container.appendChild(
          criarResumoTrilho(
            item
          )
        );

      }

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
    pedido.cliente ||
    {};


  container.innerHTML =
    "";


  if (
    !cliente.nome
  ) {

    const aviso =
      document.createElement(
        "span"
      );


    aviso.textContent =
      "Dados de entrega não informados.";


    container.appendChild(
      aviso
    );


    return;

  }


  // ==========================================================
  // NOME
  // ==========================================================

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

  const partesEndereco =
    [];


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
        .filter(
          Boolean
        )
        .join(
          " - "
        )
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


  // ==========================================================
  // CONTATO
  // ==========================================================

  const contatos =
    [];


  if (
    cliente.telefone
  ) {

    contatos.push(
      cliente.telefone
    );

  }


  if (
    cliente.email
  ) {

    contatos.push(
      cliente.email
    );

  }


  if (
    contatos.length
  ) {

    const contato =
      document.createElement(
        "span"
      );


    contato.textContent =
      contatos.join(
        " · "
      );


    container.appendChild(
      contato
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


  // ==========================================================
  // CORTINAS
  // ==========================================================

  if (
    totalCortinas
  ) {

    totalCortinas.textContent =
      brl(
        totais.cortinas
      );

  }


  // ==========================================================
  // TRILHOS
  // ==========================================================

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


  // ==========================================================
  // FRETE
  // ==========================================================

  if (
    freteElemento
  ) {

    freteElemento.textContent =
      frete.texto;

  }


  if (
    avisoFrete
  ) {

    avisoFrete.textContent =
      frete.aviso;


    avisoFrete.style.display =
      frete.aviso
        ? "block"
        : "none";

  }


  // ==========================================================
  // TOTAL
  //
  // Se o frete estiver pendente de cálculo,
  // mostramos somente o total dos produtos.
  // ==========================================================

  let totalFinal =
    totais.produtos;


  if (
    typeof frete.valor ===
    "number"
  ) {

    totalFinal +=
      frete.valor;

  }


  if (
    totalElemento
  ) {

    totalElemento.textContent =
      brl(
        totalFinal
      );

  }


  // ==========================================================
  // PARCELAMENTO
  // ==========================================================

  if (
    parcelamento
  ) {

    if (
      totalFinal > 0
    ) {

      parcelamento.textContent =
        "ou " +
        PAGAMENTO_CONFIG
          .parcelas +
        "x de " +
        brl(
          totalFinal /
          PAGAMENTO_CONFIG
            .parcelas
        ) +
        " sem juros";

    } else {

      parcelamento.textContent =
        "";

    }

  }


  // ==========================================================
  // DISPONIBILIZA GLOBALMENTE
  // ==========================================================

  window.pagamentoTotais = {

    ...totais,

    frete:
      frete.valor,

    total:
      totalFinal

  };


  window.pagamentoFrete =
    frete;

}


// ============================================================
// MARCAR OPÇÃO VISUALMENTE
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
            radio &&
            radio.checked
          )
        );

      }
    );

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


  atualizarOpcaoSelecionada();


  // ==========================================================
  // NADA SELECIONADO
  // ==========================================================

  if (
    !formaPagamentoSelecionada
  ) {

    if (
      info
    ) {

      info.textContent =
        "Selecione a forma de pagamento para continuar.";

    }


    if (
      botao
    ) {

      botao.disabled =
        true;


      botao.textContent =
        "Selecione a forma de pagamento";

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

    if (
      info
    ) {

      info.innerHTML =
        `
          <strong>
            Cartão de crédito
          </strong>

          <br>

          Pagamento em até
          ${PAGAMENTO_CONFIG.parcelas}x
          sem juros.
        `;

    }


    if (
      botao
    ) {

      botao.disabled =
        false;


      botao.textContent =
        "Continuar com cartão";

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

    if (
      info
    ) {

      info.innerHTML =
        `
          <strong>
            PIX
          </strong>

          <br>

          Pagamento à vista com
          confirmação após o pagamento.
        `;

    }


    if (
      botao
    ) {

      botao.disabled =
        false;


      botao.textContent =
        "Continuar com PIX";

    }

  }

}


// ============================================================
// RECUPERAR FORMA DE PAGAMENTO JÁ SALVA
// ============================================================

function recuperarFormaPagamento(
  pedido
) {

  const forma =
    pedido?.pagamento?.forma;


  if (
    forma !== "cartao" &&
    forma !== "pix"
  ) {

    return;

  }


  formaPagamentoSelecionada =
    forma;


  const radio =
    document.querySelector(
      `input[name="forma-pagamento"][value="${forma}"]`
    );


  if (
    radio
  ) {

    radio.checked =
      true;

  }

}


// ============================================================
// SALVAR FORMA DE PAGAMENTO
// ============================================================

function salvarFormaPagamento() {

  if (
    !pedidoAtual ||
    !formaPagamentoSelecionada
  ) {

    return false;

  }


  const pedidoAtualizado = {

    ...pedidoAtual,

    pagamento: {

      ...(pedidoAtual.pagamento || {}),

      forma:
        formaPagamentoSelecionada,

      status:
        "aguardando_pagamento",

      atualizadoEm:
        new Date()
          .toISOString()

    },

    etapa:
      "pagamento",

    atualizadoEm:
      new Date()
        .toISOString()

  };


  return salvarPedido(
    pedidoAtualizado
  );

}


// ============================================================
// FINALIZAR PAGAMENTO
//
// Neste momento ainda não existe gateway conectado.
//
// Não coletamos número de cartão.
// Não geramos PIX falso.
//
// A função apenas salva a escolha.
// Depois a integração real usará este ponto.
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


    if (
      primeiraOpcao
    ) {

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


  if (
    !pedidoAtual.cliente ||
    !pedidoAtual.cliente.nome
  ) {

    alert(
      "Os dados de entrega não foram encontrados."
    );


    window.location.href =
      "checkout.html";


    return;

  }


  const salvo =
    salvarFormaPagamento();


  if (
    !salvo
  ) {

    alert(
      "Não foi possível salvar a forma de pagamento."
    );


    return;

  }


  // ==========================================================
  // CARTÃO
  // ==========================================================

  if (
    formaPagamentoSelecionada ===
    "cartao"
  ) {

    alert(
      "Forma de pagamento salva. O próximo passo será conectar o pagamento seguro por cartão."
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
      "Forma de pagamento salva. O próximo passo será conectar a geração do PIX."
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


  if (
    !pagina
  ) {

    return;

  }


  pagina.innerHTML =
    `

      <div class="pagamento-vazio">

        <h1>
          Pedido não encontrado
        </h1>

        <p>
          Volte ao configurador e adicione
          uma cortina ao carrinho.
        </p>

        <a href="index.html">
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


  // ==========================================================
  // O PAGAMENTO DEVE VIR DO CHECKOUT
  // ==========================================================

  if (
    !pedido.cliente ||
    !pedido.cliente.nome
  ) {

    window.location.href =
      "checkout.html";


    return;

  }


  pedidoAtual =
    pedido;


  // ==========================================================
  // EVENTOS
  // ==========================================================

  configurarFormasPagamento();


  // ==========================================================
  // RECUPERA ESCOLHA ANTERIOR
  // ==========================================================

  recuperarFormaPagamento(
    pedido
  );


  // ==========================================================
  // CLIENTE
  // ==========================================================

  renderizarCliente(
    pedido
  );


  // ==========================================================
  // ITENS
  // ==========================================================

  renderizarItens(
    pedido.itens
  );


  // ==========================================================
  // VALORES
  // ==========================================================

  atualizarResumo(
    pedido
  );


  // ==========================================================
  // PAGAMENTO
  // ==========================================================

  atualizarInformacaoPagamento();

}


// ============================================================
// INICIAR
// ============================================================

iniciarPagamento();
