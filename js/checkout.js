// ============================================================
// CHECKOUT - SALVATEX CORTINAS
// ============================================================

const CHAVE_CARRINHO = "salvatexCarrinho";
const CHAVE_PEDIDO = "salvatex_pedido_atual";


// ============================================================
// CONFIGURAÇÕES DO CHECKOUT
// ============================================================

const CHECKOUT_CONFIG = {

  freteGratisMinimo: 500,

  producao: "5 a 7 dias",

  entrega: "6 a 12 dias úteis após o envio",

  parcelas:
    Number(CONFIG?.parcelas || 10)

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
        )
      ) {

        return pedido;

      }

    }


    // ========================================================
    // FALLBACK
    //
    // Se por algum motivo não houver pedido salvo,
    // tenta utilizar diretamente o carrinho.
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
// CALCULAR TOTAIS
// ============================================================

function calcularTotais(
  itens
) {

  let cortinas = 0;

  let trilhos = 0;

  let total = 0;


  itens.forEach(
    (item) => {

      cortinas +=
        Number(
          item.valorCortina || 0
        );


      trilhos +=
        Number(
          item.valorTrilho || 0
        );


      total +=
        Number(
          item.total || 0
        );

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
      Number(
        item.valorCortina || 0
      ) > 0
  );

}


// ============================================================
// VERIFICAR SE EXISTE TRILHO / VARÃO
// ============================================================

function pedidoTemTrilho(
  itens
) {

  return itens.some(
    (item) => {

      return (
        item.trilho &&
        item.trilho !== "Não" &&
        Number(
          item.valorTrilho || 0
        ) > 0
      );

    }
  );

}


// ============================================================
// REGRA DO FRETE
//
// REGRA:
//
// R$ 500 OU MAIS EM CORTINAS
// = FRETE GRÁTIS
//
// Se houver trilho/varão junto com essas cortinas,
// o trilho também acompanha o frete grátis.
//
// Trilho/varão sozinho NÃO recebe frete grátis.
//
// Quando não for grátis, o frete será calculado
// manualmente pela Salvatex através do Melhor Envio.
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
      CHECKOUT_CONFIG.freteGratisMinimo
  ) {

    return {

      gratis: true,

      valor: 0,

      status:
        "gratis",

      texto:
        "Frete grátis",

      aviso:
        temTrilho
          ? "Frete grátis para as cortinas e trilhos/varões deste pedido."
          : "Seu pedido possui frete grátis."

    };

  }


  // ========================================================
  // FRETE A CALCULAR
  // ========================================================

  return {

    gratis: false,

    valor: null,

    status:
      "aguardando_calculo",

    texto:
      "Calculado após o pedido",

    aviso:
      temTrilho && !temCortina
        ? "O frete do trilho/varão será calculado conforme o CEP de entrega."
        : "O valor do frete será calculado conforme o CEP de entrega."

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


  nome.textContent =
    "Cortina " +
    (indice + 1);


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
  // PRODUTO
  // ========================================================

  const produto =
    document.createElement(
      "div"
    );


  produto.className =
    "checkout-item-produto";


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


  // ========================================================
  // MODELO
  // ========================================================

  if (item.modelo) {

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


  // ========================================================
  // FORRO
  // ========================================================

  if (item.forro) {

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


  // ========================================================
  // MEDIDAS
  // ========================================================

  const largura =
    Number(
      item.largura || 0
    );


  const altura =
    Number(
      item.altura || 0
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
        .replace(".", ",") +
      " × " +
      altura
        .toFixed(2)
        .replace(".", ",") +
      " m";


    bloco.appendChild(
      medidas
    );

  }


  // ========================================================
  // TRILHO / VARÃO
  // ========================================================

  if (
    item.trilho &&
    item.trilho !== "Não"
  ) {

    const trilho =
      document.createElement(
        "div"
      );


    trilho.className =
      "checkout-item-detalhe";


    trilho.textContent =
      item.trilho;


    if (
      Number(
        item.valorTrilho || 0
      ) > 0
    ) {

      trilho.textContent +=
        " · " +
        brl(
          item.valorTrilho
        );

    }


    bloco.appendChild(
      trilho
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
      "checkout-itens"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  itens.forEach(
    (item, indice) => {

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

  if (cortinas) {

    cortinas.textContent =
      brl(
        totais.cortinas
      );

  }


  // ========================================================
  // TRILHOS
  // ========================================================

  if (trilhos) {

    trilhos.textContent =
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


  // ========================================================
  // FRETE
  // ========================================================

  if (freteElemento) {

    freteElemento.textContent =
      frete.texto;

  }


  if (avisoFrete) {

    avisoFrete.textContent =
      frete.aviso;

  }


  // ========================================================
  // TOTAL
  //
  // Como o frete pago será calculado posteriormente,
  // aqui mostramos o total dos produtos.
  // ========================================================

  if (totalElemento) {

    totalElemento.textContent =
      brl(
        totais.total
      );

  }


  // ========================================================
  // PARCELAMENTO
  // ========================================================

  if (parcelamento) {

    if (
      totais.total > 0
    ) {

      parcelamento.textContent =
        "ou " +
        CHECKOUT_CONFIG.parcelas +
        "x de " +
        brl(
          totais.total /
          CHECKOUT_CONFIG.parcelas
        ) +
        " sem juros";

    } else {

      parcelamento.textContent =
        "";

    }

  }


  // ========================================================
  // SALVAR INFORMAÇÕES DO FRETE
  // ========================================================

  window.checkoutFrete =
    frete;


  window.checkoutTotais =
    totais;

}


// ============================================================
// MÁSCARA DO CEP
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
      numeros.slice(0, 3) +
      "." +
      numeros.slice(3)
    );

  }


  if (
    numeros.length <= 9
  ) {

    return (
      numeros.slice(0, 3) +
      "." +
      numeros.slice(3, 6) +
      "." +
      numeros.slice(6)
    );

  }


  return (
    numeros.slice(0, 3) +
    "." +
    numeros.slice(3, 6) +
    "." +
    numeros.slice(6, 9) +
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
      numeros.slice(0, 2) +
      ") " +
      numeros.slice(2)
    );

  }


  if (
    numeros.length <= 10
  ) {

    return (
      "(" +
      numeros.slice(0, 2) +
      ") " +
      numeros.slice(2, 6) +
      "-" +
      numeros.slice(6)
    );

  }


  return (
    "(" +
    numeros.slice(0, 2) +
    ") " +
    numeros.slice(2, 7) +
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


  if (cep) {

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


  if (cpf) {

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


  if (telefone) {

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
// PEGAR VALOR DE CAMPO
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
    ([id, valor]) => {

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


    if (!primeiroErro) {

      primeiroErro =
        document.getElementById(
          "checkout-cep"
        );

    }

  }


  // ========================================================
  // CPF
  //
  // Aqui verificamos apenas quantidade de números.
  // A validação matemática pode ser adicionada depois.
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


    if (!primeiroErro) {

      primeiroErro =
        document.getElementById(
          "checkout-cpf"
        );

    }

  }


  // ========================================================
  // E-MAIL
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


    if (!primeiroErro) {

      primeiroErro =
        document.getElementById(
          "checkout-email"
        );

    }

  }


  if (primeiroErro) {

    primeiroErro.scrollIntoView({
      behavior: "smooth",
      block: "center"
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


  const pedidoAtualizado = {

    ...pedido,

    cliente,

    frete: {

      gratis:
        frete.gratis,

      valor:
        frete.valor,

      status:
        frete.status,

      texto:
        frete.texto

    },

    prazos: {

      producao:
        CHECKOUT_CONFIG.producao,

      entrega:
        CHECKOUT_CONFIG.entrega

    },

    totais: {

      cortinas:
        totais.cortinas,

      trilhos:
        totais.trilhos,

      produtos:
        totais.total

    },

    atualizadoEm:
      new Date()
        .toISOString()

  };


  localStorage.setItem(
    CHAVE_PEDIDO,
    JSON.stringify(
      pedidoAtualizado
    )
  );


  return true;

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


  if (
    !validarFormulario()
  ) {

    alert(
      "Preencha os campos obrigatórios para continuar."
    );


    return;

  }


  const salvo =
    salvarCheckout();


  if (!salvo) {

    alert(
      "Não foi possível salvar o pedido."
    );


    return;

  }


  // ========================================================
  // PRÓXIMA ETAPA
  //
  // Vamos criar pagamento.html na próxima etapa.
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


  if (!pagina) {
    return;
  }


  pagina.innerHTML = `

    <div class="checkout-vazio">

      <h1>
        Seu carrinho está vazio
      </h1>

      <p>
        Configure sua cortina antes
        de continuar para o checkout.
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


if (botaoContinuar) {

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


  configurarMascaras();


  renderizarItens(
    pedido.itens
  );


  atualizarResumo(
    pedido.itens
  );

}


// ============================================================
// INICIAR
// ============================================================

iniciarCheckout();
