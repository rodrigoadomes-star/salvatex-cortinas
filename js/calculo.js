// ============================================================
// MOTOR DE CÁLCULO
// Normalmente você NÃO precisa editar este arquivo.
// As regras e preços ficam em config.js.
// ============================================================


// ============================================================
// REGRA AUTOMÁTICA DA BARRA
// ============================================================

function obterRegraBarra(altura) {

  // Acima de 3,20 m = orçamento personalizado
  // Por enquanto mantemos esta regra.
  if (altura > CONFIG.altura.calculoMaximo) {

    return {
      tamanho: null,
      acrescimo: false
    };

  }


  // De 2,81 m até 3,20 m
  // Barra de 20 cm + acréscimo configurado
  if (altura > CONFIG.altura.inicioAcrescimo) {

    return {
      tamanho: CONFIG.barra.acimaDe280,
      acrescimo: true
    };

  }


  // Até 2,80 m
  // Encontra automaticamente o tamanho da barra
  const faixa =
    CONFIG.barra.faixasSemAcrescimo.find(
      (item) => altura <= item.ate
    );


  return {
    tamanho: faixa ? faixa.tamanho : 5,
    acrescimo: false
  };

}


// ============================================================
// CÁLCULO DO ORÇAMENTO
// ============================================================

function calcularOrcamento(dados) {

  // ==========================================================
  // DADOS BÁSICOS
  // ==========================================================

  const largura =
    Math.max(
      0.5,
      Number(dados.largura) || 0
    );


  const altura =
    Math.max(
      0.5,
      Number(dados.altura) || 0
    );


  const franzimento =
    Number(dados.franzimento) || 2;


  // ==========================================================
  // CONSUMO DE TECIDO
  // ==========================================================

  const consumoTecido =
    largura * franzimento;


  // ==========================================================
  // ALTURA ACIMA DE 3,20 M
  // ==========================================================

  if (
    altura >
    CONFIG.altura.calculoMaximo
  ) {

    return {

      sobConsulta: true,

      erro: false,

      largura,

      altura,

      franzimento,

      consumoTecido,

      barra: null,

      valorCortina: null,

      valorTrilho: null,

      total: null,

      mensagem:
        `Alturas acima de ${
          CONFIG.altura.calculoMaximo
            .toFixed(2)
            .replace(".", ",")
        } m precisam de orçamento personalizado.`

    };

  }


  // ==========================================================
  // PREÇO BASE DA CORTINA
  // ==========================================================

  const precoBase =
    CONFIG.precos?.[dados.tecido]?.[dados.forro];


  if (
    typeof precoBase !== "number"
  ) {

    return {

      erro: true,

      sobConsulta: false,

      mensagem:
        "Preço não configurado para esta combinação de tecido e forro."

    };

  }


  // ==========================================================
  // BARRA
  // ==========================================================

  const regraBarra =
    obterRegraBarra(
      altura
    );


  // ==========================================================
  // VALOR DA CORTINA
  //
  // largura do ambiente
  // × franzimento
  // × preço do tecido/forro
  // ==========================================================

  let valorCortina =
    consumoTecido *
    precoBase;


  // ==========================================================
  // ALTURA DE 2,81 m ATÉ 3,20 m
  // Aplica acréscimo configurado
  // ==========================================================

  if (
    regraBarra.acrescimo
  ) {

    valorCortina *=
      1 +
      CONFIG.altura.acrescimoApos280;

  }


  // Arredonda a cortina para 2 casas decimais

  valorCortina =
    Math.round(
      valorCortina * 100
    ) / 100;


  // ==========================================================
  // TRILHO / VARÃO
  //
  // Agora é calculado como PRODUTO SEPARADO.
  // Não faz parte do valor individual da cortina.
  // ==========================================================

  let valorTrilho =
    0;


  let trilhoSelecionado =
    false;


  if (
    dados.trilho &&
    dados.trilho !== "Não"
  ) {

    const sistema =
      CONFIG.instalacao?.[dados.trilho];


    if (sistema) {

      valorTrilho =
        Math.max(
          sistema.minimo,
          largura *
          sistema.valorMetro
        );


      valorTrilho =
        Math.round(
          valorTrilho * 100
        ) / 100;


      trilhoSelecionado =
        true;

    }

  }


  // ==========================================================
  // TOTAL GERAL
  //
  // Mantemos o total para o resumo geral.
  // Porém agora temos os dois produtos separados:
  //
  // valorCortina
  // valorTrilho
  // ==========================================================

  const total =
    Math.round(
      (
        valorCortina +
        valorTrilho
      ) * 100
    ) / 100;


  // ==========================================================
  // RESULTADO
  // ==========================================================

  return {

    erro: false,

    sobConsulta: false,


    // Medidas

    largura,

    altura,

    franzimento,

    consumoTecido,


    // Cortina

    precoBase,

    valorCortina,


    // Trilho / Varão

    trilho:
      dados.trilho || "",

    trilhoSelecionado,

    valorTrilho,


    // Total do pedido

    total,


    // Barra

    barra:
      regraBarra.tamanho,

    acrescimoAltura:
      regraBarra.acrescimo,


    // ========================================================
    // COMPATIBILIDADE COM O CÓDIGO ANTIGO
    //
    // Mantemos estes nomes temporariamente para não quebrar
    // partes antigas do app.js enquanto fazemos a migração.
    // ========================================================

    cortina:
      valorCortina,

    valorInstalacao:
      valorTrilho

  };

}
