(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function j(url){const r=await fetch(url,{cache:'no-store',credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error('Falha '+r.status);return d}
  function pageHref(p){const t=String(p?.pageType||'');if(t==='configurador_wave')return '/configurador?id=wave';if(t==='configurador_prega_macho')return '/configurador?id=prega-macho';if(t==='configurador_ilhos')return '/configurador?id=cortina-varao';if(t==='configurador_persiana')return '/configurador-persiana?id=persiana';if(t==='link'&&p.externalUrl)return p.externalUrl;return `/pagina.html?slug=${encodeURIComponent(p.slug||'')}`}
  function brandName(config){return String(config.storeName||config.name||config.tradeName||location.hostname.split('.')[0]||'Loja').trim()}
  function isSalvatex(config){const n=brandName(config).toLowerCase();return n.includes('salvatex')||location.hostname.toLowerCase().startsWith('salvatex.');}
  function applyBrand(config,layout){
    const name=brandName(config),logoUrl=layout?.branding?.logo||config.logo||'';
    if(!isSalvatex(config))document.documentElement.dataset.genericTenantConfigurator='1';else delete document.documentElement.dataset.genericTenantConfigurator;
    document.title=`${name} — Configurador`;
    document.querySelectorAll('.logo').forEach(logo=>{if(logoUrl)logo.innerHTML=`<img src="${esc(logoUrl)}" alt="${esc(name)}" style="display:block;max-height:44px;max-width:190px;object-fit:contain">`;else logo.textContent=name.toUpperCase();logo.setAttribute('href','/');});
    const colors=layout?.branding?.colors||layout?.colors||{};const primary=colors.primary||'#102a43',accent=colors.accent||'#c49a58';
    document.documentElement.style.setProperty('--brand',primary);document.documentElement.style.setProperty('--accent',accent);document.documentElement.style.setProperty('--layout-primary',primary);document.documentElement.style.setProperty('--layout-accent',accent);
    const footer=document.querySelector('footer');if(footer){const text=layout?.footer?.text||config.footerText||`${name} · Loja online.`;footer.innerHTML=`<div class="tenant-footer-grid"><div><div class="tenant-footer-brand">${esc(name.toUpperCase())}</div><div class="tenant-footer-text">${esc(text)}</div></div><div class="tenant-footer-tech">Tecnologia RADZ HUB</div></div>`;}
  }
  function applyPages(data,layout){const nav=$('.navlinks');if(!nav)return;const pages=(data?.pages||[]).filter(p=>['principal','cortinas_sob_medida','persianas_sob_medida','pronta_entrega'].includes(p.navGroup)).sort((a,b)=>(a.navOrder||100)-(b.navOrder||100));const contactLabel=layout?.navigation?.contactLabel||layout?.header?.contactLabel||'Contato';const accountLabel=layout?.navigation?.accountLabel||'Minha conta';nav.innerHTML=pages.map(p=>`<a class="page-nav-link" href="${esc(pageHref(p))}">${esc(p.menuLabel||p.title)}</a>`).join('')+`<a href="/#contato">${esc(contactLabel)}</a><a href="/minha-conta.html">${esc(accountLabel)}</a>`;}
  async function boot(){try{const [sc,ly,pages]=await Promise.all([j('/api/store-config'),j('/api/layout'),j('/api/pages')]);applyBrand(sc.config||{},ly.layout||{});applyPages(pages,ly.layout||{});}catch(e){console.error('[RADZ configurator identity]',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();window.addEventListener('salvatex:layout-ready',()=>setTimeout(boot,0));
})();