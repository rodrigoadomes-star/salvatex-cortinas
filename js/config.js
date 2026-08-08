// ============================================================
// CONFIGURAÇÕES DO SITE — EDITE PRINCIPALMENTE ESTE ARQUIVO
// ============================================================

const CONFIG = {

  // Coloque somente números: DDI 55 + DDD + número.
  // Exemplo: "5544999999999"
  whatsapp: "5544998793160",

  // Parcelamento exibido no site
  parcelas: 10,

  // Limite máximo para cálculo online
  altura: {
    calculoMaximo: 3.20,
    inicioAcrescimo: 2.80,
    acrescimoApos280: 0.25
  },

  // ==========================================================
  // REGRAS AUTOMÁTICAS DE BARRA
  // Até 2,80 m: mantém o valor tabelado e varia apenas a barra.
  // De 2,81 m até 3,20 m: barra de 20 cm + acréscimo de 25%.
  // ==========================================================
  barra: {
    faixasSemAcrescimo: [
      { ate: 2.60, tamanho: 20 },
      { ate: 2.70, tamanho: 15 },
      { ate: 2.75, tamanho: 10 },
      { ate: 2.80, tamanho: 5 }
    ],

    acimaDe280: 20
  },

  // ==========================================================
  // TRILHOS
  // ==========================================================
  instalacao: {

    "Trilho simples": {
      valorMetro: 74,
      minimo: 85
    },

    "Trilho duplo": {
      valorMetro: 110,
      minimo: 125
    }

  },

  // ==========================================================
  // PREÇOS DAS CORTINAS
  // ==========================================================
  precos: {

    "Gaze de Linho": {
      "Sem forro": 121,
      "Forro leve": 142,
      "Blackout 70%": 173,
      "Blackout 100%": 189
    },

    "Linho Damasco": {
      "Sem forro": 158,
      "Forro leve": 179,
      "Blackout 70%": 226,
      "Blackout 100%": 247
    }

  }

};
