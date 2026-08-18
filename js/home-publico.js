(function(){

  const esc=s=>String(s??"").replace(/[&<>'\"]/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"
  }[c]));

  function url(p){
    const type=String(p?.pageType||'');
    if(type==='configurador_wave')return '/configurador?id=wave';
    if(type==='configurador_prega_macho')return '/configurador?id=prega-macho';
    if(type==='configurador_ilhos')return '/configurador?id=cortina-varao';
    if(type==='configurador_persiana')return '/configurador-persiana?id=persiana';
    return '/pagina?slug='+encodeURIComponent(p.slug);
  }

  function removeLegacyHomeConfigurator(){
    // A home antiga ainda continha uma cópia estática do configurador Wave.
    // O configurador oficial é /configurador?id=wave e recebe as regras,
    // mídias e disponibilidade atuais do backend. Mantemos apenas uma fonte.
    const legacy=document.getElementById('configurador');
    const intro=document.querySelector('.home-configurator-intro');
    if(legacy)legacy.remove();
    if(intro)intro.remove();
  }

  function homeCard(p){
    const label=p.navGroup==="pronta_entrega"?"Pronta entrega":"Sob medida";
    return `<article class="home-collection-card">
      <a class="home-collection-image" href="${url(p)}">
        ${p.heroImageUrl
          ? `<img src="${esc(p.heroImageUrl)}" alt="${esc(p.title)}" loading="lazy">`
          : `<div class="home-card-placeholder">SALVATEX</div>`}
      </a>
      <div class="home-collection-body">
        <h3>${esc(p.title)}</h3>
        <span>${label}</span>
        <a class="home-collection-link" href="${url(p)}">Ver opções</a>
      </div>
    </article>`;
  }

  function bindRetry(grid){
    const button=grid.querySelector('[data-retry-home-pages]');
    if(!button)return;
    button.addEventListener('click',()=>{
      button.disabled=true;
      button.textContent='Carregando…';
      Promise.resolve(window.SALVATEX_RELOAD_NAV?.()).catch(()=>{}).finally(()=>{
        setTimeout(()=>{if(document.body.contains(button)){button.disabled=false;button.textContent='Tentar novamente'}},1000);
      });
    });
  }

  function render(pages,{error=false}={}){
    const grid=document.getElementById("home-collections-grid");
    if(!grid)return;

    if(error){
      grid.innerHTML=`<div class="home-collections-empty">
        <strong>Não foi possível carregar as opções agora.</strong><br>
        <span>Você pode tentar novamente sem recarregar a página.</span><br>
        <button type="button" data-retry-home-pages style="margin-top:12px">Tentar novamente</button>
      </div>`;
      bindRetry(grid);
      return;
    }

    const sobMedida=(Array.isArray(pages)?pages:[]).filter(p=>
      p.navGroup==="cortinas_sob_medida" ||
      p.navGroup==="persianas_sob_medida"
    );

    grid.innerHTML=sobMedida.length
      ? sobMedida.slice(0,8).map(homeCard).join("")
      : `<div class="home-collections-empty">
          Nenhuma opção publicada no momento.
        </div>`;
  }

  removeLegacyHomeConfigurator();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeLegacyHomeConfigurator,{once:true});

  window.addEventListener("salvatex:navigation-ready",e=>{
    render(e.detail?.pages||[],{error:Boolean(e.detail?.error)});
  });

  // Proteção contra spinner/texto eterno caso algum script anterior falhe antes
  // de emitir o evento de navegação.
  setTimeout(()=>{
    const grid=document.getElementById('home-collections-grid');
    if(!grid)return;
    if(/Carregando opções/i.test(grid.textContent||''))render([],{error:true});
  },5000);

})();