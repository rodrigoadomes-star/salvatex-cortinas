(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function j(url){const r=await fetch(url,{cache:'no-store',credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error('Falha '+r.status);return d}
  function pageHref(p){const t=String(p?.pageType||'');if(t==='configurador_wave')return '/configurador?id=wave';if(t==='configurador_prega_macho')return '/configurador?id=prega-macho';if(t==='configurador_ilhos')return '/configurador?id=cortina-varao';if(t==='configurador_persiana')return '/configurador-persiana?id=persiana';if(t==='link'&&p.externalUrl)return p.externalUrl;return `/pagina.html?slug=${encodeURIComponent(p.slug||'')}`}
  function brandName(config){return String(config.storeName||config.name||config.tradeName||location.hostname.split('.')[0]||'Loja').trim()}
  function applyBrand(config,layout){
    const name=brandName(config), logoUrl=layout?.branding?.logo||config.logo||'';
    document.title=`${name} — Configurador`;
    document.querySelectorAll('.logo').forEach(logo=>{
      if(logoUrl){logo.innerHTML=`<img src="${esc(logoUrl)}" alt="${esc(name)}" style="display:block;max-height:46px;max-width:200px;object-fit:contain">`;}
      else{logo.innerHTML='';logo.append(document.createTextNode(name.toUpperCase()));const sub=document.createElement('small');sub.textContent='';logo.appendChild(sub)}
      logo.setAttribute('href','/');
    });
    const footer=document.querySelector('footer .shell');if(footer)footer.textContent=`${name.toUpperCase()} · ${new Date().getFullYear()}`;
    const colors=layout?.branding?.colors||layout?.colors||{};
    if(colors.primary)document.documentElement.style.setProperty('--layout-primary',colors.primary);
    if(colors.accent)document.documentElement.style.setProperty('--layout-accent',colors.accent);
  }
  function applyPages(data,layout){
    const nav=$('.navlinks');if(!nav)return;
    const pages=(data?.pages||[]).filter(p=>['principal','cortinas_sob_medida','persianas_sob_medida','pronta_entrega'].includes(p.navGroup)).sort((a,b)=>(a.navOrder||100)-(b.navOrder||100));
    const contactLabel=layout?.navigation?.contactLabel||layout?.header?.contactLabel||'Contato';
    nav.innerHTML=pages.map(p=>`<a class="page-nav-link" href="${esc(pageHref(p))}">${esc(p.menuLabel||p.title)}</a>`).join('')+`<a href="/#contato">${esc(contactLabel)}</a><a href="/minha-conta.html">Minha conta</a>`;
    nav.style.display='flex';nav.style.gap='22px';nav.style.alignItems='center';
  }
  async function boot(){
    try{
      const [sc,ly,pages]=await Promise.all([j('/api/store-config'),j('/api/layout'),j('/api/pages')]);
      applyBrand(sc.config||{},ly.layout||{});applyPages(pages,ly.layout||{});
    }catch(e){console.error('[RADZ configurator identity]',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('salvatex:layout-ready',()=>setTimeout(boot,0));
})();
