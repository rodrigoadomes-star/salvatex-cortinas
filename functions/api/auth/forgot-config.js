import {json} from '../_lib.js';import {emailEnabled} from '../_email.js';export function onRequestGet(context){return json({ok:true,enabled:emailEnabled(context.env)})}

