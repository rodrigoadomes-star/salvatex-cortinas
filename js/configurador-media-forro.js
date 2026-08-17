(function(){
  if(typeof atualizarCores!=="function"||typeof obterMidiaAdmin!=="function")return;

  function temFoto(midia){
    if(!midia)return false;
    if(String(midia.capa||"").trim())return true;
    return Array.isArray(midia.imagens)&&midia.imagens.some(src=>String(src||"").trim());
  }

  function stockKey(tecido,cor,forro){
    return [String(tecido||'').trim(),String(cor||'').trim(),String(forro||'').trim()].join('|||');
  }

  function emEstoque(tecido,cor,forro,midia){
    const mapa=CONFIG.estoqueCombinacoes&&typeof CONFIG.estoqueCombinacoes==='object'?CONFIG.estoqueCombinacoes:{};
    const k=stockKey(tecido,cor,forro);
    if(Object.prototype.hasOwnProperty.call(mapa,k))return mapa[k]!==false;
    return midia?.estoque!==false;
  }

  function disponivel(cor,forro){
    const midia=obterMidiaAdmin(state.tecido,state.modelo,cor,forro);
    return !!midia&&temFoto(midia)&&emEstoque(state.tecido,cor,forro,midia);
  }

  function midiaExata(cor,forro){
    return obterMidiaAdmin(state.tecido,state.modelo,cor,forro==null?state.forro:forro);
  }

  function temFotoNaSelecao(cor){return disponivel(cor,state.forro);}

  function capaDaSelecao(cor){
    const midia=midiaExata(cor,state.forro);
    if(!midia||!emEstoque(state.tecido,cor,state.forro,midia)||!temFoto(midia))return "";
    return String(midia.capa||midia.imagens?.find(src=>String(src||"").trim())||"").trim();
  }

  function coresDoTecido(){
    const diretas=Array.isArray(CONFIG.cores?.[state.tecido])?CONFIG.cores[state.tecido]:[];
    if(diretas.length)return diretas;
    const tecidoConfig=CONFIG.configuradorTecidos?.[state.tecido]||{};
    if(Array.isArray(tecidoConfig.cores)&&tecidoConfig.cores.length)return tecidoConfig.cores;
    const lista=Array.isArray(CONFIG.mediaConfigurador)?CONFIG.mediaConfigurador:[];
    const tecidoBusca=normalizarChaveMidia(state.tecido);
    return [...new Set(lista.filter(item=>normalizarChaveMidia(item?.tecido)===tecidoBusca).map(item=>String(item?.cor||"").trim()).filter(Boolean))];
  }

  function temFotoParaForro(forro){
    return coresDoTecido().some(cor=>disponivel(cor,forro));
  }

  function forroDoCard(card){
    const dataset=String(card?.dataset?.value||card?.dataset?.forro||"").trim();
    if(dataset)return dataset;
    const strong=String(card?.querySelector("strong")?.textContent||"").trim();
    if(strong)return strong;
    return String(card?.textContent||"").trim().split("\n")[0].trim();
  }

  function atualizarForrosDisponiveis(){
    const container=document.getElementById("forros");
    if(!container)return false;
    const cards=[...container.querySelectorAll(".card")];
    let primeiroDisponivel=null;

    cards.forEach(card=>{
      const forro=forroDoCard(card);
      const ok=!!forro&&temFotoParaForro(forro);
      card.hidden=!ok;
      card.style.display=ok?"":"none";
      if(ok&&!primeiroDisponivel)primeiroDisponivel=card;
    });

    let aviso=container.querySelector(".forros-sem-foto");
    if(!primeiroDisponivel){
      if(!aviso){
        aviso=document.createElement("div");
        aviso.className="forros-sem-foto";
        aviso.textContent="Nenhuma opção de forro disponível para este modelo e tecido no momento.";
        container.appendChild(aviso);
      }
      state.forro="";
      cards.forEach(card=>card.classList.remove("selected"));
      return false;
    }

    if(aviso)aviso.remove();
    const selecionado=cards.find(card=>!card.hidden&&normalizarForroMidia(forroDoCard(card))===normalizarForroMidia(state.forro));
    if(!selecionado){
      cards.forEach(card=>card.classList.remove("selected"));
      primeiroDisponivel.classList.add("selected");
      state.forro=forroDoCard(primeiroDisponivel);
    }else{
      cards.forEach(card=>card.classList.toggle("selected",card===selecionado));
      state.forro=forroDoCard(selecionado);
    }
    return true;
  }

  atualizarCores=function(){
    const container=document.getElementById("cores-choice");
    if(!container)return;
    const todasCores=CONFIG.cores?.[state.tecido]||[];
    const cores=todasCores.filter(cor=>temFotoNaSelecao(cor));
    if(!cores.includes(state.cor))state.cor=cores[0]||"";
    container.innerHTML="";

    if(!cores.length){
      const aviso=document.createElement("div");
      aviso.className="cores-sem-foto";
      aviso.textContent="Nenhuma cor disponível para este forro no momento.";
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
  if(forros)forros.addEventListener("click",e=>{
    const card=e.target.closest(".card");
    if(!card||card.hidden)return;
    const valor=forroDoCard(card);
    if(valor)state.forro=valor;
    setTimeout(sincronizarTudo,0);
  });

  const modelos=document.getElementById("modelos");
  if(modelos)modelos.addEventListener("click",e=>{if(e.target.closest(".card"))setTimeout(sincronizarTudo,0);});
  const tecidos=document.getElementById("tecidos-choice");
  if(tecidos)tecidos.addEventListener("click",e=>{if(e.target.closest(".card"))setTimeout(sincronizarTudo,0);});
  Promise.resolve(window.CONFIG_READY).then(()=>setTimeout(sincronizarTudo,0)).catch(()=>{});
})();
