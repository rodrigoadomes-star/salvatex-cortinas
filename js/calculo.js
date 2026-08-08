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

  // Até 2,80 m:
  // encontra automaticamente o tamanho da barra
  const faixa = CONFIG.barra.faixasSemAcrescimo.find(
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

  const largura = Math.max(
    0.5,
    Number(dados.largura) || 0
  );

  const altura = Math.max(
    0.5,
    Number(dados.altura) || 0
  );

  const franzimento =
    Number(dados.franzimento) || 2;


  // ==========================================================
  // ALTURA ACIMA DE 3,20 M
  // ==========================================================

  if (altura > CONFIG.altura.calculoMaximo) {

    return {
      sobConsulta: true,
      largura,
      altura,
      barra: null,

      mensagem:
        `Alturas acima de ${
          CONFIG.altura.calculoMaximo
            .toFixed(2)
            .replace(".", ",")
        } m precisam de orçamento personalizado.`
    };
  }


  // ==========================================================
  // PREÇO DA CORTINA
  // ==========================================================

  const precoBase =
    CONFIG.precos[dados.tecido]?.[dados.forro];

  if (typeof precoBase !== "number") {

    return {
      erro: true,
      mensagem:
        "Preço não configurado para esta combinação."
    };
  }


  // ==========================================================
  // BARRA
  // ==========================================================

  const regraBarra =
    obterRegraBarra(altura);


  // ==========================================================
  // CORTINA
  // largura × franzimento × preço
  // ==========================================================

  let cortina =
    largura *
    franzimento *
    precoBase;


  // ==========================================================
  // DE 2,81 m ATÉ 3,20 m
  // aplica acréscimo internamente
  // ==========================================================

  if (regraBarra.acrescimo) {

    cortina *=
      1 +
      CONFIG.altura.acrescimoApos280;
  }


  // ==========================================================
  // SISTEMA DE INSTALAÇÃO
  // Trilho simples / Trilho duplo / Não
  // ==========================================================

  let valorInstalacao = 0;

  if (dados.trilho !== "Não") {

    const sistema =
      CONFIG.instalacao[dados.trilho];

    if (sistema) {

      valorInstalacao = Math.max(
        sistema.minimo,
        largura * sistema.valorMetro
      );
    }
  }


  // ==========================================================
  // TOTAL
  // ==========================================================

  const total =
    Math.round(
      (cortina + valorInstalacao) * 100
    ) / 100;


  // ==========================================================
  // RESULTADO
  // ==========================================================

  return {

    sobConsulta: false,

    largura,

    altura,

    cortina,

    valorInstalacao,

    total,

    barra:
      regraBarra.tamanho,

    acrescimoAltura:
      regraBarra.acrescimo
  };
}
