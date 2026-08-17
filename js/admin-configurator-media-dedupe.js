(function(){
  function key(item){
    return [
      String(item?.tecido||'').trim(),
      String(item?.cor||'').trim(),
      String(item?.forro||'').trim()
    ].join('|||');
  }

  function clone(item={}){
    return {
      tecido:String(item.tecido||''),
      modelo:String(item.modelo||''),
      cor:String(item.cor||''),
      forro:String(item.forro||''),
      capa:String(item.capa||''),
      imagens:Array.isArray(item.imagens)?[...new Set(item.imagens.map(x=>String(x||'').trim()).filter(Boolean))]:[],
      video:String(item.video||'')
    };
  }

  function dedupe(list){
    const map=new Map();
    (Array.isArray(list)?list:[]).forEach(item=>{
      const k=key(item);
      if(k==='||||||')return;
      // O último registro salvo para a combinação é autoritativo.
      // Isso preserva exclusões de capa/galeria/vídeo e impede que mídia
      // antiga reapareça por causa de duplicatas históricas no D1.
      if(map.has(k))map.delete(k);
      map.set(k,clone(item));
    });
    return [...map.values()];
  }

  if(typeof cfgInitMediaState==='function'){
    const originalInit=cfgInitMediaState;
    cfgInitMediaState=function(cfg){
      if(cfg&&typeof cfg==='object'&&Array.isArray(cfg.midia)){
        cfg={...cfg,midia:dedupe(cfg.midia)};
      }
      originalInit(cfg);
      if(Array.isArray(CONFIG_MEDIA_STATE))CONFIG_MEDIA_STATE=dedupe(CONFIG_MEDIA_STATE);
    };
  }

  if(typeof cfgFindMedia==='function'){
    cfgFindMedia=function(tecido,cor,forro,modelo=''){
      const wanted=[String(tecido||'').trim(),String(cor||'').trim(),String(forro||'').trim()].join('|||');
      if(Array.isArray(CONFIG_MEDIA_STATE))CONFIG_MEDIA_STATE=dedupe(CONFIG_MEDIA_STATE);
      let item=[...(CONFIG_MEDIA_STATE||[])].reverse().find(x=>key(x)===wanted);
      if(!item){
        item={tecido,modelo,cor,forro,capa:'',imagens:[],video:''};
        CONFIG_MEDIA_STATE.push(item);
      }
      if(modelo)item.modelo=String(modelo);
      return item;
    };
  }

  if(typeof collectConfigurator==='function'){
    const originalCollect=collectConfigurator;
    collectConfigurator=function(form,base,id){
      if(Array.isArray(CONFIG_MEDIA_STATE))CONFIG_MEDIA_STATE=dedupe(CONFIG_MEDIA_STATE);
      const data=originalCollect(form,base,id);
      if(data&&Array.isArray(data.midia))data.midia=dedupe(data.midia);
      return data;
    };
  }

  window.RADZ_CONFIGURATOR_MEDIA_DEDUPE={dedupe};
})();
