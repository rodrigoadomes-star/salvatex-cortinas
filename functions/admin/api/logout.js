import {clearAdminCookie,json,requireAdmin} from "./_auth.js";
export async function onRequestPost(context){const auth=await requireAdmin(context);if(!auth.ok)return auth.response;return json({ok:true},200,{"set-cookie":clearAdminCookie()})}
