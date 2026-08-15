import{createSession,secureEqual,sessionCookie}from"./_auth.js";
function redirect(request,path,cookie=""){const headers={location:new URL(path,request.url).toString(),"cache-control":"no-store"};if(cookie)headers["set-cookie"]=cookie;return new Response(null,{status:303,headers})}
export async function onRequestPost(context){
  const origin=context.request.headers.get("origin");
  if(origin&&origin!==new URL(context.request.url).origin)return redirect(context.request,"/radz-admin/?erro=origem");
  if(!context.env.RADZ_ADMIN_TOKEN||!context.env.RADZ_ADMIN_SESSION_SECRET)return redirect(context.request,"/radz-admin/?erro=configuracao");
  let form;try{form=await context.request.formData()}catch{return redirect(context.request,"/radz-admin/?erro=dados")}
  if(!await secureEqual(String(form.get("token")||""),String(context.env.RADZ_ADMIN_TOKEN)))return redirect(context.request,"/radz-admin/?erro=credencial");
  const session=await createSession(String(context.env.RADZ_ADMIN_SESSION_SECRET));
  return redirect(context.request,"/radz-admin/",sessionCookie(session.token));
}

