(function(){
  const esc=s=>String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  function url(p){
    if(p.pageType==='link'&&p.externalUrl)return p.externalUrl;
    if(p.pageType==='configurador'){
      const id=String(p.configuratorId||'');
      if(id==='persiana')return '/configurador-persiana?id=persiana';
      return '/configurador?id='+encodeURIComponent(id);
    }
    return '/pagina?slug='+encodeURIComponent(p.slug);
  }
  function removeLegacyHomeConfigurator(){const legacy=document.getElementById('configurador'),intro=document.querySelector('.home-configurator-intro');if(legacy)legacy.remove();if(intro)intro.remove()}
  function homeCard(p){
    const label=p.pageType==='produtos'?'Produtos':p.pageType==='configurador'?'Personalizado':p.pageType==='conteudo'?'Conteúdo':'';
    return `<article class="home-collection-card"><a class="home-collection-image" href="${esc(url(p))}">${p.heroImageUrl?`<img src="${esc(p.heroImageUrl)}" alt="${esc(p.title)}" loading="lazy">`:`<div class="home-card-placeholder">${esc((p.menuLabel||p.title||'').slice(0,2).toUpperCase()||'•')}</div>`}</a><div class="home-collection-body"><h3>${esc(p.title)}</h3>${label?`<span>${esc(label)}</span>`:''}<a class="home-collection-link" href="${esc(url(p))}">Ver opções</a></div></article>`;
  }
  function bindRetry(grid){const button=grid.querySelector('[data-retry-home-pages]');if(!button)return;button.addEventListener('click',()=>{button.disabled=true;button.textContent='Carregando…';Promise.resolve((window.RADZ_RELOAD_NAV||window.SALVATEX_RELOAD_NAV)?.()).catch(()=>{}).finally(()=>setTimeout(()=>{if(document.body.contains(button)){button.disabled=false;button.textContent='Tentar novamente'}},1000))})}
  function render(pages,{error=false}={}){
    const grid=document.getElementById('home-collections-grid');if(!grid)return;
    if(error){grid.innerHTML=`<div class="home-collections-empty"><strong>Não foi possível carregar as opções agora.</strong><br><span>Você pode tentar novamente sem recarregar a página.</span><br><button type="button" data-retry-home-pages style="margin-top:12px">Tentar novamente</button></div>`;bindRetry(grid);return}
    const visible=(Array.isArray(pages)?pages:[]).filter(p=>p.navGroup==='principal'&&!p.navParentId);
    grid.innerHTML=visible.length?visible.slice(0,8).map(homeCard).join(''):`<div class="home-collections-empty">Nenhuma opção publicada no momento.</div>`;
  }
  removeLegacyHomeConfigurator();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeLegacyHomeConfigurator,{once:true});
  window.addEventListener('radz:navigation-ready',e=>render(e.detail?.pages||[],{error:Boolean(e.detail?.error)}));
  window.addEventListener('salvatex:navigation-ready',e=>{if(!window.RADZ_RELOAD_NAV)render(e.detail?.pages||[],{error:Boolean(e.detail?.error)})});
  setTimeout(()=>{const grid=document.getElementById('home-collections-grid');if(grid&&/Carregando opções/i.test(grid.textContent||''))render([],{error:true})},5000);
})();
