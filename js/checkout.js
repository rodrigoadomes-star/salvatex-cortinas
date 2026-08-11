// ============================================================
// CHECKOUT - SALVATEX CORTINAS
// ============================================================

const CHAVE_CARRINHO = "salvatexCarrinho";
const CHAVE_PEDIDO = "salvatex_pedido_atual";


// ============================================================
// CONFIGURAÇÕES DO CHECKOUT
// ============================================================

const CHECKOUT_CONFIG = {

  // Frete grátis quando o valor das CORTINAS
  // atingir R$ 500,00.
  //
  // Trilho sozinho nunca ganha frete grátis.
  // Trilho comprado junto com cortinas elegíveis
  // acompanha o frete grátis.

  freteGratisMinimo: 500,


  // Prazo de fabricação

  producao:
    "5 a 7 dias",


  // Prazo de transporte depois do envio

  entrega:
    "6 a 12 dias úteis após o envio",


  parcelas:
    Number(
      CONFIG?.parcelas ||
      10
    )

};


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
// LER PEDIDO
// ============================================================

function obterPedido() {

  try {

    // ========================================================
    // PRIMEIRO TENTA O PEDIDO ATUAL
    // ========================================================

    const pedidoSalvo =
      localStorage.getItem(
        CHAVE_PEDIDO
      );


    if (pedidoSalvo) {

      const pedido =
        JSON.parse(
          pedidoSalvo
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

    }


    // ========================================================
    // FALLBACK PARA O CARRINHO
    // ========================================================

    const carrinhoSalvo =
      localStorage.getItem(
        CHAVE_CARRINHO
      );


    if (carrinhoSalvo) {

      const carrinho =
        JSON.parse(
          carrinhoSalvo
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

    }


    return null;


  } catch (erro) {

    console.error(
      "Erro ao carregar pedido:",
      erro
    );


    return null;

  }

}


// ============================================================
// VERIFICA TIPO DE ITEM
// ============================================================

function itemEhCortina(item) {

  return (
    item &&
    item.tipo ===
      "cortina"
  );

}


function itemEhTrilho(item) {

  return (
    item &&
    item.tipo ===
      "trilho"
  );

}


// ============================================================
// CALCULAR TOTAIS
//
// O carrinho atual possui:
//
// item.tipo = "cortina"
// item.tipo = "trilho"
//
// Cada produto possui seu próprio "total".
// ============================================================

function calcularTotais(
  itens
) {

  let cortinas = 0;

  let trilhos = 0;

  let total = 0;


  itens.forEach(
    (item) => {

      const valor =
        Number(
          item.total || 0
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
// VERIFICAR SE EXISTE TRILHO / VARÃO
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
// REGRA DO FRETE
//
// REGRA:
//
// CORTINAS >= R$ 500
// = FRETE GRÁTIS
//
// Se houver trilho / varão junto,
// ele acompanha o frete grátis.
//
// TRILHO / VARÃO SOZINHO
// = FRETE A CALCULAR.
//
// CORTINAS ABAIXO DE R$ 500
// = FRETE A CALCULAR.
//
// O valor é calculado posteriormente pela Salvatex
// através do Melhor Envio.
// ============================================================

function calcularFrete(
  itens
) {

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


  // ========================================================
  // FRETE GRÁTIS
  // ========================================================

  if (
    temCortina &&
    totais.cortinas >=
      CHECKOUT_CONFIG
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


  // ========================================================
  // SOMENTE TRILHO
  // ========================================================

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
        "O frete do trilho/varão será calculado pela Salvatex conforme o CEP de entrega."

    };

  }


  // ========================================================
  // CORTINA ABAIXO DO VALOR MÍNIMO
  // ========================================================

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
      "O valor do frete será calculado pela Salvatex conforme o CEP de entrega."

  };

}


// ============================================================
// CRIAR ITEM DO RESUMO
// ============================================================

function criarItemResumo(
  item,
  indice
) {

  const bloco =
    document.createElement(
      "div"
    );


  bloco.className =
    "checkout-item";


  // ========================================================
  // TOPO
  // ========================================================

  const topo =
    document.createElement(
      "div"
    );


  topo.className =
    "checkout-item-topo";


  const nome =
    document.createElement(
      "strong"
    );


  // ========================================================
  // NOME DO PRODUTO
  // ========================================================

  if (
    itemEhCortina(
      item
    )
  ) {

    nome.textContent =
      "Cortina sob medida";

  } else if (
    itemEhTrilho(
      item
    )
  ) {

    nome.textContent =
      item.produto ||
      "Trilho / Varão";

  } else {

    nome.textContent =
      item.produto ||
      "Produto";

  }


  const valor =
    document.createElement(
      "strong"
    );


  valor.textContent =
    brl(
      item.total
    );


  topo.appendChild(
    nome
  );


  topo.appendChild(
    valor
  );


  bloco.appendChild(
    topo
  );


  // ========================================================
  // CORTINA
  // ========================================================

  if (
    itemEhCortina(
      item
    )
  ) {

    const produto =
      document.createElement(
        "div"
      );


    produto.className =
      "checkout-item-produto";


    produto.textContent =
      (
        item.tecido ||
        "Cortina"
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


    // ======================================================
    // MODELO
    // ======================================================

    if (
      item.modelo
    ) {

      const modelo =
        document.createElement(
          "div"
        );


      modelo.className =
        "checkout-item-detalhe";


      modelo.textContent =
        "Modelo: " +
        item.modelo;


      bloco.appendChild(
        modelo
      );

    }


    // ======================================================
    // FORRO
    // ======================================================

    if (
      item.forro
    ) {

      const forro =
        document.createElement(
          "div"
        );


      forro.className =
        "checkout-item-detalhe";


      forro.textContent =
        "Forro: " +
        item.forro;


      bloco.appendChild(
        forro
      );

    }


    // ======================================================
    // MEDIDAS
    // ======================================================

    const largura =
      Number(
        item.larguraAmbiente ||
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

      const medidas =
        document.createElement(
          "div"
        );


      medidas.className =
        "checkout-item-detalhe";


      medidas.textContent =
        "Ambiente: " +
        largura
          .toFixed(2)
          .replace(
            ".",
            ","
          ) +
        " × " +
        altura
          .toFixed(2)
          .replace(
            ".",
            ","
          ) +
        " m";


      bloco.appendChild(
        medidas
      );

    }


    // ======================================================
    // FRANZIMENTO
    // ======================================================

    if (
      item.franzimento
    ) {

      const franzimento =
        document.createElement(
          "div"
        );


      franzimento.className =
        "checkout-item-detalhe";


      franzimento.textContent =
        "Franzimento: " +
        String(
          item.franzimento
        ).replace(
          ".",
          ","
        ) +
        "x";


      bloco.appendChild(
        franzimento
      );

    }


    // ======================================================
    // BARRA
    // ======================================================

    if (
      item.barra
    ) {

      const barra =
        document.createElement(
          "div"
        );


      barra.className =
        "checkout-item-detalhe";


      barra.textContent =
        "Barra: " +
        item.barra +
        " cm";


      bloco.appendChild(
        barra
      );

    }

  }


  // ========================================================
  // TRILHO / VARÃO
  // ========================================================

  if (
    itemEhTrilho(
      item
    )
  ) {

    const produto =
      document.createElement(
        "div"
      );


    produto.className =
      "checkout-item-produto";


    produto.textContent =
      item.produto ||
      "Trilho / Varão";


    bloco.appendChild(
      produto
    );


    const largura =
      Number(
        item.largura ||
        0
      );


    if (
      largura > 0
    ) {

      const medida =
        document.createElement(
          "div"
        );


      medida.className =
        "checkout-item-detalhe";


      medida.textContent =
        "Medida: " +
        largura
          .toFixed(2)
          .replace(
            ".",
            ","
          ) +
        " m";


      bloco.appendChild(
        medida
      );

    }

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
      "checkout-itens"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  itens.forEach(
    (
      item,
      indice
    ) => {

      container.appendChild(
        criarItemResumo(
          item,
          indice
        )
      );

    }
  );

}


// ============================================================
// ATUALIZAR RESUMO
// ============================================================

function atualizarResumo(
  itens
) {

  const totais =
    calcularTotais(
      itens
    );


  const frete =
    calcularFrete(
      itens
    );


  const cortinas =
    document.getElementById(
      "checkout-total-cortinas"
    );


  const trilhos =
    document.getElementById(
      "checkout-total-trilhos"
    );


  const linhaTrilhos =
    document.getElementById(
      "checkout-linha-trilhos"
    );


  const freteElemento =
    document.getElementById(
      "checkout-frete"
    );


  const avisoFrete =
    document.getElementById(
      "checkout-frete-aviso"
    );


  const totalElemento =
    document.getElementById(
      "checkout-total"
    );


  const parcelamento =
    document.getElementById(
      "checkout-parcelamento"
    );


  // ========================================================
  // CORTINAS
  // ========================================================

  if (
    cortinas
  ) {

    cortinas.textContent =
      brl(
        totais.cortinas
      );

  }


  // ========================================================
  // TRILHOS
  // ========================================================

  if (
    trilhos
  ) {

    trilhos.textContent =
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


  // ========================================================
  // FRETE
  // ========================================================

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

  }


  // ========================================================
  // TOTAL
  //
  // Quando o frete não for grátis,
  // o total neste momento representa apenas os produtos.
  // ========================================================

  if (
    totalElemento
  ) {

    totalElemento.textContent =
      brl(
        totais.total
      );

  }


  // ========================================================
  // PARCELAMENTO
  // ========================================================

  if (
    parcelamento
  ) {

    if (
      totais.total > 0
    ) {

      parcelamento.textContent =
        "ou " +
        CHECKOUT_CONFIG
          .parcelas +
        "x de " +
        brl(
          totais.total /
          CHECKOUT_CONFIG
            .parcelas
        ) +
        " sem juros";

    } else {

      parcelamento.textContent =
        "";

    }

  }


  window.checkoutFrete =
    frete;


  window.checkoutTotais =
    totais;

}


// ============================================================
// MÁSCARA CEP
// ============================================================

function formatarCEP(
  valor
) {

  let numeros =
    String(
      valor || ""
    ).replace(
      /\D/g,
      ""
    );


  numeros =
    numeros.slice(
      0,
      8
    );


  if (
    numeros.length > 5
  ) {

    return (
      numeros.slice(
        0,
        5
      ) +
      "-" +
      numeros.slice(5)
    );

  }


  return numeros;

}


// ============================================================
// MÁSCARA CPF
// ============================================================

function formatarCPF(
  valor
) {

  let numeros =
    String(
      valor || ""
    ).replace(
      /\D/g,
      ""
    );


  numeros =
    numeros.slice(
      0,
      11
    );


  if (
    numeros.length <= 3
  ) {

    return numeros;

  }


  if (
    numeros.length <= 6
  ) {

    return (
      numeros.slice(
        0,
        3
      ) +
      "." +
      numeros.slice(3)
    );

  }


  if (
    numeros.length <= 9
  ) {

    return (
      numeros.slice(
        0,
        3
      ) +
      "." +
      numeros.slice(
        3,
        6
      ) +
      "." +
      numeros.slice(6)
    );

  }


  return (
    numeros.slice(
      0,
      3
    ) +
    "." +
    numeros.slice(
      3,
      6
    ) +
    "." +
    numeros.slice(
      6,
      9
    ) +
    "-" +
    numeros.slice(9)
  );

}


// ============================================================
// MÁSCARA TELEFONE
// ============================================================

function formatarTelefone(
  valor
) {

  let numeros =
    String(
      valor || ""
    ).replace(
      /\D/g,
      ""
    );


  numeros =
    numeros.slice(
      0,
      11
    );


  if (
    numeros.length <= 2
  ) {

    return numeros;

  }


  if (
    numeros.length <= 6
  ) {

    return (
      "(" +
      numeros.slice(
        0,
        2
      ) +
      ") " +
      numeros.slice(2)
    );

  }


  if (
    numeros.length <= 10
  ) {

    return (
      "(" +
      numeros.slice(
        0,
        2
      ) +
      ") " +
      numeros.slice(
        2,
        6
      ) +
      "-" +
      numeros.slice(6)
    );

  }


  return (
    "(" +
    numeros.slice(
      0,
      2
    ) +
    ") " +
    numeros.slice(
      2,
      7
    ) +
    "-" +
    numeros.slice(7)
  );

}


// ============================================================
// CONFIGURAR MÁSCARAS
// ============================================================

function configurarMascaras() {

  const cep =
    document.getElementById(
      "checkout-cep"
    );


  const cpf =
    document.getElementById(
      "checkout-cpf"
    );


  const telefone =
    document.getElementById(
      "checkout-telefone"
    );


  if (
    cep
  ) {

    cep.addEventListener(
      "input",
      () => {

        cep.value =
          formatarCEP(
            cep.value
          );

      }
    );

  }


  if (
    cpf
  ) {

    cpf.addEventListener(
      "input",
      () => {

        cpf.value =
          formatarCPF(
            cpf.value
          );

      }
    );

  }


  if (
    telefone
  ) {

    telefone.addEventListener(
      "input",
      () => {

        telefone.value =
          formatarTelefone(
            telefone.value
          );

      }
    );

  }

}


// ============================================================
// PEGAR VALOR DO CAMPO
// ============================================================

function valorCampo(
  id
) {

  const campo =
    document.getElementById(
      id
    );


  return campo
    ? campo.value.trim()
    : "";

}


// ============================================================
// COLETAR DADOS DO CLIENTE
// ============================================================

function obterDadosCliente() {

  return {

    nome:
      valorCampo(
        "checkout-nome"
      ),

    cpf:
      valorCampo(
        "checkout-cpf"
      ),

    telefone:
      valorCampo(
        "checkout-telefone"
      ),

    email:
      valorCampo(
        "checkout-email"
      ),

    cep:
      valorCampo(
        "checkout-cep"
      ),

    endereco:
      valorCampo(
        "checkout-endereco"
      ),

    numero:
      valorCampo(
        "checkout-numero"
      ),

    complemento:
      valorCampo(
        "checkout-complemento"
      ),

    bairro:
      valorCampo(
        "checkout-bairro"
      ),

    cidade:
      valorCampo(
        "checkout-cidade"
      ),

    estado:
      valorCampo(
        "checkout-estado"
      ),

    observacoes:
      valorCampo(
        "checkout-observacoes"
      )

  };

}


// ============================================================
// PREENCHER DADOS JÁ SALVOS
//
// Se o cliente voltar do pagamento para o checkout,
// não perde tudo o que digitou.
// ============================================================

function preencherDadosCliente(
  cliente
) {

  if (
    !cliente
  ) {

    return;

  }


  const campos = {

    "checkout-nome":
      cliente.nome,

    "checkout-cpf":
      cliente.cpf,

    "checkout-telefone":
      cliente.telefone,

    "checkout-email":
      cliente.email,

    "checkout-cep":
      cliente.cep,

    "checkout-endereco":
      cliente.endereco,

    "checkout-numero":
      cliente.numero,

    "checkout-complemento":
      cliente.complemento,

    "checkout-bairro":
      cliente.bairro,

    "checkout-cidade":
      cliente.cidade,

    "checkout-estado":
      cliente.estado,

    "checkout-observacoes":
      cliente.observacoes

  };


  Object.entries(
    campos
  ).forEach(
    (
      [
        id,
        valor
      ]
    ) => {

      const campo =
        document.getElementById(
          id
        );


      if (
        campo &&
        valor
      ) {

        campo.value =
          valor;

      }

    }
  );

}


// ============================================================
// MARCAR CAMPO COM ERRO
// ============================================================

function marcarErro(
  id,
  possuiErro
) {

  const campo =
    document.getElementById(
      id
    );


  if (!campo) {
    return;
  }


  campo.classList.toggle(
    "checkout-campo-erro",
    possuiErro
  );

}


// ============================================================
// LIMPAR ERRO QUANDO CLIENTE DIGITAR
// ============================================================

function configurarLimpezaErros() {

  document
    .querySelectorAll(
      ".checkout-field input, .checkout-field select, .checkout-field textarea"
    )
    .forEach(
      (campo) => {

        campo.addEventListener(
          "input",
          () => {

            campo.classList.remove(
              "checkout-campo-erro"
            );

          }
        );

      }
    );

}


// ============================================================
// VALIDAR FORMULÁRIO
// ============================================================

function validarFormulario() {

  const dados =
    obterDadosCliente();


  const obrigatorios = [

    [
      "checkout-nome",
      dados.nome
    ],

    [
      "checkout-cpf",
      dados.cpf
    ],

    [
      "checkout-telefone",
      dados.telefone
    ],

    [
      "checkout-email",
      dados.email
    ],

    [
      "checkout-cep",
      dados.cep
    ],

    [
      "checkout-endereco",
      dados.endereco
    ],

    [
      "checkout-numero",
      dados.numero
    ],

    [
      "checkout-bairro",
      dados.bairro
    ],

    [
      "checkout-cidade",
      dados.cidade
    ],

    [
      "checkout-estado",
      dados.estado
    ]

  ];


  let primeiroErro =
    null;


  obrigatorios.forEach(
    (
      [
        id,
        valor
      ]
    ) => {

      const erro =
        !valor;


      marcarErro(
        id,
        erro
      );


      if (
        erro &&
        !primeiroErro
      ) {

        primeiroErro =
          document.getElementById(
            id
          );

      }

    }
  );


  // ========================================================
  // CEP
  // ========================================================

  const cepNumeros =
    dados.cep.replace(
      /\D/g,
      ""
    );


  if (
    dados.cep &&
    cepNumeros.length !== 8
  ) {

    marcarErro(
      "checkout-cep",
      true
    );


    if (
      !primeiroErro
    ) {

      primeiroErro =
        document.getElementById(
          "checkout-cep"
        );

    }

  }


  // ========================================================
  // CPF
  // ========================================================

  const cpfNumeros =
    dados.cpf.replace(
      /\D/g,
      ""
    );


  if (
    dados.cpf &&
    cpfNumeros.length !== 11
  ) {

    marcarErro(
      "checkout-cpf",
      true
    );


    if (
      !primeiroErro
    ) {

      primeiroErro =
        document.getElementById(
          "checkout-cpf"
        );

    }

  }


  // ========================================================
  // TELEFONE
  // ========================================================

  const telefoneNumeros =
    dados.telefone.replace(
      /\D/g,
      ""
    );


  if (
    dados.telefone &&
    telefoneNumeros.length < 10
  ) {

    marcarErro(
      "checkout-telefone",
      true
    );


    if (
      !primeiroErro
    ) {

      primeiroErro =
        document.getElementById(
          "checkout-telefone"
        );

    }

  }


  // ========================================================
  // EMAIL
  // ========================================================

  if (
    dados.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      dados.email
    )
  ) {

    marcarErro(
      "checkout-email",
      true
    );


    if (
      !primeiroErro
    ) {

      primeiroErro =
        document.getElementById(
          "checkout-email"
        );

    }

  }


  // ========================================================
  // ESTADO
  // ========================================================

  if (
    dados.estado &&
    dados.estado.length !== 2
  ) {

    marcarErro(
      "checkout-estado",
      true
    );


    if (
      !primeiroErro
    ) {

      primeiroErro =
        document.getElementById(
          "checkout-estado"
        );

    }

  }


  // ========================================================
  // EXISTE ERRO
  // ========================================================

  if (
    primeiroErro
  ) {

    primeiroErro.scrollIntoView({
      behavior:
        "smooth",

      block:
        "center"
    });


    primeiroErro.focus();


    return false;

  }


  return true;

}


// ============================================================
// SALVAR DADOS DO CHECKOUT
// ============================================================

function salvarCheckout() {

  const pedido =
    obterPedido();


  if (
    !pedido ||
    !Array.isArray(
      pedido.itens
    ) ||
    !pedido.itens.length
  ) {

    return false;

  }


  const cliente =
    obterDadosCliente();


  const frete =
    calcularFrete(
      pedido.itens
    );


  const totais =
    calcularTotais(
      pedido.itens
    );


  // ========================================================
  // TOTAL FINAL
  //
  // Como frete pago será calculado posteriormente,
  // inicialmente o total final permanece igual ao
  // valor dos produtos.
  // ========================================================

  const totalFinal =
    totais.total +
    (
      typeof frete.valor ===
        "number"
        ? frete.valor
        : 0
    );


  const pedidoAtualizado = {

    ...pedido,


    // ======================================================
    // CLIENTE
    // ======================================================

    cliente,


    // ======================================================
    // FRETE
    // ======================================================

    frete: {

      gratis:
        frete.gratis,

      valor:
        frete.valor,

      status:
        frete.status,

      texto:
        frete.texto,

      aviso:
        frete.aviso

    },


    // ======================================================
    // PRAZOS
    // ======================================================

    prazos: {

      producao:
        CHECKOUT_CONFIG
          .producao,

      entrega:
        CHECKOUT_CONFIG
          .entrega

    },


    // ======================================================
    // TOTAIS
    // ======================================================

    totais: {

      cortinas:
        totais.cortinas,

      trilhos:
        totais.trilhos,

      produtos:
        totais.total,

      frete:
        typeof frete.valor ===
          "number"
          ? frete.valor
          : null,

      total:
        totalFinal

    },


    etapa:
      "pagamento",


    atualizadoEm:
      new Date()
        .toISOString()

  };


  try {

    localStorage.setItem(
      CHAVE_PEDIDO,
      JSON.stringify(
        pedidoAtualizado
      )
    );


    return true;


  } catch (erro) {

    console.error(
      "Erro ao salvar checkout:",
      erro
    );


    return false;

  }

}


// ============================================================
// CONTINUAR PARA PAGAMENTO
// ============================================================

function continuarPagamento() {

  const pedido =
    obterPedido();


  if (
    !pedido ||
    !pedido.itens ||
    !pedido.itens.length
  ) {

    alert(
      "Seu carrinho está vazio."
    );


    window.location.href =
      "index.html";


    return;

  }


  // ========================================================
  // VALIDA FORMULÁRIO
  // ========================================================

  if (
    !validarFormulario()
  ) {

    alert(
      "Confira os campos destacados antes de continuar."
    );


    return;

  }


  // ========================================================
  // SALVA
  // ========================================================

  const salvo =
    salvarCheckout();


  if (
    !salvo
  ) {

    alert(
      "Não foi possível salvar os dados do pedido."
    );


    return;

  }


  // ========================================================
  // PAGAMENTO
  // ========================================================

  window.location.href =
    "pagamento.html";

}


// ============================================================
// PEDIDO VAZIO
// ============================================================

function mostrarPedidoVazio() {

  const pagina =
    document.querySelector(
      ".pagina-checkout"
    );


  if (
    !pagina
  ) {
    return;
  }


  pagina.innerHTML = `

    <div class="checkout-vazio">

      <h1>
        Seu carrinho está vazio
      </h1>

      <p>
        Configure sua cortina
        antes de continuar
        para o checkout.
      </p>

      <a href="index.html">
        Configurar minha cortina
      </a>

    </div>

  `;

}


// ============================================================
// BOTÃO CONTINUAR
// ============================================================

const botaoContinuar =
  document.getElementById(
    "checkout-continuar"
  );


if (
  botaoContinuar
) {

  botaoContinuar.addEventListener(
    "click",
    continuarPagamento
  );

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

function iniciarCheckout() {

  const pedido =
    obterPedido();


  if (
    !pedido ||
    !pedido.itens ||
    !pedido.itens.length
  ) {

    mostrarPedidoVazio();

    return;

  }


  // ========================================================
  // MÁSCARAS
  // ========================================================

  configurarMascaras();


  configurarLimpezaErros();


  // ========================================================
  // RECUPERA DADOS CASO CLIENTE VOLTE
  // ========================================================

  if (
    pedido.cliente
  ) {

    preencherDadosCliente(
      pedido.cliente
    );

  }


  // ========================================================
  // PRODUTOS
  // ========================================================

  renderizarItens(
    pedido.itens
  );


  // ========================================================
  // RESUMO
  // ========================================================

  atualizarResumo(
    pedido.itens
  );

}


// ============================================================
// INICIAR
// ============================================================

iniciarCheckout();
