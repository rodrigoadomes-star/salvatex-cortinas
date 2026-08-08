// ============================================================
// MOTOR DE CÁLCULO
// Normalmente você NÃO precisa editar este arquivo.
// As regras e preços ficam em config.js.
// ============================================================

function obterRegraBarra(altura) {
  if (altura > CONFIG.altura.calculoMaximo) {
    return { tamanho: null, acrescimo: false };
  }

  if (altura > CONFIG.altura.inicioAcrescimo) {
    return {
      tamanho: CONFIG.barra.acimaDe280,
      acrescimo: true
    };
  }

  const faixa = CONFIG.barra.faixasSemAcrescimo.find((item) => altura <= item.ate);
  return {
    tamanho: faixa ? faixa.tamanho : 5,
    acrescimo: false
  };
}

function calcularOrcamento(dados) {
  const largura = Math.max(0.5, Number(dados.largura) || 0);
  const altura = Math.max(0.5, Number(dados.altura) || 0);
  const franzimento = Number(dados.franzimento) || 2;

  if (altura > CONFIG.altura.calculoMaximo) {
    return {
      sobConsulta: true,
      largura,
      altura,
      barra: null,
      mensagem: `Alturas acima de ${CONFIG.altura.calculoMaximo.toFixed(2).replace('.', ',')} m precisam de orçamento personalizado.`
    };
  }

  const precoBase = CONFIG.precos[dados.tecido]?.[dados.forro];
  if (typeof precoBase !== "number") {
    return { erro: true, mensagem: "Preço não configurado para esta combinação." };
  }

  const regraBarra = obterRegraBarra(altura);

  // Regra principal: largura × franzimento × preço-base
  let cortina = largura * franzimento * precoBase;

  // De 2,81 m até 3,20 m: barra de 20 cm e +25% no valor da cortina.
  if (regraBarra.acrescimo) {
    cortina *= 1 + CONFIG.altura.acrescimoApos280;
  }

let valorInstalacao = 0;

if (state.trilho !== "Não") {
  const sistema = CONFIG.instalacao[state.trilho];

  if (sistema) {
    valorInstalacao = Math.max(
      sistema.minimo,
      largura * sistema.valorMetro
    );
  }
}

  if (dados.modelo === "Ilhós") {
    valorTrilho = 74;
    cortina *= CONFIG.ilhos.multiplicador;
  }
  
 const total =
Math.round((cortina + valorSistema) * 100) / 100;

  switch(state.trilho){

case "Trilho simples":
    valorSistema = largura * CONFIG.trilhoSimples;
break;

case "Trilho duplo":
    valorSistema = largura * CONFIG.trilhoDuplo;
break;

case "Varão simples":
    valorSistema = largura * CONFIG.varaoSimples;
break;

case "Varão duplo":
    valorSistema = largura * CONFIG.varaoDuplo;
break;

default:
    valorSistema = 0;

}

  return {
    sobConsulta: false,
    largura,
    altura,
    cortina,
    valorTrilho,
    total,
    barra: regraBarra.tamanho,
    acrescimoAltura: regraBarra.acrescimo
  };
}
