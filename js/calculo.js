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
  if (
    altura >
    CONFIG.altura.calculoMaximo
  ) {

    return {
      tamanho: null,
      acrescimo: false
    };

  }


  // De 2,81 m até 3,20 m
  // Barra de 20 cm + acréscimo configurado
  if (
    altura >
    CONFIG.altura.inicioAcrescimo
  ) {

    return {
      tamanho: CONFIG.barra.acimaDe280,
      acrescimo: true
    };

  }


  // Até 2,80 m
  // Encontra automaticamente o tamanho da barra
  const faixa =
    CONFIG.barra.faixasSemAcrescimo.find(
      (item) =>
        altura <= item.ate
    );


  return {
    tamanho:
      faixa
        ? faixa.tamanho
        : 5,

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

  const largura = Number(dados.largura);


  const altura = Number(dados.altura);

  const larguraMinima = Number(CONFIG.configurador?.medidas?.larguraMinima ?? 0.5);
  const larguraMaxima = Number(CONFIG.configurador?.medidas?.larguraMaxima ?? 12);
  const alturaMinima = Number(CONFIG.configurador?.medidas?.alturaMinima ?? 0.5);

  if (
    !Number.isFinite(largura) ||
    !Number.isFinite(altura) ||
    largura < larguraMinima ||
    largura > larguraMaxima ||
    altura < alturaMinima ||
    altura > Number(CONFIG.altura.alturaEntradaMaxima || 5)
  ) {
    return {
      erro: true,
      sobConsulta: false,
      mensagem: `Informe medidas válidas: largura entre ${larguraMinima.toFixed(2).replace('.', ',')} m e ${larguraMaxima.toFixed(2).replace('.', ',')} m, e altura entre ${alturaMinima.toFixed(2).replace('.', ',')} m e ${Number(CONFIG.altura.alturaEntradaMaxima || 5).toFixed(2).replace('.', ',')} m.`
    };
  }


  const franzimento =
    Number(dados.franzimento) || 2;


  // ==========================================================
  // CONSUMO DE TECIDO
  //
  // Exemplo:
  // ambiente 2,00 m
  // franzimento 2x
  // consumo = 4,00 m
  // ==========================================================

  const consumoTecido =
    largura *
    franzimento;


  // ==========================================================
  // ALTURA ACIMA DE 3,20 M
  //
  // Ainda não aplicamos aqui a futura regra especial.
  // Por enquanto continua como orçamento personalizado.
  // ==========================================================

  if (
    altura >
    CONFIG.altura.calculoMaximo
  ) {

    return {

      erro: false,

      sobConsulta: true,


      // Medidas

      largura,

      altura,

      franzimento,

      consumoTecido,


      // Cortina

      precoBase: null,

      valorCortina: null,


      // Trilho / Varão

      trilho:
        dados.trilho || "",

      trilhoSelecionado:
        Boolean(
          dados.trilho &&
          dados.trilho !== "Não"
        ),

      valorTrilho: null,


      // Total

      total: null,


      // Barra

      barra: null,

      acrescimoAltura: false,


      // Compatibilidade

      cortina: null,

      valorInstalacao: null,


      mensagem:
        CONFIG.altura.acimaMaximo?.texto ||
        `Alturas acima de ${
          CONFIG.altura.calculoMaximo
            .toFixed(2)
            .replace(".", ",")
        } m precisam de orçamento personalizado.`

    };

  }


  // ==========================================================
  // PREÇO BASE DA CORTINA
  //
  // Exemplo:
  // Gaze de Linho + Forro leve = R$ 142
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
  // REGRA DA BARRA
  // ==========================================================

  const regraBarra =
    obterRegraBarra(
      altura
    );


  // ==========================================================
  // VALOR SOMENTE DA CORTINA
  //
  // consumo de tecido × preço por metro
  // ==========================================================

  let valorCortina =
    consumoTecido *
    precoBase;


  // ==========================================================
  // ALTURA DE 2,81 m ATÉ 3,20 m
  //
  // Aplica o acréscimo configurado em config.js.
  // ==========================================================

  if (
    regraBarra.acrescimo
  ) {

    valorCortina *=
      1 +
      CONFIG.altura.acrescimoApos280;

  }


  // ==========================================================
  // ARREDONDA VALOR DA CORTINA
  // ==========================================================

  valorCortina =
    Math.round(
      valorCortina * 100
    ) / 100;


  // ==========================================================
  // TRILHO / VARÃO
  //
  // É um segundo produto.
  // O valor é calculado separadamente da cortina.
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
          Number(sistema.minimo) || 0,
          largura *
          (Number(sistema.valorMetro) || 0)
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
  // Cortina + Trilho / Varão
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


    // ========================================================
    // MEDIDAS
    // ========================================================

    largura,

    altura,

    franzimento,

    consumoTecido,


    // ========================================================
    // CORTINA
    // ========================================================

    precoBase,

    valorCortina,


    // ========================================================
    // TRILHO / VARÃO
    // ========================================================

    trilho:
      dados.trilho || "",

    trilhoSelecionado,

    valorTrilho,


    // ========================================================
    // TOTAL DO PEDIDO
    // ========================================================

    total,


    // ========================================================
    // BARRA
    // ========================================================

    barra:
      regraBarra.tamanho,

    acrescimoAltura:
      regraBarra.acrescimo,


    // ========================================================
    // COMPATIBILIDADE COM PARTES ANTIGAS DO APP.JS
    // ========================================================

    cortina:
      valorCortina,

    valorInstalacao:
      valorTrilho

  };

}
