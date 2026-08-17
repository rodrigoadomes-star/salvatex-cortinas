import { verifyMetaState } from "./_state.js";

function redirect(context,status,detail=""){
  const base=new URL("/radz-admin/",new URL(context.request.url).origin);
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

  if(oauthError){
    return redirect(context,"cancelled",oauthErrorDescription||oauthError);
  }

  const appId=String(context.env.META_APP_ID||"").trim();
  const appSecret=String(context.env.META_APP_SECRET||"").trim();
  const sessionSecret=String(context.env.RADZ_ADMIN_SESSION_SECRET||"").trim();
  const version=String(context.env.META_GRAPH_VERSION||"v24.0").trim();
  const redirectUri=String(
    context.env.META_OAUTH_REDIRECT_URI||
    `${requestUrl.origin}/api/oauth/meta/callback`
  ).trim();

  if(!appId||!appSecret||!sessionSecret){
    return redirect(context,"config_error","Meta OAuth não configurado no Cloudflare");
  }

  const validState=await verifyMetaState(sessionSecret,state);
  if(!validState)return redirect(context,"state_error","State inválido ou expirado");
  if(!code)return redirect(context,"code_missing","Código OAuth não recebido");

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
      return redirect(context,"token_error","Falha ao validar autorização com a Meta");
    }

    const profileUrl=new URL(`https://graph.facebook.com/${encodeURIComponent(version)}/me`);
    profileUrl.searchParams.set("fields","id,name");
    profileUrl.searchParams.set("access_token",tokenData.access_token);
    const profileRes=await fetch(profileUrl.toString(),{headers:{accept:"application/json"}});
    const profile=await profileRes.json().catch(()=>({}));
    if(!profileRes.ok||!profile.id){
      console.error(JSON.stringify({event:"meta_oauth_profile_failed",status:profileRes.status}));
      return redirect(context,"profile_error","Autorização recebida, mas a conta não pôde ser validada");
    }

    // Não persistimos o access token aqui. A persistência multiempresa será feita
    // somente quando houver cofre/criptografia de credenciais no backend.
    console.log(JSON.stringify({event:"meta_oauth_verified",metaUserId:String(profile.id),at:new Date().toISOString()}));
    return redirect(context,"oauth_verified");
  }catch(error){
    console.error(JSON.stringify({event:"meta_oauth_callback_error",message:String(error?.message||error)}));
    return redirect(context,"error","Falha inesperada ao validar integração Meta");
  }
}
