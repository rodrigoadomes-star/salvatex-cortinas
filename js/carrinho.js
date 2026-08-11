// ============================================================
// CARRINHO - SALVATEX CORTINAS
// ============================================================

const CHAVE_CARRINHO = "salvatex_carrinho";


// ============================================================
// FORMATAÇÃO BRL
// ============================================================

function brl(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}


// ============================================================
// LER CARRINHO
// ============================================================

function obterCarrinho() {
  try {
    const dados = localStorage.getItem(CHAVE_CARRINHO);

    if (!dados) {
      return [];
    }

    const carrinho = JSON.parse(dados);

    return Array.isArray(carrinho)
      ? carrinho
      : [];

  } catch (erro) {
    console.error("Erro ao carregar carrinho:", erro);
    return [];
  }
}


// ============================================================
// SALVAR CARRINHO
// ============================================================

function salvarCarrinho(carrinho) {
  localStorage.setItem(
    CHAVE_CARRINHO,
    JSON.stringify(carrinho)
  );
}


// ============================================================
// LIMPAR CARRINHO
// ============================================================

function limparCarrinho() {
  localStorage.removeItem(CHAVE_CARRINHO);
  renderizarCarrinho();
}


// ============================================================
// REMOVER ITEM
// ============================================================

function removerItemCarrinho(id) {
  const carrinho = obterCarrinho();

  const novoCarrinho = carrinho.filter(
    (item) => String(item.id) !== String(id)
  );

  salvarCarrinho(novoCarrinho);

  renderizarCarrinho();
}


// ============================================================
// CRIAR DETALHE
// ============================================================

function criarDetalhe(titulo, valor) {
  const div = document.createElement("div");

  const strong = document.createElement("strong");
  strong.textContent = titulo + ": ";

  const span = document.createElement("span");
  span.textContent = valor || "—";

  div.appendChild(strong);
  div.appendChild(span);

  return div;
}


// ============================================================
// CRIAR ITEM DO CARRINHO
// ============================================================

function criarItemCarrinho(item) {
  const artigo = document.createElement("article");

  artigo.className = "carrinho-item";


  // ==========================================================
  // IMAGEM
  // ==========================================================

  if (item.imagem) {
    const imagem = document.createElement("img");

    imagem.className = "carrinho-item-imagem";
    imagem.src = item.imagem;

    imagem.alt =
      (item.tecido || "Cortina") +
      " " +
      (item.cor || "");

    imagem.onerror = () => {
      const placeholder = document.createElement("div");

      placeholder.className =
        "carrinho-item-sem-imagem";

      placeholder.textContent =
        "Imagem da cortina";

      imagem.replaceWith(placeholder);
    };

    artigo.appendChild(imagem);

  } else {
    const placeholder =
      document.createElement("div");

    placeholder.className =
      "carrinho-item-sem-imagem";

    placeholder.textContent =
      "Imagem da cortina";

    artigo.appendChild(placeholder);
  }


  // ==========================================================
  // CONTEÚDO
  // ==========================================================

  const conteudo =
    document.createElement("div");

  conteudo.className =
    "carrinho-item-conteudo";


  const topo =
    document.createElement("div");

  topo.className =
    "carrinho-item-topo";


  const titulo =
    document.createElement("h3");

  titulo.className =
    "carrinho-item-titulo";

  titulo.textContent =
    item.tecido || "Cortina sob medida";


  const preco =
    document.createElement("div");

  preco.className =
    "carrinho-item-preco";

  preco.textContent =
    brl(item.total);


  topo.appendChild(titulo);
  topo.appendChild(preco);

  conteudo.appendChild(topo);


  // ==========================================================
  // DETALHES
  // ==========================================================

  const detalhes =
    document.createElement("div");

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


  const largura =
    Number(item.largura || 0);

  const altura =
    Number(item.altura || 0);


  detalhes.appendChild(
    criarDetalhe(
      "Ambiente",
      largura
        .toFixed(2)
        .replace(".", ",") +
        " × " +
        altura
          .toFixed(2)
          .replace(".", ",") +
        " m"
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Franzimento",
      String(
        item.franzimento || ""
      ).replace(".", ",") + "x"
    )
  );


  detalhes.appendChild(
    criarDetalhe(
      "Barra",
      item.barra
        ? item.barra + " cm"
        : "Sob consulta"
    )
  );


  let trilhoTexto = "Não incluso";

  if (
    item.trilho &&
    item.trilho !== "Não"
  ) {
    trilhoTexto = item.trilho;
  }


  detalhes.appendChild(
    criarDetalhe(
      "Trilho / Varão",
      trilhoTexto
    )
  );


  conteudo.appendChild(detalhes);


  // ==========================================================
  // VALORES DO ITEM
  // ==========================================================

  const valores =
    document.createElement("div");

  valores.style.marginTop = "14px";
  valores.style.fontSize = "13px";
  valores.style.color = "#746c63";


  if (
    typeof item.valorCortina === "number"
  ) {
    const linhaCortina =
      document.createElement("div");

    linhaCortina.textContent =
      "Cortina: " +
      brl(item.valorCortina);

    valores.appendChild(
      linhaCortina
    );
  }


  if (
    item.trilho &&
    item.trilho !== "Não" &&
    typeof item.valorTrilho === "number" &&
    item.valorTrilho > 0
  ) {
    const linhaTrilho =
      document.createElement("div");

    linhaTrilho.textContent =
      item.trilho +
      ": " +
      brl(item.valorTrilho);

    valores.appendChild(
      linhaTrilho
    );
  }


  conteudo.appendChild(valores);


  // ==========================================================
  // REMOVER
  // ==========================================================

  const acoes =
    document.createElement("div");

  acoes.className =
    "carrinho-item-acoes";


  const remover =
    document.createElement("button");

  remover.type = "button";

  remover.className =
    "carrinho-remover";

  remover.textContent =
    "Remover";


  remover.addEventListener(
    "click",
    () => {
      removerItemCarrinho(item.id);
    }
  );


  acoes.appendChild(remover);

  conteudo.appendChild(acoes);

  artigo.appendChild(conteudo);


  return artigo;
}


