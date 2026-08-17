(function(){
  let estoqueCombinacoes={};
  let rebindTimer=0;

  function key(tecido,cor,forro){
    return [String(tecido||'').trim(),String(cor||'').trim(),String(forro||'').trim()].join('|||');
  }

  function readStock(tecido,cor,forro,fallback=true){
    const k=key(tecido,cor,forro);
    return Object.prototype.hasOwnProperty.call(estoqueCombinacoes,k)
      ? estoqueCombinacoes[k]!==false
      : fallback!==false;
  }

  function writeStock(tecido,cor,forro,value){
    estoqueCombinacoes[key(tecido,cor,forro)]=Boolean(value);
  }

  function applyLabel(stock,current){
    const label=stock.closest('.cfg-option-stock');
    label?.classList.toggle('is-out',!current);
    const span=label?.querySelector('span');
    if(span)span.textContent=current?'Com estoque':'Sem estoque';
  }

  function bindCardStock(form,card){
    let stock=card.querySelector('.cfg-tab-stock');
    if(!stock)return;

    const tecido=card.dataset.tecido||'';
    const cor=card.dataset.cor||'';
    const forro=card.dataset.forro||'';
    const current=readStock(tecido,cor,forro,stock.checked);

    // Remove apenas o listener legado deste checkbox de combinação.
    // A página Geral continua independente e continua controlando a cor inteira.
    const clean=stock.cloneNode(true);
    stock.replaceWith(clean);
    stock=clean;
    stock.checked=current;
    applyLabel(stock,current);

    stock.addEventListener('change',async e=>{
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      writeStock(tecido,cor,forro,stock.checked);
      applyLabel(stock,stock.checked);

      const status=card.querySelector('.upload-status');
      try{
        if(status)status.textContent='Salvando disponibilidade...';
        const cfg=(typeof CONFIG_CURRENT_DATA!=='undefined'&&CONFIG_CURRENT_DATA)||{};
        await cfgSaveCurrent(form,cfg,ACTIVE_CONFIGURATOR_ID,false);
        if(status)status.textContent='Disponibilidade salva.';
      }catch(err){
        if(status)status.textContent=err.message;
        alert(err.message);
      }
    },true);
  }

  function bindExistingCards(){
    clearTimeout(rebindTimer);
    rebindTimer=setTimeout(()=>{
      const form=document.querySelector('#cfg-form');
      if(!form)return;
      form.querySelectorAll('.cfg-option-media-card').forEach(card=>bindCardStock(form,card));
    },0);
  }

  if(typeof cfgInitMediaState==='function'){
    const originalInit=cfgInitMediaState;
    cfgInitMediaState=function(cfg){
      originalInit(cfg);
      estoqueCombinacoes={...(cfg?.estoqueCombinacoes||{})};
      setTimeout(bindExistingCards,0);
    };
  }

  if(typeof cfgOptionCardHtml==='function'){
    const originalCard=cfgOptionCardHtml;
    cfgOptionCardHtml=function(tecido,cor,forro,modelo,media,comEstoque){
      return originalCard(
        tecido,
        cor,
        forro,
        modelo,
        media,
        readStock(tecido,cor,forro,comEstoque)
      );
    };
  }

  if(typeof collectConfigurator==='function'){
    const originalCollect=collectConfigurator;
    collectConfigurator=function(form,base,id){
      // Salva o estado específico de cada combinação.
      form.querySelectorAll('.cfg-option-media-card').forEach(card=>{
        const stock=card.querySelector('.cfg-tab-stock');
        if(stock){
          writeStock(
            card.dataset.tecido||'',
            card.dataset.cor||'',
            card.dataset.forro||'',
            stock.checked
          );
        }
      });

      // O coletor original continua salvando normalmente coresAtivas da página Geral.
      const data=originalCollect(form,base,id);
      data.estoqueCombinacoes={...estoqueCombinacoes};
      return data;
    };
  }

  if(typeof bindCfgOptionMedia==='function'){
    const originalBind=bindCfgOptionMedia;
    bindCfgOptionMedia=function(form,cfg){
      originalBind(form,cfg);
      form.querySelectorAll('.cfg-option-media-card').forEach(card=>bindCardStock(form,card));
    };
  }

  bindExistingCards();
  setTimeout(bindExistingCards,150);
  setTimeout(bindExistingCards,600);

  const observer=new MutationObserver(()=>bindExistingCards());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();