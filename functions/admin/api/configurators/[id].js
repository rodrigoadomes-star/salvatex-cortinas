import { json, requireAdmin, logAdmin } from "../_auth.js";

const IDS = new Set(["wave","prega-macho","cortina-varao","persiana"]);

function defaultConfigurator(id) {
  const base = {
    id,
    nome: id === "prega-macho" ? "Cortina Prega Macho" : id === "cortina-varao" ? "Cortina de Varão" : id === "persiana" ? "Persiana sob medida" : "Cortina Wave",
    ativo: id === "wave",
    modelo: id === "prega-macho" ? "Prega Macho" : id === "cortina-varao" ? "Varão" : id === "persiana" ? "Persiana" : "Wave",
    tipo: id === "persiana" ? "persiana" : "cortina",
    descricao: "",
    modoCalculo: id === "persiana" ? "area" : "metro_tecido",
    medidas: {
      larguraMinima: 0.5,
      larguraMaxima: id === "persiana" ? 5 : 12,
      alturaMinima: 0.5,
      alturaEntradaMaxima: id === "persiana" ? 4 : 5,
      calculoMaximo: id === "persiana" ? 3.5 : 3.2,
      inicioAcrescimo: id === "persiana" ? 999 : 2.8,
      acrescimoPercentual: id === "persiana" ? 0 : 25,
      acimaMaximo: {
        modo: "consulta",
        texto: id === "persiana" ? "Medida fora do limite automático. Solicite orçamento personalizado." : "Alturas acima de 3,20 m precisam de orçamento personalizado.",
        textoBotao: "Solicitar orçamento",
        permitirCarrinho: false
      }
    },
    barra: { faixas: [], acimaInicio: 20 },
    franzimentos: id === "persiana" ? [] : [
      { valor: 2, rotulo: "2x — Menos Volumosa" },
      { valor: 2.5, rotulo: "2,5x — Bem Franzido" },
      { valor: 3, rotulo: "3x — Mais Volumosa" }
    ],
    tecidos: {},
    trilhos: {},
    persiana: {
      areaMinima: 0.6,
      acionamentos: [
        { nome: "Manual", adicional: 0, descricao: "Acionamento manual por corrente." },
        { nome: "Motorizada", adicional: 0, descricao: "Motorização configurável no orçamento." }
      ],
      ladosComando: ["Direito", "Esquerdo"],
      voltagens: ["110V", "220V", "Bivolt"]
    },
    midia: []
  };
  return base;
}

function clone(v){return JSON.parse(JSON.stringify(v));}
function mergeDeep(target, source){
  if(!source || typeof source!=="object" || Array.isArray(source)) return target;
  for(const [k,v] of Object.entries(source)){
    if(v && typeof v==="object" && !Array.isArray(v)) target[k]=mergeDeep(target[k]&&typeof target[k]==="object"&&!Array.isArray(target[k])?target[k]:{},v);
    else target[k]=v;
  }
  return target;
}

async function readConfig(db,id){
  const row=await db.prepare(`SELECT value_json,updated_at FROM store_configs WHERE store_id='salvatex' AND config_key=?1`).bind('configurator_'+id.replaceAll('-','_')).first();
  if(row?.value_json){
    try{
      const saved=JSON.parse(row.value_json);
      const cfg=mergeDeep(defaultConfigurator(id),saved);
      for(const key of ['tecidos','trilhos']) cfg[key]=saved[key]&&typeof saved[key]==='object'?saved[key]:{};
      cfg.midia=Array.isArray(saved.midia)?saved.midia:[];
      cfg.franzimentos=Array.isArray(saved.franzimentos)?saved.franzimentos:cfg.franzimentos;
      return {configurator:cfg,updatedAt:row.updated_at||null,source:'d1'};
    }catch{}
  }
  return {configurator:defaultConfigurator(id),updatedAt:null,source:'default'};
}

export async function onRequestGet(context){
  const auth=await requireAdmin(context); if(!auth.ok)return auth.response;
  const id=String(context.params.id||'').toLowerCase();
  if(!IDS.has(id)) return json({ok:false,message:'Configurador não suportado.'},404);
  try{return json({ok:true,...await readConfig(context.env.DB,id)});}catch(error){console.error(error);return json({ok:false,message:'Não foi possível carregar o configurador.'},500)}
}

export async function onRequestPut(context){
  const auth=await requireAdmin(context); if(!auth.ok)return auth.response;
  const id=String(context.params.id||'').toLowerCase();
  if(!IDS.has(id)) return json({ok:false,message:'Configurador não suportado.'},404);
  let body={}; try{body=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
  const received=(body.configurator&&typeof body.configurator==='object')?body.configurator:(body.wave&&typeof body.wave==='object'?body.wave:body);
  if(!received||typeof received!=='object'||Array.isArray(received)) return json({ok:false,message:'Configurador inválido.'},400);
  const cfg=mergeDeep(defaultConfigurator(id),received); cfg.id=id;
  if(Number(cfg.medidas?.calculoMaximo||0)<=0) return json({ok:false,message:'Informe o limite de cálculo automático.'},400);
  if(Number(cfg.medidas?.alturaEntradaMaxima||0)<Number(cfg.medidas?.calculoMaximo||0)) return json({ok:false,message:'A altura máxima permitida não pode ser menor que o limite automático.'},400);
  const now=new Date().toISOString(); const key='configurator_'+id.replaceAll('-','_');
  try{
    await context.env.DB.prepare(`INSERT INTO store_configs(store_id,config_key,value_json,updated_at) VALUES('salvatex',?1,?2,?3) ON CONFLICT(store_id,config_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).bind(key,JSON.stringify(cfg),now).run();
    await logAdmin(context.env.DB,'configurator_updated','configurator',id,{nome:cfg.nome,updatedAt:now});
    return json({ok:true,configurator:cfg,wave:id==='wave'?cfg:undefined,updatedAt:now});
  }catch(error){console.error('save configurator',error);return json({ok:false,message:'Erro ao salvar o configurador no D1.'},500)}
}
export async function onRequestPost(context){return onRequestPut(context);}
