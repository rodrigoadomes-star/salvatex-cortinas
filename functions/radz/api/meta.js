import { requireRadzAdmin, json } from "./_auth.js";

export async function onRequestGet(context){
  const auth=await requireRadzAdmin(context);
  if(!auth.ok)return auth.response;

  const companiesResult=await context.env.DB.prepare(`
    SELECT id, trade_name, status
    FROM platform_companies
    WHERE status NOT IN ('cancelled')
    ORDER BY trade_name
  `).all();

  const integrationsResult=await context.env.DB.prepare(`
    SELECT company_id, status, external_account_id, external_account_name,
           token_expires_at, connected_at, last_checked_at, last_error, updated_at,
           metadata_json
    FROM platform_integrations
    WHERE provider='meta'
  `).all();

  const accountsResult=await context.env.DB.prepare(`
    SELECT company_id, meta_ad_account_id, name, currency, timezone_name, status,
           is_selected, synced_at, updated_at
    FROM platform_meta_ad_accounts
    ORDER BY company_id, name, meta_ad_account_id
  `).all();

  const integrations=new Map((integrationsResult.results||[]).map(row=>[String(row.company_id),row]));
  const accountsByCompany=new Map();
  for(const row of accountsResult.results||[]){
    const key=String(row.company_id);
    if(!accountsByCompany.has(key))accountsByCompany.set(key,[]);
    accountsByCompany.get(key).push({
      id:String(row.meta_ad_account_id||""),
      graphId:`act_${String(row.meta_ad_account_id||"")}`,
      name:String(row.name||""),
      currency:String(row.currency||""),
      timezone:String(row.timezone_name||""),
      status:String(row.status??""),
      selected:Number(row.is_selected||0)===1,
      syncedAt:row.synced_at||null,
      updatedAt:row.updated_at||null
    });
  }

  const companies=(companiesResult.results||[]).map(company=>{
    const companyId=String(company.id);
    const integration=integrations.get(companyId)||null;
    let metadata={};
    try{metadata=integration?.metadata_json?JSON.parse(integration.metadata_json):{}}catch{}
    return {
      id:companyId,
      tradeName:String(company.trade_name||"Empresa"),
      companyStatus:String(company.status||""),
      connected:integration?.status==="connected",
      integration:integration?{
        status:String(integration.status||""),
        metaUserId:String(integration.external_account_id||""),
        metaUserName:String(integration.external_account_name||""),
        tokenStored:Boolean(integration.external_account_id),
        tokenExpiresAt:integration.token_expires_at||null,
        connectedAt:integration.connected_at||null,
        lastCheckedAt:integration.last_checked_at||null,
        lastError:integration.last_error||null,
        updatedAt:integration.updated_at||null,
        adAccountsFound:Number(metadata.ad_accounts_found||0)
      }:null,
      adAccounts:accountsByCompany.get(companyId)||[]
    };
  });

  return json({ok:true,companies,updatedAt:new Date().toISOString()});
}

export async function onRequestPatch(context){
  const auth=await requireRadzAdmin(context);
  if(!auth.ok)return auth.response;

  let body={};
  try{body=await context.request.json()}catch{return json({ok:false,code:"INVALID_JSON",message:"JSON inválido."},400)}

  const companyId=String(body.companyId||"").trim();
  const accountId=String(body.accountId||"").trim().replace(/^act_/,"");
  if(!companyId||!accountId)return json({ok:false,code:"INVALID_INPUT",message:"Empresa e conta de anúncios são obrigatórias."},400);

  const account=await context.env.DB.prepare(`
    SELECT meta_ad_account_id FROM platform_meta_ad_accounts
    WHERE company_id=?1 AND meta_ad_account_id=?2
    LIMIT 1
  `).bind(companyId,accountId).first();
  if(!account)return json({ok:false,code:"ACCOUNT_NOT_FOUND",message:"Conta de anúncios não encontrada para esta empresa."},404);

  const now=new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(`UPDATE platform_meta_ad_accounts SET is_selected=0, updated_at=?2 WHERE company_id=?1`).bind(companyId,now),
    context.env.DB.prepare(`UPDATE platform_meta_ad_accounts SET is_selected=1, updated_at=?3 WHERE company_id=?1 AND meta_ad_account_id=?2`).bind(companyId,accountId,now)
  ]);

  await context.env.DB.prepare(`
    INSERT INTO platform_audit_logs (actor_user_id,company_id,action,target_type,target_id,metadata_json,created_at)
    VALUES (NULL,?1,'meta.ad_account_selected','meta_ad_account',?2,?3,?4)
  `).bind(companyId,accountId,JSON.stringify({meta_ad_account_id:accountId}),now).run().catch(()=>{});

  return json({ok:true,companyId,accountId,updatedAt:now});
}
