import {
  json,
  requireAdmin,
  logAdmin
} from "../_auth.js";


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
      permitirCarrinho: false
    }
  },

  barra: {
    faixas: [
      { ate: 2.60, tamanho: 20 },
      { ate: 2.70, tamanho: 15 },
      { ate: 2.75, tamanho: 10 },
      { ate: 2.80, tamanho: 5 }
    ],

    acimaInicio: 20
  },

  franzimentos: [
    {
      valor: 2,
      rotulo: "2x — Menos Volumosa"
    },
    {
      valor: 2.5,
      rotulo: "2,5x — Bem Franzido"
    },
    {
      valor: 3,
      rotulo: "3x — Mais Volumosa"
    }
  ],

  tecidos: {},
  trilhos: {},
  midia: []
};


function clone(valor) {
  return JSON.parse(
    JSON.stringify(valor)
  );
}


function mergeDeep(target, source) {

  if (
    !source ||
    typeof source !== "object" ||
    Array.isArray(source)
  ) {
    return target;
  }

  for (
    const [key, value]
    of Object.entries(source)
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
          !Array.isArray(target[key])
            ? target[key]
            : {},
          value
        );

    } else {

      target[key] = value;

    }
  }

  return target;
}


function legacyIntoWave(site) {

  const wave =
    clone(DEFAULT_WAVE);

  if (
    !site ||
    typeof site !== "object"
  ) {
    return wave;
  }


  // ALTURAS
  if (site.altura) {

    if (
      site.altura.calculoMaximo != null
    ) {
      wave.medidas.calculoMaximo =
        Number(
          site.altura.calculoMaximo
        );
    }


    if (
      site.altura.inicioAcrescimo != null
    ) {
      wave.medidas.inicioAcrescimo =
        Number(
          site.altura.inicioAcrescimo
        );
    }


    if (
      site.altura.acrescimoApos280 != null
    ) {
      wave.medidas.acrescimoPercentual =
        Number(
          site.altura.acrescimoApos280
        ) * 100;
    }
  }


  // BARRAS
  if (
    site.barra?.faixasSemAcrescimo
  ) {

    wave.barra.faixas =
      site.barra.faixasSemAcrescimo;
  }


  if (
    site.barra?.acimaDe280 != null
  ) {

    wave.barra.acimaInicio =
      Number(
        site.barra.acimaDe280
      );
  }


  // TRILHOS E VARÕES
  if (
    site.instalacao &&
    typeof site.instalacao === "object"
  ) {

    wave.trilhos =
      site.instalacao;
  }


  // TECIDOS / CORES / FORROS
  if (
    site.precos &&
    typeof site.precos === "object"
  ) {

    Object.entries(
      site.precos
    ).forEach(
      ([tecido, forros]) => {

        wave.tecidos[tecido] = {

          ativo: true,

          cores:
            Array.isArray(
              site.cores?.[tecido]
            )
              ? site.cores[tecido]
              : [],

          forros:
            forros &&
            typeof forros === "object"
              ? forros
              : {}
        };

      }
    );
  }


  return wave;
}


