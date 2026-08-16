(function(){
  if(typeof atualizarCores!=="function"||typeof obterMidiaAdmin!=="function")return;

  function midiaDaSelecao(cor){
    return obterMidiaAdmin(state.tecido,state.modelo,cor,state.forro);
  }

  function temFotoNaSelecao(cor){
    const midia=midiaDaSelecao(cor);
    if(!midia)return false;
    if(String(midia.capa||"").trim())return true;
    return Array.isArray(midia.imagens)&&midia.imagens.some(src=>String(src||"").trim());
  }

  function capaDaSelecao(cor){
    const midia=midiaDaSelecao(cor);
    if(!midia)return "";
    return String(midia.capa||midia.imagens?.find(src=>String(src||"").trim())||"").trim();
  }

  atualizarCores=function(){
    const container=document.getElementById("cores-choice");
    if(!container)return;

    const todasCores=CONFIG.cores?.[state.tecido]||[];
    const tecidoConfig=CONFIG.configuradorTecidos?.[state.tecido]||{};
    const coresAtivas=tecidoConfig.coresAtivas&&typeof tecidoConfig.coresAtivas==="object"?tecidoConfig.coresAtivas:{};

    const cores=todasCores.filter(cor=>coresAtivas[cor]!==false&&temFotoNaSelecao(cor));

    if(!cores.includes(state.cor))state.cor=cores[0]||"";
    container.innerHTML="";

    if(!cores.length){
      const aviso=document.createElement("div");
      aviso.className="cores-sem-foto";
      aviso.textContent="Nenhuma cor com foto para este forro no momento.";
      container.appendChild(aviso);
      previewIndex=0;
      fotosCarrosselAtuais=[];
      atualizarPreview();
      atualizarOrcamento();
      return;
    }

    cores.forEach(cor=>{
      const card=document.createElement("div");
      card.className="card card-cor"+(state.cor===cor?" selected":"");
      card.dataset.value=cor;

      const capa=capaDaSelecao(cor);
      if(capa){
        const imagem=document.createElement("img");
        imagem.className="card-cor-img";
        imagem.src=capa;
        imagem.alt=`${state.tecido} ${cor} - ${state.forro}`;
        imagem.loading="lazy";
        imagem.addEventListener("error",()=>card.remove());
        card.appendChild(imagem);
      }

      const strong=document.createElement("strong");
      strong.textContent=cor;
      card.appendChild(strong);

      card.addEventListener("click",async()=>{
        container.querySelectorAll(".card").forEach(item=>item.classList.remove("selected"));
        card.classList.add("selected");
        state.cor=cor;
        atualizarOrcamento();
        previewIndex=0;
        await carregarFotosCarrossel();
      });

      container.appendChild(card);
    });

    atualizarOrcamento();
  };

  function sincronizarDepoisDaTroca(){
    atualizarCores();
    previewIndex=0;
    Promise.resolve(carregarFotosCarrossel()).catch(()=>{});
  }

  const forros=document.getElementById("forros");
  if(forros){
    forros.addEventListener("click",e=>{
      if(!e.target.closest(".card"))return;
      setTimeout(sincronizarDepoisDaTroca,0);
    });
  }

  const modelos=document.getElementById("modelos");
  if(modelos){
    modelos.addEventListener("click",e=>{
      if(!e.target.closest(".card"))return;
      setTimeout(sincronizarDepoisDaTroca,0);
    });
  }

  Promise.resolve(window.CONFIG_READY).then(()=>setTimeout(sincronizarDepoisDaTroca,0)).catch(()=>{});
})();
