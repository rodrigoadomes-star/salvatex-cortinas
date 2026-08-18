import { verifyMetaState } from "./_state.js";
import { encryptSecret } from "./_vault.js";

function safeReturnTo(value){
  const path=String(value||'/radz-admin/');
  return path.startsWith('/')&&!path.startsWith('//')?path:'/radz-admin/';
}
function redirect(context,status,detail="",returnTo='/radz-admin/'){
  const base=new URL(safeReturnTo(returnTo),new URL(context.request.url).origin);
  base.searchParams.set("meta",status);
  if(detail)base.searchParams.set("detail",detail.slice(0,120));
  return Response.redirect(base.toString(),302);
}

export async function onRequestGet(context){
  const requestUrl=new URL(context.request.url);
  const code=requestUrl.searchParams.get("code")||"";
  const state=requestUrl.searchParams.get("state")||"";
  const oauthError=requestUrl.searchParams.get("error")||"";
  const oauthErrorDescription=requestUrl.searchParams.get("error_description")||"";

  const appId=String(context.env.META_APP_ID||"").trim();
  const appSecret=String(context.env.META_APP_SECRET||"").trim();
  const sessionSecret=String(context.env.RADZ_ADMIN_SESSION_SECRET||"").trim();
  const vaultSecret=String(context.env.META_CREDENTIALS_KEY||"").trim();
  const version=String(context.env.META_GRAPH_VERSION||"v24.0").trim();
  const redirectUri=String(context.env.META_OAUTH_REDIRECT_URI||`${requestUrl.origin}/api/oauth/meta/callback`).trim();

  const validState=sessionSecret?await verifyMetaState(sessionSecret,state):null;
  const returnTo=safeReturnTo(validState?.returnTo||'/radz-admin/');
  const source=validState?.source==='tenant'?'tenant':'superadmin';

  if(oauthError)return redirect(context,"cancelled",oauthErrorDescription||oauthError,returnTo);
  if(!appId||!appSecret||!sessionSecret||!vaultSecret)return redirect(context,"config_error","Meta OAuth/cofre não configurado no Cloudflare",returnTo);
  if(!context.env.DB)return redirect(context,"config_error","Binding D1 DB não configurado",returnTo);
  if(!validState)return redirect(context,"state_error","State inválido ou expirado",returnTo);
  if(!validState.companyId)return redirect(context,"company_error","Empresa ausente no state OAuth",returnTo);
  if(!code)return redirect(context,"code_missing","Código OAuth não recebido",returnTo);

  const companyId=String(validState.companyId);
  const company=await context.env.DB.prepare("SELECT id FROM platform_companies WHERE id=?1 AND status NOT IN ('cancelled') LIMIT 1").bind(companyId).first();
  if(!company)return redirect(context,"company_error","Empresa não encontrada",returnTo);

  try{
    const tokenUrl=new URL(`https://graph.facebook.com/${encodeURIComponent(version)}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id",appId);
    tokenUrl.searchParams.set("client_secret",appSecret);
    tokenUrl.searchParams.set("redirect_uri",redirectUri);
    tokenUrl.searchParams.set("code",code);

    const tokenRes=await fetch(tokenUrl.toString(),{headers:{accept:"application/json"}});
    const tokenData=await tokenRes.json().catch(()=>({}));
    if(!tokenRes.ok||!tokenData.access_token){
      console.error(JSON.stringify({event:"meta_oauth_token_exchange_failed",status:tokenRes.status}));
      return redirect(context,"token_error","Falha ao validar autorização com a Meta",returnTo);
    }

    const accessToken=String(tokenData.access_token);
    const profileUrl=new URL(`https://graph.facebook.com/${encodeURIComponent(version)}/me`);
    profileUrl.searchParams.set("fields","id,name");
    profileUrl.searchParams.set("access_token",accessToken);
    const profileRes=await fetch(profileUrl.toString(),{headers:{accept:"application/json"}});
    const profile=await profileRes.json().catch(()=>({}));
    if(!profileRes.ok||!profile.id)return redirect(context,"profile_error","Autorização recebida, mas a conta não pôde ser validada",returnTo);

    const accountsUrl=new URL(`https://graph.facebook.com/${encodeURIComponent(version)}/me/adaccounts`);
    accountsUrl.searchParams.set("fields","id,account_id,name,currency,timezone_name,account_status");
    accountsUrl.searchParams.set("limit","100");
    accountsUrl.searchParams.set("access_token",accessToken);
    const accountsRes=await fetch(accountsUrl.toString(),{headers:{accept:"application/json"}});
    const accountsData=await accountsRes.json().catch(()=>({data:[]}));
    const accounts=accountsRes.ok&&Array.isArray(accountsData.data)?accountsData.data:[];

    const encrypted=await encryptSecret(vaultSecret,accessToken);
    const now=new Date().toISOString();
    const integrationId=`meta-${companyId}`;
    const expiresAt=Number(tokenData.expires_in)>0?new Date(Date.now()+Number(tokenData.expires_in)*1000).toISOString():null;
    const metadata={meta_user_id:String(profile.id),meta_user_name:String(profile.name||""),ad_accounts_found:accounts.length,connection_source:source};

    await context.env.DB.prepare(`
      INSERT INTO platform_integrations (
        id,company_id,provider,status,external_account_id,external_account_name,
        encrypted_access_token,token_iv,token_tag_version,scopes_json,metadata_json,
        token_expires_at,connected_at,last_checked_at,last_error,created_at,updated_at
      ) VALUES (?1,?2,'meta','connected',?3,?4,?5,?6,?7,?8,?9,?10,?11,?11,NULL,?11,?11)
      ON CONFLICT(company_id,provider) DO UPDATE SET
        status='connected',external_account_id=excluded.external_account_id,
        external_account_name=excluded.external_account_name,
        encrypted_access_token=excluded.encrypted_access_token,token_iv=excluded.token_iv,
        token_tag_version=excluded.token_tag_version,scopes_json=excluded.scopes_json,
        metadata_json=excluded.metadata_json,token_expires_at=excluded.token_expires_at,
        connected_at=excluded.connected_at,last_checked_at=excluded.last_checked_at,
        last_error=NULL,updated_at=excluded.updated_at
    `).bind(
      integrationId,companyId,String(profile.id),String(profile.name||""),encrypted.ciphertext,
      encrypted.iv,encrypted.version,JSON.stringify(["ads_read","ads_management","business_management"]),
      JSON.stringify(metadata),expiresAt,now
    ).run();

    await context.env.DB.prepare(`UPDATE platform_meta_ad_accounts SET is_selected=0 WHERE company_id=?1`).bind(companyId).run().catch(()=>{});
    const statements=[];
    for(const account of accounts){
      const adId=String(account.account_id||account.id||"").replace(/^act_/,"");
      if(!adId)continue;
      statements.push(context.env.DB.prepare(`
        INSERT INTO platform_meta_ad_accounts (
          id,company_id,integration_id,meta_ad_account_id,name,currency,timezone_name,status,
          is_selected,metadata_json,synced_at,created_at,updated_at
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,0,?9,?10,?10,?10)
        ON CONFLICT(company_id,meta_ad_account_id) DO UPDATE SET
          integration_id=excluded.integration_id,name=excluded.name,currency=excluded.currency,
          timezone_name=excluded.timezone_name,status=excluded.status,metadata_json=excluded.metadata_json,
          synced_at=excluded.synced_at,updated_at=excluded.updated_at
      `).bind(
        `meta-ad-${companyId}-${adId}`,companyId,integrationId,adId,String(account.name||""),
        String(account.currency||""),String(account.timezone_name||""),String(account.account_status??""),
        JSON.stringify({graph_id:String(account.id||"")}),now
      ));
    }
    if(statements.length)await context.env.DB.batch(statements);

    await context.env.DB.prepare(`INSERT INTO platform_audit_logs (actor_user_id,company_id,action,target_type,target_id,metadata_json,created_at) VALUES (NULL,?1,'meta.connected','integration',?2,?3,?4)`)
      .bind(companyId,integrationId,JSON.stringify({meta_user_id:String(profile.id),ad_accounts_found:accounts.length,connection_source:source}),now).run().catch(()=>{});

    return redirect(context,"connected",accounts.length?`${accounts.length} conta(s) de anúncios encontrada(s)`:"Meta conectada; nenhuma conta de anúncios encontrada",returnTo);
  }catch(error){
    console.error(JSON.stringify({event:"meta_oauth_callback_error",message:String(error?.message||error)}));
    return redirect(context,"error","Falha inesperada ao salvar integração Meta",returnTo);
  }
}
