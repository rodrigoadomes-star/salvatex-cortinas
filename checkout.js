// ============================================================
// CHECKOUT - SALVATEX
// ESTRUTURA GENÉRICA
// ============================================================

const CHAVE_PEDIDO =
  "salvatex_pedido_atual";


const CHECKOUT_CONFIG = {

  freteGratisMinimo:
    500,

  producao:
    "5 a 10 dias",

  entrega:
    "6 a 12 dias úteis após o envio",

  parcelas:
    Number(
      CONFIG?.parcelas ||
      10
    )

};


// ============================================================
// PEDIDO
// ============================================================

function obterPedido() {

  try {

    const salvo =
      localStorage.getItem(
        CHAVE_PEDIDO
      );


    if (salvo) {

      const pedido =
        JSON.parse(
          salvo
        );


      if (
        pedido &&
        Array.isArray(
          pedido.itens
        ) &&
        pedido.itens.length
      ) {

        pedido.itens =
          SalvatexCarrinho
            .normalizarCarrinho(
              pedido.itens
            );


        return pedido;

      }

    }


    const carrinho =
      SalvatexCarrinho
        .obterCarrinho();


    if (carrinho.length) {

      return {

        versao:
          2,

        itens:
          carrinho,

        criadoEm:
          new Date()
            .toISOString()

      };

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
    "checkout-item";


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
    item.nome;


  const valor =
    document.createElement(
      "strong"
    );


  valor.textContent =
    SalvatexCarrinho
      .brl(
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


  const categoria =
    document.createElement(
      "div"
    );


  categoria.className =
    "checkout-item-produto";


  categoria.textContent =
    SalvatexCarrinho
      .nomeCategoria(
        item.categoria
      );


  bloco.appendChild(
    categoria
  );


  item.detalhes
    .forEach(
      (detalhe) => {

        const div =
          document.createElement(
            "div"
          );


        div.className =
          "checkout-item-detalhe";


        div.textContent =
          detalhe.rotulo +
          ": " +
          detalhe.valor;


        bloco.appendChild(
          div
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
      "checkout-itens"
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
// RESUMO POR CATEGORIA
// ============================================================

function renderizarCategoriasResumo(
  itens
) {

  const resumo =
    document.querySelector(
      ".checkout-resumo"
    );


  if (!resumo) {
    return;
  }


  const cortinas =
    document
      .getElementById(
        "checkout-total-cortinas"
      )
      ?.closest(
        ".checkout-resumo-linha"
      );


  if (cortinas) {

    cortinas.style.display =
      "none";

  }


  const trilhos =
    document.getElementById(
      "checkout-linha-trilhos"
    );


  if (trilhos) {

    trilhos.style.display =
      "none";

  }


  resumo
    .querySelectorAll(
      ".checkout-categoria-dinamica"
    )
    .forEach(
      (elemento) =>
        elemento.remove()
    );


  const divisor =
    resumo.querySelector(
      ".checkout-resumo-divisor"
    );


  const totais =
    SalvatexCarrinho
      .calcularTotaisPorCategoria(
        itens
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
        "checkout-resumo-linha checkout-categoria-dinamica";


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
  itens
) {

  renderizarCategoriasResumo(
    itens
  );


  const total =
    SalvatexCarrinho
      .calcularTotal(
        itens
      );


  const frete =
    SalvatexCarrinho
      .calcularFrete(
        itens,
        {
          freteGratisMinimo:
            CHECKOUT_CONFIG
              .freteGratisMinimo,

          categoriaBase:
            "cortina"
        }
      );


  const freteElemento =
    document.getElementById(
      "checkout-frete"
    );


  const aviso =
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


  if (freteElemento) {

    freteElemento.textContent =
      frete.texto;

  }


  if (aviso) {

    aviso.textContent =
      frete.aviso;

  }


  if (totalElemento) {

    totalElemento.textContent =
      SalvatexCarrinho
        .brl(
          total
        );

  }


  if (parcelamento) {

    parcelamento.textContent =
      "ou " +
      CHECKOUT_CONFIG
        .parcelas +
      "x de " +
      SalvatexCarrinho
        .brl(
          total /
          CHECKOUT_CONFIG
            .parcelas
        ) +
      " sem juros";

  }


  window.checkoutFrete =
    frete;

}


// ============================================================
// MÁSCARAS
// ============================================================

function formatarCEP(valor) {

  let numeros =
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


function formatarCPF(valor) {

  let n =
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
        11
      );


  if (n.length <= 3) {
    return n;
  }


  if (n.length <= 6) {

    return (
      n.slice(0,3) +
      "." +
      n.slice(3)
    );

  }


  if (n.length <= 9) {

    return (
      n.slice(0,3) +
      "." +
      n.slice(3,6) +
      "." +
      n.slice(6)
    );

  }


  return (
    n.slice(0,3) +
    "." +
    n.slice(3,6) +
    "." +
    n.slice(6,9) +
    "-" +
    n.slice(9)
  );

}


function formatarTelefone(valor) {

  const n =
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
        11
      );


  if (n.length <= 2) {
    return n;
  }


  if (n.length <= 6) {

    return (
      "(" +
      n.slice(0,2) +
      ") " +
      n.slice(2)
    );

  }


  if (n.length <= 10) {

    return (
      "(" +
      n.slice(0,2) +
      ") " +
      n.slice(2,6) +
      "-" +
      n.slice(6)
    );

  }


  return (
    "(" +
    n.slice(0,2) +
    ") " +
    n.slice(2,7) +
    "-" +
    n.slice(7)
  );

}


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


  cep?.addEventListener(
    "input",
    () => {

      cep.value =
        formatarCEP(
          cep.value
        );

    }
  );


  cpf?.addEventListener(
    "input",
    () => {

      cpf.value =
        formatarCPF(
          cpf.value
        );

    }
  );


  telefone?.addEventListener(
    "input",
    () => {

      telefone.value =
        formatarTelefone(
          telefone.value
        );

    }
  );

}


// ============================================================
// CAMPO
// ============================================================

function valorCampo(id) {

  return (
    document
      .getElementById(
        id
      )
      ?.value
      ?.trim() ||
    ""
  );

}


// ============================================================
// CLIENTE
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
// PREENCHER DADOS ANTIGOS
// ============================================================

function preencherDadosCliente(
  cliente
) {

  if (!cliente) {
    return;
  }


  const mapa = {

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
    mapa
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
// VALIDAR
// ============================================================

function validarFormulario() {

  const dados =
    obterDadosCliente();


  const obrigatorios = {

    "checkout-nome":
      dados.nome,

    "checkout-cpf":
      dados.cpf,

    "checkout-telefone":
      dados.telefone,

    "checkout-email":
      dados.email,

    "checkout-cep":
      dados.cep,

    "checkout-endereco":
      dados.endereco,

    "checkout-numero":
      dados.numero,

    "checkout-bairro":
      dados.bairro,

    "checkout-cidade":
      dados.cidade,

    "checkout-estado":
      dados.estado

  };


  let primeiroErro =
    null;


  Object.entries(
    obrigatorios
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


      const erro =
        !valor;


      campo?.classList.toggle(
        "checkout-campo-erro",
        erro
      );


      if (
        erro &&
        !primeiroErro
      ) {

        primeiroErro =
          campo;

      }

    }
  );


  if (
    dados.cep &&
    dados.cep
      .replace(
        /\D/g,
        ""
      )
      .length !==
      8
  ) {

    const campo =
      document.getElementById(
        "checkout-cep"
      );


    campo?.classList.add(
      "checkout-campo-erro"
    );


    primeiroErro ||=
      campo;

  }


  if (
    dados.cpf &&
    dados.cpf
      .replace(
        /\D/g,
        ""
      )
      .length !==
      11
  ) {

    const campo =
      document.getElementById(
        "checkout-cpf"
      );


    campo?.classList.add(
      "checkout-campo-erro"
    );


    primeiroErro ||=
      campo;

  }


  if (
    dados.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(
        dados.email
      )
  ) {

    const campo =
      document.getElementById(
        "checkout-email"
      );


    campo?.classList.add(
      "checkout-campo-erro"
    );


    primeiroErro ||=
      campo;

  }


  if (primeiroErro) {

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
// SALVAR CHECKOUT LOCALMENTE
// ============================================================

function salvarCheckout() {

  const pedido =
    obterPedido();


  if (!pedido) {
    return null;
  }


  const itens =
    pedido.itens;


  const cliente =
    obterDadosCliente();


  const frete =
    SalvatexCarrinho
      .calcularFrete(
        itens,
        {
          freteGratisMinimo:
            CHECKOUT_CONFIG
              .freteGratisMinimo,

          categoriaBase:
            "cortina"
        }
      );


  const total =
    SalvatexCarrinho
      .calcularTotal(
        itens
      );


  const categorias =
    SalvatexCarrinho
      .calcularTotaisPorCategoria(
        itens
      );


  const atualizado = {

    ...pedido,

    versao:
      4,

    itens,

    cliente,

    entrega: {
      cep:
        cliente.cep,
      endereco:
        cliente.endereco,
      numero:
        cliente.numero,
      complemento:
        cliente.complemento,
      bairro:
        cliente.bairro,
      cidade:
        cliente.cidade,
      estado:
        cliente.estado
    },

    frete,

    status:
      "aguardando_pagamento",

    totaisPorCategoria:
      categorias,

    totais: {

      produtos:
        total,

      frete:
        frete.valor,

      desconto:
        0,

      total:
        total +
        (
          Number(
            frete.valor
          ) ||
          0
        )

    },

    prazos: {

      producao:
        CHECKOUT_CONFIG
          .producao,

      entrega:
        CHECKOUT_CONFIG
          .entrega

    },

    etapa:
      "pagamento",

    atualizadoEm:
      new Date()
        .toISOString()

  };


  return SalvatexPedido
    .salvarPedido(
      atualizado
    );

}


// ============================================================
// CONTINUAR
//
// Antes de abrir a tela de pagamento, o pedido é registrado
// no D1. Assim uma compra nunca depende apenas do localStorage.
// ============================================================

async function continuarPagamento() {

  if (
    !validarFormulario()
  ) {

    alert(
      "Confira os campos destacados antes de continuar."
    );


    return;
  }


  const botao =
    document.getElementById(
      "checkout-continuar"
    );


  const textoOriginal =
    botao?.textContent ||
    "Continuar para pagamento";


  if (botao) {
    botao.disabled = true;
    botao.textContent =
      "Registrando pedido...";
  }


  try {

    const pedidoLocal =
      salvarCheckout();


    if (!pedidoLocal) {
      throw new Error(
        "Não foi possível preparar o pedido."
      );
    }


    await SalvatexPedido
      .registrarNoServidor(
        pedidoLocal
      );


    window.location.href =
      "pagamento.html";


  } catch (erro) {

    console.error(
      "Erro ao registrar pedido:",
      erro
    );


    alert(
      erro?.message ||
      "Não foi possível registrar o pedido. Tente novamente."
    );


    if (botao) {
      botao.disabled = false;
      botao.textContent =
        textoOriginal;
    }

  }

}


// ============================================================
// VAZIO
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
    "checkout-continuar"
  )
  ?.addEventListener(
    "click",
    continuarPagamento
  );


// ============================================================
// INICIAR
// ============================================================

function iniciarCheckout() {

  const pedido =
    obterPedido();


  if (!pedido) {

    mostrarPedidoVazio();

    return;

  }


  configurarMascaras();


  if (
    pedido.cliente
  ) {

    preencherDadosCliente(
      pedido.cliente
    );

  }


  renderizarItens(
    pedido.itens
  );


  atualizarResumo(
    pedido.itens
  );

}


iniciarCheckout();
