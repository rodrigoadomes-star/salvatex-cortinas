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
  function normalizarUrlMidia(value){
    const src=texto(value);
    if(!src)return "";
    try{
      const u=new URL(src,location.origin);
      const host=u.hostname.toLowerCase();
      if((host==="salvatex-cortinas.pages.dev"||host.endsWith(".salvatex-cortinas.pages.dev"))&&u.pathname.startsWith("/media/")){
        return u.pathname+u.search;
      }
    }catch(_){}
    return src;
  }
  function imagens(item){return Array.isArray(item?.imagens)?item.imagens.map(normalizarUrlMidia).filter(Boolean):[];}

  obterMidiaAdmin=function(tecido,modelo,cor,forro){
    const lista=Array.isArray(CONFIG?.mediaConfigurador)?CONFIG.mediaConfigurador:[];
    const t=normalizarChaveMidia(tecido);
    const m=canonModelo(modelo||CONFIG?.configurador?.modelo||"");
    const c=normalizarChaveMidia(cor);
    const f=canonForro(forro);

    // Cada endpoint de configurador devolve somente a sua configuração.
    // O último registro da combinação é a fonte de verdade. Isso impede que
    // fotos antigas voltem depois de uma exclusão quando existem duplicatas
    // legadas no JSON salvo no D1.
    const base=lista.filter(item=>
      normalizarChaveMidia(item?.tecido)===t&&
      normalizarChaveMidia(item?.cor)===c&&
      canonForro(item?.forro)===f
    );
    if(!base.length)return null;

    const exatos=base.filter(item=>canonModelo(item?.modelo||"")===m);
    const fonte=(exatos.length?exatos:base).at(-1);
    if(!fonte)return null;

    return {
      ...fonte,
      tecido:fonte?.tecido||tecido,
      modelo:modelo||fonte?.modelo||"",
      cor:fonte?.cor||cor,
      forro:fonte?.forro||forro,
      estoque:typeof fonte?.estoque==="boolean"?fonte.estoque:true,
      capa:normalizarUrlMidia(fonte?.capa),
      video:normalizarUrlMidia(fonte?.video),
      imagens:[...new Set(imagens(fonte))]
    };
  };

  obterCapaCorAdmin=function(tecido,cor){
    const item=obterMidiaAdmin(tecido,state?.modelo||CONFIG?.configurador?.modelo||"Wave",cor,state?.forro||"");
    return item&&item.estoque!==false?(normalizarUrlMidia(item.capa)||imagens(item)[0]||""):"";
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
