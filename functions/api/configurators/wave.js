import { json } from "../_lib.js";

const DEFAULT_WAVE = {
  id: "wave",
  nome: "Cortina Wave",
  ativo: true,
  modelo: "Wave",

  medidas: {
    larguraMinima: 0.5,
    larguraMaxima: 12,
    alturaMinima: 0.5,
    alturaEntradaMaxima: 5,
    calculoMaximo: 3.2,
    inicioAcrescimo: 2.8,
    acrescimoPercentual: 25,

    acimaMaximo: {
      modo: "consulta",
      texto:
        "Alturas acima de 3,20 m precisam de orçamento personalizado.",
      textoBotao:
        "Solicitar orçamento",
      permitirCarrinho:
        false
    }
  },

  barra: {
    faixas: [
      { ate: 2.60, tamanho: 20 },
      { ate: 2.70, tamanho: 15 },
      { ate: 2.75, tamanho: 10 },
      { ate: 2.80, tamanho: 5 }
    ],

    acimaInicio:
      20
  },

  franzimentos: [
    {
      valor: 2,
      rotulo:
        "2x — Menos Volumosa"
    },
    {
      valor: 2.5,
      rotulo:
        "2,5x — Bem Franzido"
    },
    {
      valor: 3,
      rotulo:
        "3x — Mais Volumosa"
    }
  ],

  tecidos: {},

  trilhos: {},

  midia: []
};


function clone(valor) {

  return JSON.parse(
    JSON.stringify(
      valor
    )
  );

}


function mergeDeep(
  target,
  source
) {

  if (
    !source ||
    typeof source !== "object" ||
    Array.isArray(source)
  ) {

    return target;

  }


  for (
    const [
      key,
      value
    ] of Object.entries(
      source
    )
  ) {

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {

      target[key] =
        mergeDeep(
          target[key] &&
          typeof target[key] === "object" &&
          !Array.isArray(
            target[key]
          )
            ? target[key]
            : {},
          value
        );

    } else {

      target[key] =
        value;

    }

  }


  return target;

}


function legacyIntoWave(
  site
) {

  const wave =
    clone(
      DEFAULT_WAVE
    );


  if (
    !site ||
    typeof site !== "object"
  ) {

    return wave;

  }


  if (site.altura) {

    if (
      site.altura
        .calculoMaximo != null
    ) {

      wave.medidas
        .calculoMaximo =
        Number(
          site.altura
            .calculoMaximo
        );

    }


    if (
      site.altura
        .inicioAcrescimo != null
    ) {

      wave.medidas
        .inicioAcrescimo =
        Number(
          site.altura
            .inicioAcrescimo
        );

    }


    if (
      site.altura
        .acrescimoApos280 != null
    ) {

      wave.medidas
        .acrescimoPercentual =
        Number(
          site.altura
            .acrescimoApos280
        ) * 100;

    }

  }


  if (
    site.barra
      ?.faixasSemAcrescimo
  ) {

    wave.barra.faixas =
      site.barra
        .faixasSemAcrescimo;

  }


  if (
    site.barra
      ?.acimaDe280 != null
  ) {

    wave.barra
      .acimaInicio =
      Number(
        site.barra
          .acimaDe280
      );

  }


  if (
    site.instalacao &&
    typeof site.instalacao ===
      "object"
  ) {

    wave.trilhos =
      site.instalacao;

  }


  if (
    site.precos &&
    typeof site.precos ===
      "object"
  ) {

    Object.entries(
      site.precos
    ).forEach(
      ([
        tecido,
        forros
      ]) => {

        wave.tecidos[
          tecido
        ] = {

          ativo:
            true,

          cores:
            Array.isArray(
              site.cores?.[
                tecido
              ]
            )
              ? site.cores[
                  tecido
                ]
              : [],

          forros:
            forros &&
            typeof forros ===
              "object"
              ? forros
              : {}

        };

      }
    );

  }


  return wave;

}


async function readWave(
  db
) {

  // ========================================================
  // CONFIGURADOR NOVO DO PAINEL
  //
  // Quando já existe uma configuração salva pelo Admin,
  // ela é a fonte de verdade.
  //
  // Não fazemos merge das listas com o site_config antigo,
  // pois isso faria itens removidos/renomeados reaparecerem.
  // ========================================================

  const row =
    await db.prepare(`
      SELECT
        value_json,
        updated_at
      FROM store_configs
      WHERE
        store_id = 'salvatex'
        AND config_key = 'configurator_wave'
    `).first();


  if (
    row?.value_json
  ) {

    try {

      const salvo =
        JSON.parse(
          row.value_json
        );


      const wave =
        mergeDeep(
          clone(
            DEFAULT_WAVE
          ),
          salvo
        );


      // Coleções do Admin substituem completamente
      // as coleções padrão.
      wave.tecidos =
        salvo.tecidos &&
        typeof salvo.tecidos ===
          "object"
          ? salvo.tecidos
          : {};


      wave.trilhos =
        salvo.trilhos &&
        typeof salvo.trilhos ===
          "object"
          ? salvo.trilhos
          : {};


      wave.franzimentos =
        Array.isArray(
          salvo.franzimentos
        )
          ? salvo.franzimentos
          : clone(
              DEFAULT_WAVE
                .franzimentos
            );


      wave.midia =
        Array.isArray(
          salvo.midia
        )
          ? salvo.midia
          : [];


      return {

        wave,

        updatedAt:
          row.updated_at ||
          null,

        source:
          "configurator_wave"

      };

    } catch (error) {

      console.error(
        "Erro ao interpretar configurator_wave:",
        error
      );

    }

  }


  // ========================================================
  // FALLBACK LEGADO
  //
  // Só é usado enquanto o Wave nunca foi salvo pelo painel.
  // ========================================================

  const legacy =
    await db.prepare(`
      SELECT
        value_json
      FROM store_configs
      WHERE
        store_id = 'salvatex'
        AND config_key = 'site_config'
    `).first();


  let site = {};


  try {

    site =
      JSON.parse(
        legacy?.value_json ||
        "{}"
      );

  } catch {}


  return {

    wave:
      legacyIntoWave(
        site
      ),

    updatedAt:
      null,

    source:
      "legacy_site_config"

  };

}


export async function onRequestGet(
  context
) {

  if (
    !context.env.DB
  ) {

    return json(
      {
        ok: false,
        wave: null,
        message:
          "Banco D1 indisponível."
      },
      503
    );

  }


  try {

    const data =
      await readWave(
        context.env.DB
      );


    return json(
      {
        ok: true,
        ...data
      },
      200,
      {
        "Cache-Control":
          "no-store, no-cache, must-revalidate"
      }
    );

  } catch (error) {

    console.error(
      "configurator wave public",
      error
    );


    return json(
      {
        ok: false,
        wave: null,
        message:
          "Não foi possível carregar o configurador Wave."
      },
      500
    );

  }

}
