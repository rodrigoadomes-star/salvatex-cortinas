// ============================================================
// CONFIGURAÇÃO LOCAL DE SEGURANÇA
//
// O painel Admin é a fonte principal. Este arquivo permanece apenas
// como fallback caso o banco/API esteja temporariamente indisponível.
// ============================================================

const CONFIG = {
  whatsapp: "5544998793160",
  parcelas: 10,
  freteGratisMinimo: 500,
  producao: "5 a 10 dias úteis",
  entrega: "6 a 12 dias úteis após o envio",
  altura: {
    alturaEntradaMaxima: 5,
    calculoMaximo: 3.20,
    inicioAcrescimo: 2.80,
    acrescimoApos280: 0.25,
    acimaMaximo: {
      modo: "consulta",
      texto: "Alturas acima de 3,20 m precisam de orçamento personalizado.",
      textoBotao: "Solicitar orçamento",
      permitirCarrinho: false
    }
  },
  barra: {
    faixasSemAcrescimo: [
      {ate:2.60,tamanho:20},
      {ate:2.70,tamanho:15},
      {ate:2.75,tamanho:10},
      {ate:2.80,tamanho:5}
    ],
    acimaDe280: 20
  },
  instalacao: {
    "Varão Wave Deslizante - Aço Escovado": {valorMetro:116,minimo:116},
    "Varão Wave Deslizante - Branco": {valorMetro:116,minimo:116},
    "Varão Wave Deslizante - Cromado": {valorMetro:95,minimo:95},
    "Varão Wave Deslizante - Preto": {valorMetro:116,minimo:116},
    "Trilho Suíço - Branco": {valorMetro:74,minimo:85},
    "Varão Wave Deslizante Duplo - Cromado": {valorMetro:163,minimo:163},
    "Trilho Suíço Duplo - Branco": {valorMetro:110,minimo:110}
  },
  cores: {
    "Gaze de Linho":["Branco","Bege","Cinza","Off White","Natural"],
    "Linho Damasco":["Natural","Branco","Bege","Off White","Grafite"]
  },
  precos: {
    "Gaze de Linho":{"Sem forro":121,"Forro leve":142,"Forro Peletizado 50%":163,"Blackout 80%":173,"Blackout 100%":189},
    "Linho Damasco":{"Sem forro":158,"Forro leve":179,"Forro Peletizado 50%":221,"Blackout 80%":226,"Blackout 100%":247}
  },
  franzimentos: [
    {valor:2,rotulo:"2x — Menos Volumosa"},
    {valor:2.5,rotulo:"2,5x — Bem Franzido"},
    {valor:3,rotulo:"3x — Mais Volumosa"}
  ],
  mediaConfigurador: [],
  configuradorTecidos: {},
  configurador: { id:"wave", nome:"Cortina Wave", ativo:true }
};

function mesclarConfig(alvo, fonte) {
  if(!fonte || typeof fonte!=="object")return alvo;
  Object.entries(fonte).forEach(([chave,valor])=>{
    if(valor&&typeof valor==="object"&&!Array.isArray(valor)&&alvo[chave]&&typeof alvo[chave]==="object"&&!Array.isArray(alvo[chave])) mesclarConfig(alvo[chave],valor);
    else alvo[chave]=valor;
  });
  return alvo;
}

function aplicarWave(wave) {
  if(!wave||typeof wave!=="object")return;
  const medidas=wave.medidas||{};
  CONFIG.configurador={id:wave.id||"wave",nome:wave.nome||"Cortina Wave",ativo:wave.ativo!==false};
  if(medidas.alturaEntradaMaxima!=null)CONFIG.altura.alturaEntradaMaxima=Number(medidas.alturaEntradaMaxima);
  if(medidas.calculoMaximo!=null)CONFIG.altura.calculoMaximo=Number(medidas.calculoMaximo);
  if(medidas.inicioAcrescimo!=null)CONFIG.altura.inicioAcrescimo=Number(medidas.inicioAcrescimo);
  if(medidas.acrescimoPercentual!=null)CONFIG.altura.acrescimoApos280=Number(medidas.acrescimoPercentual)/100;
  CONFIG.altura.acimaMaximo=medidas.acimaMaximo||CONFIG.altura.acimaMaximo;
  if(wave.barra?.faixas)CONFIG.barra.faixasSemAcrescimo=wave.barra.faixas;
  if(wave.barra?.acimaInicio!=null)CONFIG.barra.acimaDe280=Number(wave.barra.acimaInicio);
  if(Array.isArray(wave.franzimentos))CONFIG.franzimentos=wave.franzimentos;
  if(wave.trilhos)CONFIG.instalacao=wave.trilhos;
  if(wave.tecidos){
    CONFIG.cores={};CONFIG.precos={};CONFIG.configuradorTecidos={};
    Object.entries(wave.tecidos).forEach(([nome,t])=>{
      if(t?.ativo===false)return;
      CONFIG.configuradorTecidos[nome]=t&&typeof t==='object'?t:{};
      CONFIG.cores[nome]=Array.isArray(t.cores)?t.cores:[];
      CONFIG.precos[nome]=t.forros&&typeof t.forros==="object"?t.forros:{};
    });
  }
  CONFIG.mediaConfigurador=Array.isArray(wave.midia)?wave.midia:[];
}

window.CONFIG=CONFIG;
window.CONFIG_READY=(async()=>{
  try{
    const [siteResp,waveResp]=await Promise.all([
      fetch('/api/store-config',{cache:'no-store'}),
      fetch('/api/configurators/wave',{cache:'no-store'})
    ]);
    if(siteResp.ok){const d=await siteResp.json();if(d?.ok&&d.config)mesclarConfig(CONFIG,d.config)}
    if(waveResp.ok){
      const d=await waveResp.json();
      if(d?.ok&&d.wave){
        aplicarWave(d.wave);
        console.info('Configurador Wave carregado do Admin:',d.source||'configurator_wave',d.updatedAt||'');
      }else{
        console.warn('API do configurador Wave respondeu sem configuração válida.',d);
      }
    }else{
      console.warn('Falha HTTP ao carregar /api/configurators/wave:',waveResp.status);
    }
  }catch(erro){
    console.warn('Configuração remota indisponível; usando fallback local.',erro);
  }
  return CONFIG;
})();