// ============================================================
// CARRINHO VAZIO
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

      <h2>
        Seu carrinho está vazio
      </h2>

      <p>
        Configure sua cortina sob medida
        e adicione ao carrinho.
      </p>

      <a href="index.html">
        Configurar minha cortina
      </a>

    </div>
  `;

  layout.style.display = "block";
}


// ============================================================
// CALCULAR TOTAIS
// ============================================================

function calcularTotais(carrinho) {
  let cortinas = 0;
  let trilhos = 0;
  let total = 0;


  carrinho.forEach((item) => {
    cortinas +=
      Number(item.valorCortina || 0);

    trilhos +=
      Number(item.valorTrilho || 0);

    total +=
      Number(item.total || 0);
  });


  return {
    cortinas,
    trilhos,
    total
  };
}


// ============================================================
// ATUALIZAR RESUMO
// ============================================================

function atualizarResumoCarrinho(carrinho) {
  const totais =
    calcularTotais(carrinho);


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


  if (resumoCortinas) {
    resumoCortinas.textContent =
      brl(totais.cortinas);
  }


  if (resumoTrilhos) {
    resumoTrilhos.textContent =
      brl(totais.trilhos);
  }


  if (linhaTrilhos) {
    linhaTrilhos.style.display =
      totais.trilhos > 0
        ? "flex"
        : "none";
  }


  if (totalElemento) {
    totalElemento.textContent =
      brl(totais.total);
  }


  if (parcelamento) {
    const parcelas =
      Number(CONFIG?.parcelas || 10);

    if (totais.total > 0) {
      parcelamento.textContent =
        "ou " +
        parcelas +
        "x de " +
        brl(
          totais.total / parcelas
        ) +
        " sem juros";

    } else {
      parcelamento.textContent = "";
    }
  }
}


// ============================================================
// RENDERIZAR CARRINHO
// ============================================================

function renderizarCarrinho() {
  const carrinho =
    obterCarrinho();


  if (!carrinho.length) {
    mostrarCarrinhoVazio();
    return;
  }


  const layout =
    document.getElementById(
      "carrinho-layout"
    );

  const container =
    document.getElementById(
      "carrinho-itens"
    );


  if (!container) {
    return;
  }


  if (layout) {
    layout.style.display = "";
  }


  container.innerHTML = "";


  carrinho.forEach((item) => {
    container.appendChild(
      criarItemCarrinho(item)
    );
  });


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


  if (!carrinho.length) {
    return "";
  }


  const totais =
    calcularTotais(carrinho);


  let mensagem =
    "Olá! Gostaria de finalizar este pedido:\n\n";


  carrinho.forEach(
    (item, indice) => {

      const largura =
        Number(item.largura || 0);

      const altura =
        Number(item.altura || 0);


      mensagem +=
        "CORTINA " +
        (indice + 1) +
        "\n";


      mensagem +=
        "Modelo: " +
        (item.modelo || "—") +
        "\n";


      mensagem +=
        "Tecido: " +
        (item.tecido || "—") +
        "\n";


      mensagem +=
        "Cor: " +
        (item.cor || "—") +
        "\n";


      mensagem +=
        "Forro: " +
        (item.forro || "—") +
        "\n";


      mensagem +=
        "Ambiente: " +
        largura
          .toFixed(2)
          .replace(".", ",") +
        " m x " +
        altura
          .toFixed(2)
          .replace(".", ",") +
        " m\n";


      mensagem +=
        "Franzimento: " +
        String(
          item.franzimento || "—"
        ).replace(".", ",") +
        "x\n";


      mensagem +=
        "Barra: " +
        (
          item.barra
            ? item.barra + " cm"
            : "Sob consulta"
        ) +
        "\n";


      mensagem +=
        "Cortina: " +
        brl(item.valorCortina) +
        "\n";


      if (
        item.trilho &&
        item.trilho !== "Não"
      ) {
        mensagem +=
          item.trilho +
          ": " +
          brl(item.valorTrilho) +
          "\n";

      } else {
        mensagem +=
          "Trilho / Varão: Não incluso\n";
      }


      mensagem +=
        "Subtotal: " +
        brl(item.total) +
        "\n\n";
    }
  );


  mensagem +=
    "TOTAL DO PEDIDO: " +
    brl(totais.total);


  return mensagem;
}


// ============================================================
// CONTINUAR PARA ENTREGA
//
// Por enquanto salva o pedido e vai para checkout.html.
// Depois vamos criar os dados de entrega.
// ============================================================

function continuarParaEntrega() {
  const carrinho =
    obterCarrinho();


  if (!carrinho.length) {
    return;
  }


  localStorage.setItem(
    "salvatex_pedido_atual",
    JSON.stringify({
      itens: carrinho,
      criadoEm: new Date().toISOString()
    })
  );


  window.location.href =
    "checkout.html";
}


// ============================================================
// BOTÃO FINALIZAR
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
// INICIALIZAÇÃO
// ============================================================

renderizarCarrinho();
