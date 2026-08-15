import { json, requireAdmin, clean, slugify, logAdmin } from "./_auth.js";

function digits(value){ return String(value||"").replace(/\D/g,""); }
function validCnpj(value){
  const cnpj=digits(value);
  if(cnpj.length!==14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc=(base,weights)=>{let sum=0;for(let i=0;i<weights.length;i++)sum+=Number(base[i])*weights[i];const r=sum%11;return r<2?0:11-r};
  const d1=calc(cnpj,[5,4,3,2,9,8,7,6,5,4,3,2]);
  const d2=calc(cnpj,[6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return d1===Number(cnpj[12])&&d2===Number(cnpj[13]);
}
function map(row){return row?{id:row.id,slug:row.slug,legalName:row.legal_name,tradeName:row.trade_name,cnpj:row.cnpj,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at}:null}

export async function onRequestGet(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;
  try{
    const rows=await context.env.DB.prepare("SELECT * FROM platform_companies ORDER BY trade_name").all();
    return json({ok:true,companies:(rows.results||[]).map(map)});
  }catch{return json({ok:false,code:"MULTITENANT_SCHEMA_PENDING",message:"A estrutura de empresas ainda não foi aplicada no D1."},503)}
}

export async function onRequestPost(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:"JSON inválido."},400)}
  const legalName=clean(body.legalName,180),tradeName=clean(body.tradeName,120),cnpj=digits(body.cnpj),slug=slugify(body.slug||tradeName);
  if(!legalName||!tradeName||!slug||!validCnpj(cnpj))return json({ok:false,message:"Informe empresa, razão social e um CNPJ válido."},400);
  const id=crypto.randomUUID(),now=new Date().toISOString();
  try{
    await context.env.DB.prepare("INSERT INTO platform_companies(id,slug,legal_name,trade_name,cnpj,status,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,'active',?6,?6)").bind(id,slug,legalName,tradeName,cnpj,now).run();
  }catch(e){return json({ok:false,message:String(e).includes("UNIQUE")?"Empresa, CNPJ ou identificador já cadastrado.":"Não foi possível cadastrar a empresa."},409)}
  await logAdmin(context.env.DB,"platform_company_created","platform_company",id,{slug});
  return json({ok:true,company:{id,slug,legalName,tradeName,cnpj,status:"active",createdAt:now,updatedAt:now}},201);
}