async function readWave(db) {

  // =====================================================
  // CONFIGURAÇÃO NOVA SALVA PELO PAINEL ADMIN
  // =====================================================

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


  if (row?.value_json) {

    try {

      const salvo =
        JSON.parse(
          row.value_json
        );


      const wave =
        mergeDeep(
          clone(DEFAULT_WAVE),
          salvo
        );


      // IMPORTANTE:
      // essas coleções devem vir exatamente
      // como foram salvas pelo Admin.

      wave.tecidos =
        salvo.tecidos &&
        typeof salvo.tecidos === "object"
          ? salvo.tecidos
          : {};


      wave.trilhos =
        salvo.trilhos &&
        typeof salvo.trilhos === "object"
          ? salvo.trilhos
          : {};


      wave.franzimentos =
        Array.isArray(
          salvo.franzimentos
        )
          ? salvo.franzimentos
          : clone(
              DEFAULT_WAVE.franzimentos
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
          row.updated_at || null,

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


  // =====================================================
  // CONFIGURAÇÃO ANTIGA
  //
  // Só será usada se o configurador ainda nunca tiver
  // sido salvo pelo novo Painel Admin.
  // =====================================================

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
        legacy?.value_json || "{}"
      );

  } catch (error) {

    console.error(
      "Erro ao interpretar site_config:",
      error
    );
  }


  return {

    wave:
      legacyIntoWave(site),

    updatedAt: null,

    source:
      "legacy_site_config"
  };
}


// =======================================================
// GET
// CARREGA CONFIGURADOR NO PAINEL
// =======================================================

export async function onRequestGet(
  context
) {

  const auth =
    requireAdmin(context);

  if (!auth.ok) {
    return auth.response;
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
      "Erro ao carregar configurador Wave:",
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


// =======================================================
// PUT
// SALVA ALTERAÇÕES FEITAS NO PAINEL
// =======================================================

export async function onRequestPut(
  context
) {

  const auth =
    requireAdmin(context);

  if (!auth.ok) {
    return auth.response;
  }


  try {

    let body = {};


    try {

      body =
        await context.request.json();

    } catch {

      return json(
        {
          ok: false,
          message:
            "JSON inválido."
        },
        400
      );
    }


    /*
      Aceita tanto:

      {
        "wave": {...}
      }

      quanto o objeto do configurador
      diretamente.
    */

    const recebido =
      body.wave &&
      typeof body.wave === "object" &&
      !Array.isArray(body.wave)
        ? body.wave
        : body;


    if (
      !recebido ||
      typeof recebido !== "object" ||
      Array.isArray(recebido)
    ) {

      return json(
        {
          ok: false,
          message:
            "Configurador inválido."
        },
        400
      );
    }


    // Mescla campos estruturais com os padrões.
    const wave =
      mergeDeep(
        clone(DEFAULT_WAVE),
        recebido
      );


    /*
      As coleções abaixo NÃO podem sofrer
      merge com dados antigos.

      Isso permite:
      - adicionar forro
      - remover forro
      - renomear forro
      - adicionar trilho
      - remover trilho
      - renomear varão
      - alterar tecidos
      - alterar imagens
    */

    wave.tecidos =
      recebido.tecidos &&
      typeof recebido.tecidos === "object" &&
      !Array.isArray(recebido.tecidos)
        ? recebido.tecidos
        : {};


    wave.trilhos =
      recebido.trilhos &&
      typeof recebido.trilhos === "object" &&
      !Array.isArray(recebido.trilhos)
        ? recebido.trilhos
        : {};


    wave.franzimentos =
      Array.isArray(
        recebido.franzimentos
      )
        ? recebido.franzimentos
        : clone(
            DEFAULT_WAVE.franzimentos
          );


    wave.midia =
      Array.isArray(
        recebido.midia
      )
        ? recebido.midia
        : [];


    // VALIDAÇÕES
    if (
      !wave.medidas ||
      Number(
        wave.medidas.calculoMaximo
      ) <= 0
    ) {

      return json(
        {
          ok: false,
          message:
            "Informe corretamente a altura máxima calculada."
        },
        400
      );
    }


    if (
      Number(
        wave.medidas.alturaEntradaMaxima
      ) <
      Number(
        wave.medidas.calculoMaximo
      )
    ) {

      return json(
        {
          ok: false,
          message:
            "A altura máxima permitida para digitação não pode ser menor que a altura máxima calculada."
        },
        400
      );
    }


    const now =
      new Date().toISOString();


    // ===================================================
    // SALVA NO D1
    // ===================================================

    await context.env.DB
      .prepare(`
        INSERT INTO store_configs (
          store_id,
          config_key,
          value_json,
          updated_at
        )
        VALUES (
          'salvatex',
          'configurator_wave',
          ?1,
          ?2
        )

        ON CONFLICT (
          store_id,
          config_key
        )

        DO UPDATE SET
          value_json =
            excluded.value_json,
          updated_at =
            excluded.updated_at
      `)
      .bind(
        JSON.stringify(wave),
        now
      )
      .run();


    // REGISTRA NO LOG ADMINISTRATIVO
    await logAdmin(
      context.env.DB,
      "configurator_updated",
      "configurator",
      "wave",
      {
        nome:
          wave.nome ||
          "Cortina Wave",

        tecidos:
          Object.keys(
            wave.tecidos || {}
          ).length,

        trilhos:
          Object.keys(
            wave.trilhos || {}
          ).length,

        updatedAt:
          now
      }
    );


    return json(
      {
        ok: true,

        message:
          "Configurador Wave salvo com sucesso.",

        wave,

        updatedAt:
          now
      },
      200,
      {
        "Cache-Control":
          "no-store, no-cache, must-revalidate"
      }
    );


  } catch (error) {

    console.error(
      "Erro ao salvar configurador Wave:",
      error
    );


    return json(
      {
        ok: false,
        message:
          "Erro ao salvar o configurador Wave."
      },
      500
    );
  }
}


// =======================================================
// POST
// ACEITA POST CASO O FRONT-END ATUAL ESTEJA USANDO POST
// =======================================================

export async function onRequestPost(
  context
) {

  return onRequestPut(
    context
  );
}
