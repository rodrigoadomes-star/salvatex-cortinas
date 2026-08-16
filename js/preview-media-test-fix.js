(function(){
  const host=String(location.hostname||'').toLowerCase();
  const isPreview=host.endsWith('.salvatex-cortinas.pages.dev')&&host!=='salvatex-cortinas.pages.dev';
  if(!isPreview)return;

  const id=String(new URLSearchParams(location.search).get('id')||'wave').trim().toLowerCase();

  Promise.resolve(window.CONFIG_READY).then(function(){
    if(!window.CONFIG)return;

    if(id==='cortina-varao'){
      const tecido='Gaze de Linho';
      const cor='Branco';
      const forro='Forro leve';
      const modelo='Ilhós';
      const imagem='/imagens/testes/preview-ilhos.jpg?v=20260816-1';

      CONFIG.cores=CONFIG.cores||{};
      CONFIG.cores[tecido]=Array.isArray(CONFIG.cores[tecido])?CONFIG.cores[tecido]:[];
      if(!CONFIG.cores[tecido].includes(cor))CONFIG.cores[tecido].push(cor);

      CONFIG.configuradorTecidos=CONFIG.configuradorTecidos||{};
      CONFIG.configuradorTecidos[tecido]=CONFIG.configuradorTecidos[tecido]||{};
      CONFIG.configuradorTecidos[tecido].coresAtivas=CONFIG.configuradorTecidos[tecido].coresAtivas||{};
      CONFIG.configuradorTecidos[tecido].coresAtivas[cor]=true;

      const lista=Array.isArray(CONFIG.mediaConfigurador)?CONFIG.mediaConfigurador:[];
      CONFIG.mediaConfigurador=lista.filter(function(item){
        return !(String(item.modelo||'').trim()===modelo&&String(item.tecido||'').trim()===tecido&&String(item.cor||'').trim()===cor&&String(item.forro||'').trim()===forro);
      });

      CONFIG.mediaConfigurador.push({
        modelo:modelo,
        tecido:tecido,
        cor:cor,
        forro:forro,
        capa:imagem,
        imagens:[imagem]
      });

      window.__SALVATEX_PREVIEW_MEDIA_TEST__={modelo,tecido,cor,forro,valid:true,forced:true};

      function aplicar(){
        if(typeof state==='object'){
          state.modelo=modelo;
          state.tecido=tecido;
          state.forro=forro;
          state.cor=cor;
        }
        if(typeof atualizarCores==='function')atualizarCores();
        if(typeof atualizarOrcamento==='function')atualizarOrcamento();
        if(typeof carregarFotosCarrossel==='function')Promise.resolve(carregarFotosCarrossel()).catch(function(){});
      }

      setTimeout(aplicar,0);
      setTimeout(aplicar,120);
      return;
    }

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

    CONFIG.mediaConfigurador=lista.filter(function(item){return item!==naturalTeste;});
    CONFIG.mediaConfigurador.push({modelo:'Wave',tecido:'Gaze de Linho',cor:'Branco',forro:'Sem forro',capa:imagem,imagens:[imagem]});

    if(Array.isArray(CONFIG.cores?.['Gaze de Linho'])&&!CONFIG.cores['Gaze de Linho'].includes('Branco')){
      CONFIG.cores['Gaze de Linho'].push('Branco');
    }
  }).catch(function(){});
})();
