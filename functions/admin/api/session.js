import {json,requireAdmin} from "./_auth.js";
export async function onRequestGet(context){const auth=await requireAdmin(context);if(!auth.ok)return auth.response;return json({ok:true,user:{name:"Administrador",role:"owner"},store:{id:auth.store.id,slug:auth.store.slug,name:auth.store.name,host:auth.store.host}})}
