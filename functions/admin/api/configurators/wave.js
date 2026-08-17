import { json, logAdmin } from "../_auth.js";
import { requireAdminPermission } from "../_permissions.js";

const DEFAULT_WAVE = {
  id:"wave", nome:"Cortina Wave", ativo:true, modelo:"Wave",
  medidas:{larguraMinima:0.5,larguraMaxima:12,alturaMinima:0.5,alturaEntradaMaxima:5,calculoMaximo:3.2,inicioAcrescimo:2.8,acrescimoPercentual:25,acimaMaximo:{modo:"consulta",texto:"Alturas acima de 3,20 m precisam de orçamento personalizado.",textoBotao:"Solicitar orçamento",permitirCarrinho:false}},
  barra:{faixas:[{ate:2.60,tamanho:20},{ate:2.70,tamanho:15},{ate:2.75,tamanho:10},{ate:2.80,tamanho:5}],acimaInicio:20},
  franzimentos:[{valor:2,rotulo:"2x — Menos Volumosa"},{valor:2.5,rotulo:"2,5x — Bem Franzido"},{valor:3,rotulo:"3x — Mais Volumosa"}],
  tecidos:{},trilhos:{},midia:[]
};

function clone(v){return JSON.parse(JSON.stringify(v));}
function mergeDeep(target,source){if(!source||typeof source!=="object"||Array.isArray(source))return target;for(const[k,v]of Object.entries(source)){if(v&&typeof v==="object"&&!Array.isArray(v))target[k]=mergeDeep(target[k]&&typeof target[k]==="object"&&!Array.isArray(target[k])?target[k]:{},v);else target[k]=v;}return target;}
function legacyIntoWave(site){
  const wave=clone(DEFAULT_WAVE);if(!site||typeof site!=="object")return wave;
  if(site.altura?.calculoMaximo!=null)wave.medidas.calculoMaximo=Number(site.altura.calculoMaximo);
  if(site.altura?.inicioAcrescimo!=null)wave.medidas.inicioAcrescimo=Number(site.altura.inicioAcrescimo);
  if(site.altura?.acrescimoApos280!=null)wave.medidas.acrescimoPercentual=Number(site.altura.acrescimoApos280)*100;
  if(Array.isArray(site.barra?.faixasSemAcrescimo))wave.barra.faixas=site.barra.faixasSemAcrescimo;
  if(site.barra?.acimaDe280!=null)wave.barra.acimaInicio=Number(site.barra.acimaDe280);
  if(site.instalacao&&typeof site.instalacao==="object")wave.trilhos=site.instalacao;
  if(site.precos&&typeof site.precos==="object")for(const[tecido,forros]of Object.entries(site.precos)){wave.tecidos[tecido]={ativo:true,cores:Array.isArray(site.cores?.[tecido])?site.cores[tecido]:[],forros:forros&&typeof forros==="object"?forros:{}};}
  return wave;
}

async function readWave(db,storeId){
  const row=await db.prepare(`SELECT value_json,updated_at FROM store_configs WHERE store_id=?1 AND config_key='configurator_wave'`).bind(storeId).first();
  if(row?.value_json){try{const saved=JSON.parse(row.value_json),wave=mergeDeep(clone(DEFAULT_WAVE),saved);wave.tecidos=saved.tecidos&&typeof saved.tecidos==='object'?saved.tecidos:{};wave.trilhos=saved.trilhos&&typeof saved.trilhos==='object'?saved.trilhos:{};wave.franzimentos=Array.isArray(saved.franzimentos)?saved.franzimentos:clone(DEFAULT_WAVE.franzimentos);wave.midia=Array.isArray(saved.midia)?saved.midia:[];return{wave,updatedAt:row.updated_at||null,source:'configurator_wave'};}catch(error){console.error('configurator_wave',error)}}
  const legacy=await db.prepare(`SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key='site_config'`).bind(storeId).first();
  let site={};try{site=JSON.parse(legacy?.value_json||'{}')}catch{}
  return{wave:legacyIntoWave(site),updatedAt:null,source:'legacy_site_config'};
}

export async function onRequestGet(context){
  const auth=await requireAdminPermission(context,"company.products.write");if(!auth.ok)return auth.response;
  try{return json({ok:true,...await readWave(context.env.DB,auth.storeId)},200,{"Cache-Control":"no-store, no-cache, must-revalidate"});}
  catch(error){console.error(error);return json({ok:false,wave:null,message:"Não foi possível carregar o configurador Wave."},500)}
}

export async function onRequestPut(context){
  const auth=await requireAdminPermission(context,"company.products.write");if(!auth.ok)return auth.response;
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:"JSON inválido."},400)}
  const received=body.wave&&typeof body.wave==="object"&&!Array.isArray(body.wave)?body.wave:body;
  if(!received||typeof received!=="object"||Array.isArray(received))return json({ok:false,message:"Configurador inválido."},400);
  const wave=mergeDeep(clone(DEFAULT_WAVE),received);wave.id='wave';wave.tecidos=received.tecidos&&typeof received.tecidos==='object'&&!Array.isArray(received.tecidos)?received.tecidos:{};wave.trilhos=received.trilhos&&typeof received.trilhos==='object'&&!Array.isArray(received.trilhos)?received.trilhos:{};wave.franzimentos=Array.isArray(received.franzimentos)?received.franzimentos:clone(DEFAULT_WAVE.franzimentos);wave.midia=Array.isArray(received.midia)?received.midia:[];
  if(!wave.medidas||Number(wave.medidas.calculoMaximo)<=0)return json({ok:false,message:"Informe corretamente a altura máxima calculada."},400);
  if(Number(wave.medidas.alturaEntradaMaxima)<Number(wave.medidas.calculoMaximo))return json({ok:false,message:"A altura máxima permitida para digitação não pode ser menor que a altura máxima calculada."},400);
  const now=new Date().toISOString();
  await context.env.DB.prepare(`INSERT INTO store_configs(store_id,config_key,value_json,updated_at) VALUES(?1,'configurator_wave',?2,?3) ON CONFLICT(store_id,config_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).bind(auth.storeId,JSON.stringify(wave),now).run();
  await logAdmin(context.env.DB,"configurator_updated","configurator","wave",{nome:wave.nome||"Cortina Wave",tecidos:Object.keys(wave.tecidos||{}).length,trilhos:Object.keys(wave.trilhos||{}).length,updatedAt:now},auth.storeId);
  return json({ok:true,message:"Configurador Wave salvo com sucesso.",wave,updatedAt:now},200,{"Cache-Control":"no-store, no-cache, must-revalidate"});
}
export async function onRequestPost(context){return onRequestPut(context);}
