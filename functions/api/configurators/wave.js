import { onRequestGet as getConfigurator } from "./[id].js";

export async function onRequestGet(context){
  return getConfigurator({
    ...context,
    params:{...(context.params||{}),id:"wave"}
  });
}
