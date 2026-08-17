(function(){
  function boolStock(item){return item?.estoque!==false;}

  if(typeof cfgCloneMediaItem==='function'){
    const originalClone=cfgCloneMediaItem;
    cfgCloneMediaItem=function(item={}){
      const out=originalClone(item);
      out.estoque=item?.estoque!==false;
      return out;
    };
  }

  if(typeof cfgOptionCardHtml==='function'){
    const originalCard=cfgOptionCardHtml;
    cfgOptionCardHtml=function(tecido,cor,forro,modelo,media,comEstoque){
      return originalCard(tecido,cor,forro,modelo,media,boolStock(media));
    };
  }

  if(typeof cfgSyncMediaStateFromDom==='function'){
    const originalSync=cfgSyncMediaStateFromDom;
    cfgSyncMediaStateFromDom=function(){
      originalSync();
      document.querySelectorAll('.cfg-option-media-card').forEach(card=>{
        const item=cfgFindMedia(
          card.dataset.tecido||'',
          card.dataset.cor||'',
          card.dataset.forro||'',
          card.dataset.modelo||''
        );
        const stock=card.querySelector('.cfg-tab-stock');
        if(stock)item.estoque=Boolean(stock.checked);
      });
    };
  }

  if(typeof bindCfgOptionMedia==='function'){
    const originalBind=bindCfgOptionMedia;
    bindCfgOptionMedia=function(form,cfg){
      originalBind(form,cfg);
      form.querySelectorAll('.cfg-option-media-card').forEach(card=>{
        const stock=card.querySelector('.cfg-tab-stock');
        if(!stock)return;
        stock.onchange=async()=>{
          const label=stock.closest('.cfg-option-stock');
          label?.classList.toggle('is-out',!stock.checked);
          const span=label?.querySelector('span');
          if(span)span.textContent=stock.checked?'Com estoque':'Sem estoque';
          const item=cfgFindMedia(
            card.dataset.tecido||'',
            card.dataset.cor||'',
            card.dataset.forro||'',
            card.dataset.modelo||''
          );
          item.estoque=Boolean(stock.checked);
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
