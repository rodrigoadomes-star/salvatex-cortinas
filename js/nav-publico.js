(function(){
  function ensureMobileStyles(){
    if(document.querySelector('link[data-radz-mobile-nav]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='css/mobile-nav.css?v=20260821-1';link.dataset.radzMobileNav='true';document.head.appendChild(link);
  }
  function closeMobileMenu(nav){nav.classList.remove('mobile-menu-open');nav.querySelector('.mobile-menu-toggle')?.setAttribute('aria-expanded','false');nav.querySelectorAll('.nav-mega-item.open').forEach(item=>item.classList.remove('open'))}
  function ensureMobileMenu(nav,links,carrinho){
    if(!links.id)links.id='radz-menu-'+Math.random().toString(36).slice(2,8);
    let button=nav.querySelector('.mobile-menu-toggle');
    if(!button){button=document.createElement('button');button.type='button';button.className='mobile-menu-toggle';button.setAttribute('aria-label','Abrir menu');button.setAttribute('aria-expanded','false');button.innerHTML='<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';if(carrinho)nav.insertBefore(button,carrinho);else nav.insertBefore(button,links);button.addEventListener('click',()=>{const open=nav.classList.toggle('mobile-menu-open');button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');if(!open)nav.querySelectorAll('.nav-mega-item.open').forEach(item=>item.classList.remove('open'))})}
    button.setAttribute('aria-controls',links.id);links.addEventListener('click',event=>{if(event.target.closest('a'))closeMobileMenu(nav)})
  }
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function pageUrl(p){
    if(p.pageType==='link'&&p.externalUrl)return p.externalUrl;
    if(p.pageType==='configurador'){
      const id=String(p.configuratorId||'');
      if(id==='persiana')return 'configurador-persiana.html?id=persiana';
      return 'configurador.html?id='+encodeURIComponent(id);
    }
    return 'pagina.html?slug='+encodeURIComponent(p.slug);
  }
  function itemLabel(p){return p.menuLabel||p.title||'Página'}
  function simpleLink(p){return `<a href="${esc(pageUrl(p))}">${esc(itemLabel(p))}</a>`}
  function dropdown(parent,children){
    return `<div class="nav-mega-item"><button type="button" class="nav-mega-trigger">${esc(itemLabel(parent))} <span>⌄</span></button><div class="mega-menu mega-menu-generic"><div class="mega-main mega-main-full"><div class="mega-card-grid">${children.map(child=>`<a class="mega-product-card" href="${esc(pageUrl(child))}"><div class="mega-product-image">${child.heroImageUrl?`<img src="${esc(child.heroImageUrl)}" alt="${esc(child.title)}" loading="lazy">`:'<span>•</span>'}</div><div><strong>${esc(itemLabel(child))}</strong><small>${esc(child.title||'')}</small></div></a>`).join('')}</div></div></div></div>`;
  }
  function notify(pages,error=false){window.dispatchEvent(new CustomEvent('salvatex:navigation-ready',{detail:{pages:Array.isArray(pages)?pages:[],error:Boolean(error)}}));window.dispatchEvent(new CustomEvent('radz:navigation-ready',{detail:{pages:Array.isArray(pages)?pages:[],error:Boolean(error)}}))}
  function build(pages){
    ensureMobileStyles();
    const visible=(Array.isArray(pages)?pages:[]).filter(p=>p.navGroup==='principal').sort((a,b)=>(a.navOrder||100)-(b.navOrder||100)||String(a.title||'').localeCompare(String(b.title||'')));
    const byParent=new Map();visible.forEach(p=>{if(p.navParentId){const arr=byParent.get(p.navParentId)||[];arr.push(p);byParent.set(p.navParentId,arr)}});
    const roots=visible.filter(p=>!p.navParentId||!visible.some(x=>x.id===p.navParentId));
    document.querySelectorAll('.topbar .nav,.storefront-topbar .nav').forEach(nav=>{
      const carrinho=nav.querySelector('.carrinho-link-topo');
      let links=nav.querySelector('.navlinks');if(!links){links=document.createElement('nav');links.className='navlinks';if(carrinho)nav.insertBefore(links,carrinho);else nav.appendChild(links)}
      links.innerHTML=roots.map(p=>{const children=(byParent.get(p.id)||[]).sort((a,b)=>(a.navOrder||100)-(b.navOrder||100));return children.length?dropdown(p,children):simpleLink(p)}).join('');
      ensureMobileMenu(nav,links,carrinho);
      nav.querySelectorAll('.nav-mega-trigger').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();const item=btn.closest('.nav-mega-item');nav.querySelectorAll('.nav-mega-item').forEach(x=>{if(x!==item)x.classList.remove('open')});item.classList.toggle('open')}));
    });
    notify(pages,false);
  }
  async function load(){try{const r=await fetch('/api/pages',{cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.message||'Falha ao carregar páginas');build(Array.isArray(d.pages)?d.pages:[])}catch(err){console.warn('Navegação dinâmica indisponível:',err);notify([],true)}}
  document.addEventListener('click',e=>{if(!e.target.closest('.nav-mega-item'))document.querySelectorAll('.nav-mega-item.open').forEach(x=>x.classList.remove('open'));if(!e.target.closest('.storefront-topbar,.topbar'))document.querySelectorAll('.nav.mobile-menu-open').forEach(closeMobileMenu)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.nav.mobile-menu-open').forEach(closeMobileMenu)});
  window.addEventListener('resize',()=>{if(window.innerWidth>900)document.querySelectorAll('.nav.mobile-menu-open').forEach(closeMobileMenu)});
  window.SALVATEX_RELOAD_NAV=load;window.RADZ_RELOAD_NAV=load;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
