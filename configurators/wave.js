import { json, requireAdmin, logAdmin } from "../_auth.js";
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
      texto: "Alturas acima de 3,20 m precisam de orçamento personalizado.",
      textoBotao: "Solicitar orçamento",
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
    { valor: 2, rotulo: "2x — Menos Volumosa" },
    { valor: 2.5, rotulo: "2,5x — Bem Franzido" },
    { valor: 3, rotulo: "3x — Mais Volumosa" }
  ],
  tecidos: {
    "Gaze de Linho": {
      ativo: true,
      cores: ["Branco","Bege","Cinza","Off White","Natural"],
      forros: {
        "Sem forro": 121,
        "Forro leve": 142,
        "Forro Peletizado 50%": 163,
        "Blackout 80%": 173,
        "Blackout 100%": 189
      }
    },
    "Linho Damasco": {
      ativo: true,
      cores: ["Natural","Branco","Bege","Off White","Grafite"],
      forros: {
        "Sem forro": 158,
        "Forro leve": 179,
        "Forro Peletizado 50%": 221,
        "Blackout 80%": 226,
        "Blackout 100%": 247
      }
    }
  },
  trilhos: {
    "Varão Wave Deslizante - Aço Escovado": { valorMetro: 116, minimo: 116 },
    "Varão Wave Deslizante - Branco": { valorMetro: 116, minimo: 116 },
    "Varão Wave Deslizante - Cromado": { valorMetro: 95, minimo: 95 },
    "Varão Wave Deslizante - Preto": { valorMetro: 116, minimo: 116 },
    "Trilho Suíço - Branco": { valorMetro: 74, minimo: 85 },
    "Varão Wave Deslizante Duplo - Cromado": { valorMetro: 163, minimo: 163 },
    "Trilho Suíço Duplo - Branco": { valorMetro: 110, minimo: 110 }
  },
  midia: []
};

function mergeDeep(target, source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return target;
  for (const [key,value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key]=mergeDeep(target[key]&&typeof target[key]==="object"&&!Array.isArray(target[key])?target[key]:{},value);
    } else target[key]=value;
  }
  return target;
}

function legacyIntoWave(site, wave) {
  if (!site || typeof site !== "object") return wave;
  if (site.altura) {
    if (site.altura.calculoMaximo != null) wave.medidas.calculoMaximo=Number(site.altura.calculoMaximo);
    if (site.altura.inicioAcrescimo != null) wave.medidas.inicioAcrescimo=Number(site.altura.inicioAcrescimo);
    if (site.altura.acrescimoApos280 != null) wave.medidas.acrescimoPercentual=Number(site.altura.acrescimoApos280)*100;
  }
  if (site.barra?.faixasSemAcrescimo) wave.barra.faixas=site.barra.faixasSemAcrescimo;
  if (site.barra?.acimaDe280 != null) wave.barra.acimaInicio=site.barra.acimaDe280;
  if (site.instalacao) wave.trilhos=site.instalacao;
  if (site.precos) {
    Object.entries(site.precos).forEach(([tecido,forros])=>{
      wave.tecidos[tecido]=wave.tecidos[tecido]||{ativo:true,cores:site.cores?.[tecido]||[],forros:{}};
      wave.tecidos[tecido].forros=forros;
    });
  }
  if (site.cores) Object.entries(site.cores).forEach(([tecido,cores])=>{
    wave.tecidos[tecido]=wave.tecidos[tecido]||{ativo:true,cores:[],forros:{}};
    wave.tecidos[tecido].cores=cores;
  });
  return wave;
}

async function readWave(db) {
  const [row, legacy] = await Promise.all([
    db.prepare(`SELECT value_json,updated_at FROM store_configs WHERE store_id='salvatex' AND config_key='configurator_wave'`).first(),
    db.prepare(`SELECT value_json FROM store_configs WHERE store_id='salvatex' AND config_key='site_config'`).first()
  ]);
  let site={}; try{site=JSON.parse(legacy?.value_json||'{}')}catch{}
  let wave=legacyIntoWave(site, structuredClone(DEFAULT_WAVE));
  if (row?.value_json) { try { wave=mergeDeep(wave,JSON.parse(row.value_json)); } catch {} }
  return {wave,updatedAt:row?.updated_at||null};
}

export async function onRequestGet(context) {
  const a=requireAdmin(context); if(!a.ok)return a.response;
  const data=await readWave(context.env.DB);
  return json({ok:true,...data});
}

export async function onRequestPut(context) {
  const a=requireAdmin(context); if(!a.ok)return a.response;
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:"JSON inválido"},400)}
  const wave=body.wave&&typeof body.wave==='object'?body.wave:null;
  if(!wave)return json({ok:false,message:"Configurador inválido"},400);
  if(!wave.medidas || Number(wave.medidas.calculoMaximo)<=0)return json({ok:false,message:"Informe a altura máxima calculada."},400);
  const now=new Date().toISOString();
  await context.env.DB.prepare(`INSERT INTO store_configs(store_id,config_key,value_json,updated_at) VALUES('salvatex','configurator_wave',?1,?2) ON CONFLICT(store_id,config_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).bind(JSON.stringify(wave),now).run();
  await logAdmin(context.env.DB,"configurator_updated","configurator","wave",{nome:wave.nome});
  return json({ok:true,wave,updatedAt:now});
}
