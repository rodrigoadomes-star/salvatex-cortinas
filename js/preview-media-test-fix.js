(function(){
  const host=String(location.hostname||'').toLowerCase();
  const isPreview=host.endsWith('.salvatex-cortinas.pages.dev')&&host!=='salvatex-cortinas.pages.dev';
  if(!isPreview)return;

  Promise.resolve(window.CONFIG_READY).then(function(){
    const lista=Array.isArray(CONFIG.mediaConfigurador)?CONFIG.mediaConfigurador:[];

    const naturalTeste=lista.find(function(item){
      return String(item.modelo||'').trim()==='Wave'&&
        String(item.tecido||'').trim()==='Gaze de Linho'&&
        String(item.cor||'').trim()==='Natural'&&
        String(item.forro||'').trim()==='Sem forro';
    });

    if(!naturalTeste)return;

    const imagem=String(naturalTeste.capa||naturalTeste.imagens?.[0]||'').trim();
    if(!imagem)return;

    CONFIG.mediaConfigurador=lista.filter(function(item){
      return item!==naturalTeste;
    });

    CONFIG.mediaConfigurador.push({
      modelo:'Wave',
      tecido:'Gaze de Linho',
      cor:'Branco',
      forro:'Sem forro',
      capa:imagem,
      imagens:[imagem]
    });

    if(Array.isArray(CONFIG.cores?.['Gaze de Linho'])&&!CONFIG.cores['Gaze de Linho'].includes('Branco')){
      CONFIG.cores['Gaze de Linho'].push('Branco');
    }
  }).catch(function(){});
})();
