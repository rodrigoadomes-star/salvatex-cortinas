import{json,requireRadzAdmin}from"./_auth.js";export async function onRequestGet(context){const auth=await requireRadzAdmin(context);if(!auth.ok)return auth.response;return json({ok:true,csrfToken:auth.session.csrf,user:{name:"Administrador RADZ HUB",role:"platform_owner"},scope:"platform"})}

