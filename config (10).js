// ============================================================
// CONFIGURAÇÕES DO SITE
// Edite principalmente este arquivo quando precisar alterar
// preços, cores, trilhos, alturas ou parcelamento.
// ============================================================

const CONFIG = {

  // ==========================================================
  // WHATSAPP
  // ==========================================================

  // Coloque somente números:
  // DDI 55 + DDD + número
  // Exemplo: "5544999999999"

  whatsapp: "5544998793160",


  // ==========================================================
  // PARCELAMENTO
  // ==========================================================

  parcelas: 10,


  // ==========================================================
  // ALTURA
  // ==========================================================

  altura: {

    // Até esta altura usamos o cálculo normal.
    // Acima disso, por enquanto, fica sob consulta.

    calculoMaximo: 3.20,


    // A partir de 2,81 m começa o acréscimo.

    inicioAcrescimo: 2.80,


    // 25% de acréscimo para alturas acima de 2,80 m
    // até 3,20 m.

    acrescimoApos280: 0.25

  },


  // ==========================================================
  // REGRAS AUTOMÁTICAS DE BARRA
  // ==========================================================

  barra: {

    faixasSemAcrescimo: [

      {
        ate: 2.60,
        tamanho: 20
      },

      {
        ate: 2.70,
        tamanho: 15
      },

      {
        ate: 2.75,
        tamanho: 10
      },

      {
        ate: 2.80,
        tamanho: 5
      }

    ],


    // De 2,81 m até 3,20 m

    acimaDe280: 20

  },


  // ==========================================================
  // TRILHOS / VARÕES
  //
  // Estes produtos são calculados separadamente da cortina.
  //
  // valorMetro = preço por metro
  // minimo     = valor mínimo cobrado pelo produto
  // ==========================================================

  instalacao: {

    "Varão Wave Deslizante - Aço Escovado": {

      valorMetro: 116,

      minimo: 116

    },


    "Varão Wave Deslizante - Branco": {

      valorMetro: 116,

      minimo: 116

    },


    "Varão Wave Deslizante - Cromado": {

      valorMetro: 95,

      minimo: 95

    },


    "Varão Wave Deslizante - Preto": {

      valorMetro: 116,

      minimo: 116

    },


    "Trilho Suíço - Branco": {

      valorMetro: 74,

      minimo: 85

    },


    "Varão Wave Deslizante Duplo - Cromado": {

      valorMetro: 163,

      minimo: 163

    },


    "Trilho Suíço Duplo - Branco": {

      valorMetro: 110,

      minimo: 110

    }

  },


  // ==========================================================
  // CORES DISPONÍVEIS
  // ==========================================================

  cores: {

    "Gaze de Linho": [

      "Branco",

      "Bege",

      "Cinza",

      "Off White",

      "Natural"

    ],


    "Linho Damasco": [

      "Natural",

      "Branco",

      "Bege",

      "Off White",

      "Grafite"

    ]

  },


  // ==========================================================
  // PREÇOS DAS CORTINAS
  //
  // Valor utilizado pelo cálculo conforme:
  //
  // tecido + forro
  // ==========================================================

  precos: {

    "Gaze de Linho": {

      "Sem forro": 121,

      "Forro leve": 142,

      "Forro Peletizado 50%": 163,

      "Blackout 80%": 173,

      "Blackout 100%": 189

    },


    "Linho Damasco": {

      "Sem forro": 158,

      "Forro leve": 179,

      "Forro Peletizado 50%": 221,

      "Blackout 80%": 226,

      "Blackout 100%": 247

    }

  }

};

// ============================================================
// CONFIGURAÇÃO REMOTA DO PAINEL ADMIN
// ============================================================
window.CONFIG = CONFIG;
window.CONFIG_READY = (async () => {
  try {
    const resposta = await fetch('/api/store-config', { cache: 'no-store' });
    if (!resposta.ok) return CONFIG;
    const dados = await resposta.json();
    if (!dados?.ok || !dados.config || typeof dados.config !== 'object') return CONFIG;

    const mesclar = (alvo, fonte) => {
      Object.entries(fonte).forEach(([chave, valor]) => {
        if (valor && typeof valor === 'object' && !Array.isArray(valor) && alvo[chave] && typeof alvo[chave] === 'object' && !Array.isArray(alvo[chave])) {
          mesclar(alvo[chave], valor);
        } else {
          alvo[chave] = valor;
        }
      });
      return alvo;
    };

    mesclar(CONFIG, dados.config);
    return CONFIG;
  } catch (erro) {
    console.warn('Configuração remota indisponível; usando configuração local.', erro);
    return CONFIG;
  }
})();
