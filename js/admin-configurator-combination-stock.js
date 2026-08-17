(function(){
  let estoqueCombinacoes={};

  function key(tecido,cor,forro){
    return [String(tecido||'').trim(),String(cor||'').trim(),String(forro||'').trim()].join('|||');
  }

  function readStock(tecido,cor,forro,fallback=true){
    const k=key(tecido,cor,forro);
    return Object.prototype.hasOwnProperty.call(estoqueCombinacoes,k)?estoqueCombinacoes[k]!==false:fallback!==false;
  }

  function writeStock(tecido,cor,forro,value){
    estoqueCombinacoes[key(tecido,cor,forro)]=Boolean(value);
  }

  if(typeof cfgInitMediaState==='function'){
    const originalInit=cfgInitMediaState;
    cfgInitMediaState=function(cfg){
      originalInit(cfg);
      estoqueCombinacoes={...(cfg?.estoqueCombinacoes||{})};
    };
  }

  if(typeof cfgOptionCardHtml==='function'){
    const originalCard=cfgOptionCardHtml;
    cfgOptionCardHtml=function(tecido,cor,forro,modelo,media,comEstoque){
      return originalCard(tecido,cor,forro,modelo,media,readStock(tecido,cor,forro,comEstoque));
    };
  }

  if(typeof collectConfigurator==='function'){
    const originalCollect=collectConfigurator;
    collectConfigurator=function(form,base,id){
      document.querySelectorAll('.cfg-option-media-card').forEach(card=>{
        const stock=card.querySelector('.cfg-tab-stock');
        if(stock)writeStock(card.dataset.tecido||'',card.dataset.cor||'',card.dataset.forro||'',stock.checked);
      });
      const data=originalCollect(form,base,id);
      data.estoqueCombinacoes={...estoqueCombinacoes};
      return data;
    };
  }

  if(typeof bindCfgOptionMedia==='function'){
    const originalBind=bindCfgOptionMedia;
    bindCfgOptionMedia=function(form,cfg){
      originalBind(form,cfg);
      form.querySelectorAll('.cfg-option-media-card').forEach(card=>{
        const stock=card.querySelector('.cfg-tab-stock');
        if(!stock)return;
        const tecido=card.dataset.tecido||'';
        const cor=card.dataset.cor||'';
        const forro=card.dataset.forro||'';
        const current=readStock(tecido,cor,forro,stock.checked);
        stock.checked=current;
        const label=stock.closest('.cfg-option-stock');
        label?.classList.toggle('is-out',!current);
        const span=label?.querySelector('span');
        if(span)span.textContent=current?'Com estoque':'Sem estoque';

        stock.onchange=async()=>{
          writeStock(tecido,cor,forro,stock.checked);
          label?.classList.toggle('is-out',!stock.checked);
          if(span)span.textContent=stock.checked?'Com estoque':'Sem estoque';
          const status=card.querySelector('.upload-status');
          try{
            if(status)status.textContent='Salvando disponibilidade...';
            await cfgSaveCurrent(form,cfg,ACTIVE_CONFIGURATOR_ID,false);
            if(status)status.textContent='Disponibilidade salva.';
          }catch(e){
            if(status)status.textContent=e.message;
            alert(e.message);
          }
        };
      });
    };
  }
})();