(function(){

  const esc=s=>String(s??"").replace(/[&<>'"]/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[c]));

  const url=p=>"pagina.html?slug="+encodeURIComponent(p.slug);

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

  function render(pages){
    const grid=document.getElementById("home-collections-grid");
    if(!grid)return;

    const sobMedida=pages.filter(p=>
      p.navGroup==="cortinas_sob_medida" ||
      p.navGroup==="persianas_sob_medida"
    );

    grid.innerHTML=sobMedida.length
      ? sobMedida.slice(0,8).map(homeCard).join("")
      : `<div class="home-collections-empty">
          Crie suas páginas no Painel Admin e selecione onde elas devem aparecer no menu.
        </div>`;
  }

  window.addEventListener("salvatex:navigation-ready",e=>{
    render(e.detail?.pages||[]);
  });

})();