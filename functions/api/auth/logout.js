import { json } from "../_lib.js";import { clearCookie } from "../_customer-auth.js";export async function onRequestPost(){return json({ok:true},200,{'Set-Cookie':clearCookie()})}
