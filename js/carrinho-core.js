// ============================================================
// CARRINHO CORE - SALVATEX
//
// Estrutura central de produtos.
//
// A partir de agora TODOS os produtos seguem:
//
// {
//   id,
//   grupoId,
//   categoria,
//   nome,
//   imagem,
//   quantidade,
//   valorUnitario,
//   total,
//   detalhes: [],
//   dados: {}
// }
//
// Exemplos de categoria:
//
// cortina
// trilho
// persiana
// acessorio
// instalacao
//
// Carrinho, checkout e pagamento não precisam conhecer
// previamente todas as categorias.
// ============================================================

(function () {

  const CHAVE_CARRINHO =
    "salvatexCarrinho";


  // ==========================================================
  // FORMATAÇÃO
  // ==========================================================

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


  function formatarMedida(valor) {

    return Number(
      valor || 0
    )
      .toFixed(2)
      .replace(".", ",");

  }


  // ==========================================================
  // ID
  // ==========================================================

  function criarId(
    prefixo = "item"
  ) {

    return (
      prefixo +
      "-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2, 8)
    );

  }


  // ==========================================================
  // NORMALIZAR CATEGORIA
  // ==========================================================

  function normalizarCategoria(
    categoria
  ) {

    return String(
      categoria ||
      "outros"
    )
      .trim()
      .toLowerCase();

  }


  // ==========================================================
  // NOME DA CATEGORIA
  //
  // Somente melhora a apresentação.
  //
  // Uma categoria nova continua funcionando mesmo que
  // não esteja cadastrada aqui.
  // ==========================================================

  function nomeCategoria(
    categoria
  ) {

    const nomes = {

      cortina:
        "Cortinas",

      trilho:
        "Trilhos / Varões",

      persiana:
        "Persianas",

      acessorio:
        "Acessórios",

      instalacao:
        "Instalação",

      servico:
        "Serviços",

      outros:
        "Outros"

    };


    const categoriaNormalizada =
      normalizarCategoria(
        categoria
      );


    if (
      nomes[
        categoriaNormalizada
      ]
    ) {

      return nomes[
        categoriaNormalizada
      ];

    }


    return categoriaNormalizada
      .replace(
        /-/g,
        " "
      )
      .replace(
        /\b\w/g,
        (letra) =>
          letra.toUpperCase()
      );

  }


  // ==========================================================
  // CRIAR PRODUTO NOVO
  // ==========================================================

  function criarItem({
    id = "",
    grupoId = "",
    categoria = "outros",
    nome = "Produto",
    imagem = "",
    quantidade = 1,
    valorUnitario = 0,
    total = null,
    detalhes = [],
    dados = {}
  }) {

    const qtd =
      Math.max(
        1,
        Number(
          quantidade || 1
        )
      );


    const unitario =
      Number(
        valorUnitario || 0
      );


    const totalCalculado =
      total === null
        ? unitario * qtd
        : Number(
            total || 0
          );


    return {

      versao:
        2,

      id:
        id ||
        criarId(
          categoria
        ),

      grupoId:
        grupoId ||
        "",

      categoria:
        normalizarCategoria(
          categoria
        ),

      nome:
        nome ||
        "Produto",

      imagem:
        imagem ||
        "",

      quantidade:
        qtd,

      valorUnitario:
        unitario,

      total:
        totalCalculado,

      detalhes:
        Array.isArray(
          detalhes
        )
          ? detalhes
          : [],

      dados:
        dados &&
        typeof dados === "object"
          ? dados
          : {}

    };

  }


  // ==========================================================
  // CONVERTER ITEM ANTIGO
  //
  // Isso permite que produtos que já estejam salvos
  // no navegador continuem funcionando.
  // ==========================================================

  function normalizarItem(
    item
  ) {

    if (
      !item ||
      typeof item !== "object"
    ) {

      return null;

    }


    // ========================================================
    // JÁ É FORMATO NOVO
    // ========================================================

    if (
      item.versao === 2 &&
      item.categoria
    ) {

      return criarItem({
        ...item,
        id:
          item.id,
        grupoId:
          item.grupoId
      });

    }


    // ========================================================
    // CORTINA ANTIGA
    // ========================================================

    if (
      item.tipo ===
      "cortina"
    ) {

      const detalhes = [];


      if (item.modelo) {

        detalhes.push({
          rotulo:
            "Modelo",

          valor:
            item.modelo
        });

      }


      if (item.tecido) {

        detalhes.push({
          rotulo:
            "Tecido",

          valor:
            item.tecido
        });

      }


      if (item.cor) {

        detalhes.push({
          rotulo:
            "Cor",

          valor:
            item.cor
        });

      }


      if (item.forro) {

        detalhes.push({
          rotulo:
            "Forro",

          valor:
            item.forro
        });

      }


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

        detalhes.push({
          rotulo:
            "Ambiente",

          valor:
            formatarMedida(
              largura
            ) +
            " × " +
            formatarMedida(
              altura
            ) +
            " m"
        });

      }


      if (
        item.franzimento
      ) {

        detalhes.push({
          rotulo:
            "Franzimento",

          valor:
            String(
              item.franzimento
            )
              .replace(
                ".",
                ","
              ) +
            "x"
        });

      }


      if (
        item.barra
      ) {

        detalhes.push({
          rotulo:
            "Barra",

          valor:
            item.barra +
            " cm"
        });

      }


      return criarItem({

        id:
          item.id,

        grupoId:
          item.grupoId,

        categoria:
          "cortina",

        nome:
          item.produto ||
          "Cortina sob medida",

        imagem:
          item.imagem,

        quantidade:
          item.quantidade ||
          1,

        valorUnitario:
          item.valorUnitario ||
          item.total,

        total:
          item.total,

        detalhes,

        dados: {

          modelo:
            item.modelo,

          tecido:
            item.tecido,

          cor:
            item.cor,

          forro:
            item.forro,

          larguraAmbiente:
            largura,

          altura:
            altura,

          franzimento:
            item.franzimento,

          consumoTecido:
            item.consumoTecido,

          barra:
            item.barra

        }

      });

    }


    // ========================================================
    // TRILHO ANTIGO
    // ========================================================

    if (
      item.tipo ===
      "trilho"
    ) {

      const largura =
        Number(
          item.largura ||
          0
        );


      const detalhes =
        [];


      if (
        largura > 0
      ) {

        detalhes.push({

          rotulo:
            "Medida",

          valor:
            formatarMedida(
              largura
            ) +
            " m"

        });

      }


      return criarItem({

        id:
          item.id,

        grupoId:
          item.grupoId,

        categoria:
          "trilho",

        nome:
          item.produto ||
          "Trilho / Varão",

        quantidade:
          item.quantidade ||
          1,

        valorUnitario:
          item.valorUnitario ||
          item.total,

        total:
          item.total,

        detalhes,

        dados: {

          largura

        }

      });

    }


    // ========================================================
    // QUALQUER OUTRO PRODUTO
    // ========================================================

    return criarItem({

      id:
        item.id,

      grupoId:
        item.grupoId,

      categoria:
        item.categoria ||
        item.tipo ||
        "outros",

      nome:
        item.nome ||
        item.produto ||
        "Produto",

      imagem:
        item.imagem,

      quantidade:
        item.quantidade ||
        1,

      valorUnitario:
        item.valorUnitario ||
        item.total,

      total:
        item.total,

      detalhes:
        item.detalhes ||
        [],

      dados:
        item.dados ||
        {}

    });

  }


  // ==========================================================
  // NORMALIZAR CARRINHO
  // ==========================================================

  function normalizarCarrinho(
    carrinho
  ) {

    if (
      !Array.isArray(
        carrinho
      )
    ) {

      return [];

    }


    return carrinho
      .map(
        normalizarItem
      )
      .filter(
        Boolean
      );

  }


  // ==========================================================
  // LER CARRINHO
  // ==========================================================

  function obterCarrinho() {

    try {

      const salvo =
        localStorage.getItem(
          CHAVE_CARRINHO
        );


      if (!salvo) {

        return [];

      }


      const original =
        JSON.parse(
          salvo
        );


      const normalizado =
        normalizarCarrinho(
          original
        );


      // Migração automática para versão nova.

      localStorage.setItem(
        CHAVE_CARRINHO,
        JSON.stringify(
          normalizado
        )
      );


      return normalizado;


    } catch (erro) {

      console.error(
        "Erro ao carregar carrinho:",
        erro
      );


      return [];

    }

  }


  // ==========================================================
  // SALVAR CARRINHO
  // ==========================================================

  function salvarCarrinho(
    carrinho
  ) {

    const normalizado =
      normalizarCarrinho(
        carrinho
      );


    localStorage.setItem(
      CHAVE_CARRINHO,
      JSON.stringify(
        normalizado
      )
    );


    return normalizado;

  }


  // ==========================================================
  // ADICIONAR ITEM
  // ==========================================================

  function adicionarItem(
    item
  ) {

    const carrinho =
      obterCarrinho();


    const novoItem =
      normalizarItem(
        item
      );


    if (!novoItem) {

      return null;

    }


    carrinho.push(
      novoItem
    );


    salvarCarrinho(
      carrinho
    );


    return novoItem;

  }


  // ==========================================================
  // ADICIONAR VÁRIOS ITENS
  // ==========================================================

  function adicionarItens(
    itens
  ) {

    const carrinho =
      obterCarrinho();


    const novos =
      normalizarCarrinho(
        itens
      );


    carrinho.push(
      ...novos
    );


    salvarCarrinho(
      carrinho
    );


    return novos;

  }


  // ==========================================================
  // REMOVER ITEM
  // ==========================================================

  function removerItem(
    id
  ) {

    const carrinho =
      obterCarrinho();


    const novo =
      carrinho.filter(
        (item) =>
          String(
            item.id
          ) !==
          String(
            id
          )
      );


    salvarCarrinho(
      novo
    );


    return novo;

  }


  // ==========================================================
  // REMOVER GRUPO
  //
  // Permite no futuro remover uma cortina e o trilho
  // correspondente juntos.
  // ==========================================================

  function removerGrupo(
    grupoId
  ) {

    const carrinho =
      obterCarrinho();


    const novo =
      carrinho.filter(
        (item) =>
          String(
            item.grupoId
          ) !==
          String(
            grupoId
          )
      );


    salvarCarrinho(
      novo
    );


    return novo;

  }


  // ==========================================================
  // LIMPAR
  // ==========================================================

  function limparCarrinho() {

    localStorage.removeItem(
      CHAVE_CARRINHO
    );

  }


  // ==========================================================
  // QUANTIDADE
  // ==========================================================

  function obterQuantidade(
    itens = null
  ) {

    const carrinho =
      itens ||
      obterCarrinho();


    return carrinho.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantidade ||
          1
        ),
      0
    );

  }


  // ==========================================================
  // TOTAIS POR CATEGORIA
  // ==========================================================

  function calcularTotaisPorCategoria(
    itens
  ) {

    const resultado =
      {};


    normalizarCarrinho(
      itens
    ).forEach(
      (item) => {

        if (
          !resultado[
            item.categoria
          ]
        ) {

          resultado[
            item.categoria
          ] = 0;

        }


        resultado[
          item.categoria
        ] +=
          Number(
            item.total ||
            0
          );

      }
    );


    return resultado;

  }


  // ==========================================================
  // TOTAL GERAL
  // ==========================================================

  function calcularTotal(
    itens
  ) {

    return normalizarCarrinho(
      itens
    ).reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.total ||
          0
        ),
      0
    );

  }


  // ==========================================================
  // TOTAL DE UMA CATEGORIA
  // ==========================================================

  function calcularTotalCategoria(
    itens,
    categoria
  ) {

    const categoriaNormalizada =
      normalizarCategoria(
        categoria
      );


    return normalizarCarrinho(
      itens
    )
      .filter(
        (item) =>
          item.categoria ===
          categoriaNormalizada
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.total ||
            0
          ),
        0
      );

  }


  // ==========================================================
  // FRETE
  //
  // Por enquanto a regra comercial continua:
  //
  // Cortinas >= R$500 = frete grátis.
  //
  // Trilho comprado junto acompanha.
  //
  // A estrutura permite alterar isso depois sem alterar
  // checkout, pagamento ou carrinho.
  // ==========================================================

  function calcularFrete(
    itens,
    configuracao = {}
  ) {

    const minimo =
      Number(
        configuracao
          .freteGratisMinimo ??
        500
      );


    const categoriaBase =
      configuracao
        .categoriaBase ||
      "cortina";


    const totalBase =
      calcularTotalCategoria(
        itens,
        categoriaBase
      );


    const possuiBase =
      normalizarCarrinho(
        itens
      ).some(
        (item) =>
          item.categoria ===
          categoriaBase
      );


    if (
      possuiBase &&
      totalBase >=
        minimo
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
          "Este pedido possui frete grátis."

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
        "O frete será calculado pela Salvatex conforme o CEP de entrega."

    };

  }


  // ==========================================================
  // API GLOBAL
  // ==========================================================

  window.SalvatexCarrinho = {

    CHAVE_CARRINHO,

    brl,

    formatarMedida,

    criarId,

    criarItem,

    normalizarItem,

    normalizarCarrinho,

    normalizarCategoria,

    nomeCategoria,

    obterCarrinho,

    salvarCarrinho,

    adicionarItem,

    adicionarItens,

    removerItem,

    removerGrupo,

    limparCarrinho,

    obterQuantidade,

    calcularTotaisPorCategoria,

    calcularTotalCategoria,

    calcularTotal,

    calcularFrete

  };

})();
