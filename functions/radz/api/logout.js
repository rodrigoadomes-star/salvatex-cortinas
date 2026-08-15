import{clearCookie,json,requireRadzAdmin}from"./_auth.js";export async function onRequestPost(context){const auth=await requireRadzAdmin(context);if(!auth.ok)return auth.response;return json({ok:true},200,{"set-cookie":clearCookie()})}

