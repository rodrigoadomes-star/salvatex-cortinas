import {json} from '../_lib.js';import {requireCustomer} from '../_customer-auth.js';export async function onRequestGet(context){const a=await requireCustomer(context);if(!a.ok)return json({ok:true,authenticated:false,user:null},200,a.response.headers.get('set-cookie')?{'Set-Cookie':a.response.headers.get('set-cookie')}:{}) ;return json({ok:true,authenticated:true,user:a.user})}

