(function(){
  if(typeof atualizarCores!=="function"||typeof obterMidiaAdmin!=="function")return;

  function midiaDaSelecao(cor){
    return obterMidiaAdmin(state.tecido,state.modelo,cor,state.forro);
  }

  function temFoto(midia){
    if(!midia)return false;
    if(String(midia.capa||"").trim())return true;
    return Array.isArray(midia.imagens)&&midia.imagens.some(src=>String(src||"").trim());
  }

  function temFotoNaSelecao(cor){
    return temFoto(midiaDaSelecao(cor));
  }

  function capaDaSelecao(cor){
    const midia=midiaDaSelecao(cor);
    if(!midia)return "";
    return String(midia.capa||midia.imagens?.find(src=>String(src||"").trim())||"").trim();
  }

  function temFotoParaForro(forro){
    const lista=Array.isArray(CONFIG.mediaConfigurador)?CONFIG.mediaConfigurador:[];
    const tecidoBusca=normalizarChaveMidia(state.tecido);
    const modeloBusca=normalizarChaveMidia(state.modelo||"Wave");
    const forroBusca=normalizarForroMidia(forro);

    return lista.some(item=>{
      return normalizarChaveMidia(item.tecido)===tecidoBusca&&
        normalizarChaveMidia(item.modelo||"Wave")===modeloBusca&&
        normalizarForroMidia(item.forro)===forroBusca&&
        temFoto(item);
    });
  }

  function atualizarForrosDisponiveis(){
    const container=document.getElementById("forros");
    if(!container)return;

    const cards=[...container.querySelectorAll(".card[data-value]")];
    let primeiroDisponivel=null;

    cards.forEach(card=>{
      const forro=String(card.dataset.value||"").trim();
      const disponivel=temFotoParaForro(forro);
      card.hidden=!disponivel;
      card.style.display=disponivel?"":"none";
      if(disponivel&&!primeiroDisponivel)primeiroDisponivel=card;
    });

    let aviso=container.querySelector(".forros-sem-foto");
    if(!primeiroDisponivel){
      if(!aviso){
        aviso=document.createElement("div");
        aviso.className="forros-sem-foto";
        aviso.textContent="Nenhuma opção de forro com foto disponível para este modelo e tecido no momento.";
        container.appendChild(aviso);
      }
      state.forro="";
      cards.forEach(card=>card.classList.remove("selected"));
      return false;
    }

    if(aviso)aviso.remove();

    const selecionado=cards.find(card=>!card.hidden&&String(card.dataset.value||"").trim()===state.forro);
    if(!selecionado){
      cards.forEach(card=>card.classList.remove("selected"));
      primeiroDisponivel.classList.add("selected");
      state.forro=String(primeiroDisponivel.dataset.value||"").trim();
    }else{
      cards.forEach(card=>card.classList.toggle("selected",card===selecionado));
    }

    return true;
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

  function sincronizarTudo(){
    const temForro=atualizarForrosDisponiveis();
    atualizarCores();
    previewIndex=0;
    if(temForro)Promise.resolve(carregarFotosCarrossel()).catch(()=>{});
  }

  const forros=document.getElementById("forros");
  if(forros){
    forros.addEventListener("click",e=>{
      const card=e.target.closest(".card[data-value]");
      if(!card||card.hidden)return;
      setTimeout(sincronizarTudo,0);
    });
  }

  const modelos=document.getElementById("modelos");
  if(modelos){
    modelos.addEventListener("click",e=>{
      if(!e.target.closest(".card"))return;
      setTimeout(sincronizarTudo,0);
    });
  }

  const tecidos=document.getElementById("tecidos-choice");
  if(tecidos){
    tecidos.addEventListener("click",e=>{
      if(!e.target.closest(".card"))return;
      setTimeout(sincronizarTudo,0);
    });
  }

  Promise.resolve(window.CONFIG_READY).then(()=>setTimeout(sincronizarTudo,0)).catch(()=>{});
})();
