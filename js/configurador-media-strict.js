(function(){
  if(typeof normalizarChaveMidia!=="function")return;

  function canonModelo(valor){
    const n=normalizarChaveMidia(valor||"");
    if(n.includes("prega macho"))return "prega macho";
    if(n.includes("ilhos")||n.includes("varao"))return "ilhos";
    if(n.includes("wave"))return "wave";
    return n.replace(/\bcortina\b/g,"").replace(/\b(de|do|da)\b/g,"").replace(/\s+/g," ").trim();
  }

  function canonForro(valor){
    const n=normalizarChaveMidia(valor||"");
    if(!n||n.includes("sem forro"))return "sem forro";
    if(n.includes("peletizado")&&n.includes("50"))return "peletizado 50";
    if(n.includes("blackout")&&n.includes("100"))return "blackout 100";
    if(n.includes("blackout")&&n.includes("80"))return "blackout 80";
    if(n.includes("leve"))return "leve";
    return n.replace(/\bforro\b/g,"").replace(/\bvedacao\b/g,"").replace(/\bem\b/g,"").replace(/\btecido\b/g,"").replace(/\s+/g," ").trim();
  }

  function texto(v){return String(v||"").trim();}
  function imagens(item){return Array.isArray(item?.imagens)?item.imagens.map(texto).filter(Boolean):[];}
  function temConteudo(item){return Boolean(texto(item?.capa)||texto(item?.video)||imagens(item).length);}

  obterMidiaAdmin=function(tecido,modelo,cor,forro){
    const lista=Array.isArray(CONFIG?.mediaConfigurador)?CONFIG.mediaConfigurador:[];
    const t=normalizarChaveMidia(tecido);
    const m=canonModelo(modelo||"Wave");
    const c=normalizarChaveMidia(cor);
    const f=canonForro(forro);

    // A API já entrega apenas o configurador atual. Por isso, primeiro tentamos
    // o modelo exato e, se os registros antigos estiverem sem modelo ou com
    // nomenclatura antiga, usamos a mesma combinação de tecido/cor/forro como fallback.
    const base=lista.filter(item=>
      normalizarChaveMidia(item?.tecido)===t&&
      normalizarChaveMidia(item?.cor)===c&&
      canonForro(item?.forro)===f
    );

    if(!base.length)return null;

    const exatos=base.filter(item=>canonModelo(item?.modelo||"")===m);
    const exatosComConteudo=exatos.filter(temConteudo);
    const baseComConteudo=base.filter(temConteudo);

    const encontrados=
      exatosComConteudo.length?exatosComConteudo:
      baseComConteudo.length?baseComConteudo:
      exatos.length?exatos:
      base;

    const fonte=encontrados.at(-1);
    const todasImagens=[];
    encontrados.forEach(item=>imagens(item).forEach(src=>{if(!todasImagens.includes(src))todasImagens.push(src);}));

    const estoqueExplicito=[...encontrados].reverse().find(item=>typeof item?.estoque==="boolean");
    const estoque=estoqueExplicito?estoqueExplicito.estoque:true;

    return {
      ...fonte,
      tecido:fonte?.tecido||tecido,
      modelo:modelo||fonte?.modelo||"",
      cor:fonte?.cor||cor,
      forro:fonte?.forro||forro,
      estoque,
      capa:[...encontrados].reverse().map(x=>texto(x?.capa)).find(Boolean)||"",
      video:[...encontrados].reverse().map(x=>texto(x?.video)).find(Boolean)||"",
      imagens:todasImagens
    };
  };

  obterCapaCorAdmin=function(tecido,cor){
    const item=obterMidiaAdmin(tecido,state?.modelo||"Wave",cor,state?.forro||"");
    return item&&item.estoque!==false?(texto(item.capa)||imagens(item)[0]||""):"";
  };

  Promise.resolve(window.CONFIG_READY).then(()=>{
    setTimeout(()=>{
      try{
        if(typeof atualizarCores==="function")atualizarCores();
        if(typeof carregarFotosCarrossel==="function"){
          previewIndex=0;
          Promise.resolve(carregarFotosCarrossel()).catch(()=>{});
        }
      }catch(error){console.error("strict configurator media",error);}
    },0);
  }).catch(()=>{});
})();
