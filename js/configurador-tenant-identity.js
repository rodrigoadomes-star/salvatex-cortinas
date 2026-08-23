(()=>{
  const host=String(location.hostname||'').toLowerCase();
  /* Salvatex mantém integralmente o layout/configurador legado já validado. */
  if(host==='salvatex.radzhub.com.br'||host.startsWith('salvatex.'))return;

  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function j(url){const r=await fetch(url,{cache:'no-store',credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error('Falha '+r.status);return d}
  function pageHref(p){if(p?.pageType==='link'&&p.externalUrl)return p.externalUrl;if(p?.pageType==='configurador'){const items=Array.isArray(p.configurators)?p.configurators.filter(x=>x&&x.active!==false&&x.configuratorId):[];const id=items.length===1?items[0].configuratorId:p.configuratorId;if(items.length<=1&&id)return id==='persiana'?'/configurador-persiana.html?id=persiana':'/configurador.html?id='+encodeURIComponent(id)}return `/pagina.html?slug=${encodeURIComponent(p?.slug||'')}`}
  function brandName(config){return String(config.storeName||config.name||config.tradeName||location.hostname.split('.')[0]||'Loja').trim()}
  function applyBrand(config,layout){
    const name=brandName(config),logoUrl=layout?.branding?.logo||config.logo||'';
    document.documentElement.dataset.genericTenantConfigurator='1';
    document.title=`${name} — Configurador`;
    document.querySelectorAll('.logo').forEach(logo=>{if(logoUrl)logo.innerHTML=`<img src="${esc(logoUrl)}" alt="${esc(name)}" style="display:block;max-height:44px;max-width:190px;object-fit:contain">`;else logo.textContent=name.toUpperCase();logo.setAttribute('href','/');});
    const colors=layout?.branding?.colors||layout?.colors||{};const primary=colors.primary||'#102a43',accent=colors.accent||'#c49a58';
    document.documentElement.style.setProperty('--brand',primary);document.documentElement.style.setProperty('--accent',accent);document.documentElement.style.setProperty('--layout-primary',primary);document.documentElement.style.setProperty('--layout-accent',accent);
    const footer=document.querySelector('footer');if(footer){const text=layout?.footer?.text||config.footerText||`${name} · Loja online.`;footer.innerHTML=`<div class="tenant-footer-grid"><div><div class="tenant-footer-brand">${esc(name.toUpperCase())}</div><div class="tenant-footer-text">${esc(text)}</div></div><div class="tenant-footer-tech">Tecnologia RADZ HUB</div></div>`;}
  }
  function applyPages(){window.RADZ_RELOAD_NAV?.()}
  async function boot(){try{const [sc,ly,pages]=await Promise.all([j('/api/store-config'),j('/api/layout'),j('/api/pages')]);applyBrand(sc.config||{},ly.layout||{});applyPages(pages,ly.layout||{});}catch(e){console.error('[RADZ configurator identity]',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();window.addEventListener('salvatex:layout-ready',()=>setTimeout(boot,0));
})();
