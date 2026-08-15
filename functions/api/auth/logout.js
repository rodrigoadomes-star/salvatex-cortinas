import { json } from "../_lib.js";import { clearCookie } from "../_customer-auth.js";import {sameOrigin} from '../_security.js';export async function onRequestPost(context){if(!sameOrigin(context))return json({ok:false,message:'Origem não autorizada.'},403);return json({ok:true},200,{'Set-Cookie':clearCookie()})}

