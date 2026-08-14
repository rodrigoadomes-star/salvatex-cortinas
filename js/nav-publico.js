(function(){

  const GROUPS={
    cortinas_sob_medida:"Cortinas sob medida",
    persianas_sob_medida:"Persianas sob medida",
    pronta_entrega:"Pronta entrega"
  };

  const esc=s=>String(s??"").replace(/[&<>'"]/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[c]));

  function pageUrl(p){
    const type=String(p?.pageType||'');

    if(type==='configurador_wave'){
      return 'configurador.html?id=wave';
    }

    if(type==='configurador_prega_macho'){
      return 'configurador.html?id=prega-macho';
    }

    if(type==='configurador_ilhos'){
      return 'configurador.html?id=cortina-varao';
    }

    if(type==='configurador_persiana'){
      return 'configurador-persiana.html?id=persiana';
    }

    return 'pagina.html?slug='+encodeURIComponent(p.slug);
  }

  function card(p){
    return `<a class="mega-product-card" href="${pageUrl(p)}">
      <div class="mega-product-image">
        ${p.heroImageUrl
          ? `<img src="${esc(p.heroImageUrl)}" alt="${esc(p.title)}" loading="lazy">`
          : `<span>SALVATEX</span>`}
      </div>
      <div>
        <strong>${esc(p.title)}</strong>
        <small>${p.navGroup==="pronta_entrega"?"Pronta entrega":"Sob medida"}</small>
      </div>
    </a>`;
  }

  function readyRow(p){
    return `<a class="mega-ready-row" href="${pageUrl(p)}">
      <div class="mega-ready-thumb">
        ${p.heroImageUrl
          ? `<img src="${esc(p.heroImageUrl)}" alt="" loading="lazy">`
          : `<span>STX</span>`}
      </div>
      <div>
        <strong>${esc(p.title)}</strong>
        <small>Pronta entrega</small>
      </div>
      <span class="mega-arrow">›</span>
    </a>`;
  }

  function menuCortinas(cortinas,ready){
    return `<div class="mega-menu mega-menu-cortinas">
      <div class="mega-main">
        <div class="mega-kicker">CORTINAS SOB MEDIDA</div>
        <div class="mega-card-grid">
          ${cortinas.length
            ? cortinas.slice(0,6).map(card).join("")
            : `<div class="mega-empty">Cadastre páginas no Admin e marque “Cortinas sob medida”.</div>`}
        </div>
      </div>

      <div class="mega-ready">
        <div class="mega-kicker">PRODUTOS PRONTA ENTREGA</div>
        <div class="mega-ready-list">
          ${ready.length
            ? ready.slice(0,6).map(readyRow).join("")
            : `<div class="mega-empty">Nenhuma página de pronta entrega publicada.</div>`}
        </div>
      </div>
    </div>`;
  }

  function menuPersianas(persianas){
    return `<div class="mega-menu mega-menu-persianas">
      <div class="mega-main mega-main-full">
        <div class="mega-kicker">PERSIANAS SOB MEDIDA</div>
        <div class="mega-card-grid">
          ${persianas.length
            ? persianas.slice(0,6).map(card).join("")
            : `<div class="mega-empty">Cadastre páginas no Admin e marque “Persianas sob medida”.</div>`}
        </div>
      </div>
    </div>`;
  }

  function build(pages){
    document.querySelectorAll(".topbar .nav").forEach(nav=>{
      const logo=nav.querySelector(".logo");
      const carrinho=nav.querySelector(".carrinho-link-topo");

      const cortinas=pages.filter(p=>p.navGroup==="cortinas_sob_medida");
      const persianas=pages.filter(p=>p.navGroup==="persianas_sob_medida");
      const ready=pages.filter(p=>p.navGroup==="pronta_entrega");

      let links=nav.querySelector(".navlinks");
      if(!links){
        links=document.createElement("nav");
        links.className="navlinks";
        if(carrinho) nav.insertBefore(links,carrinho);
        else nav.appendChild(links);
      }

      links.innerHTML=`
        <div class="nav-mega-item">
          <button type="button" class="nav-mega-trigger">Cortinas sob medida <span>⌄</span></button>
          ${menuCortinas(cortinas,ready)}
        </div>

        <div class="nav-mega-item">
          <button type="button" class="nav-mega-trigger">Persianas sob medida <span>⌄</span></button>
          ${menuPersianas(persianas)}
        </div>

        <a href="index.html#contato">Contato</a>
      `;

      nav.querySelectorAll(".nav-mega-trigger").forEach(btn=>{
        btn.addEventListener("click",e=>{
          if(window.matchMedia("(max-width: 900px)").matches){
            e.preventDefault();
            const item=btn.closest(".nav-mega-item");
            nav.querySelectorAll(".nav-mega-item").forEach(x=>{
              if(x!==item)x.classList.remove("open");
            });
            item.classList.toggle("open");
          }
        });
      });
    });

    window.dispatchEvent(new CustomEvent("salvatex:navigation-ready",{detail:{pages}}));
  }

  async function load(){
    try{
      const r=await fetch("/api/pages",{cache:"no-store"});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d.message||"Falha ao carregar páginas");
      build(Array.isArray(d.pages)?d.pages:[]);
    }catch(err){
      console.warn("Navegação dinâmica indisponível:",err);
    }
  }

  document.addEventListener("click",e=>{
    if(!e.target.closest(".nav-mega-item")){
      document.querySelectorAll(".nav-mega-item.open").forEach(x=>x.classList.remove("open"));
    }
  });

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",load);
  }else{
    load();
  }

})();