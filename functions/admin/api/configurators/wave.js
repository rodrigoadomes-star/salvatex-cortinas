import { onRequestGet as genericGet, onRequestPut as genericPut, onRequestPost as genericPost } from "./[id].js";

function waveContext(context){
  return {...context,params:{...(context.params||{}),id:"wave"}};
}

export function onRequestGet(context){return genericGet(waveContext(context));}
export function onRequestPut(context){return genericPut(waveContext(context));}
export function onRequestPost(context){return genericPost(waveContext(context));}
