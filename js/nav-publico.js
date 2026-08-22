(function(){
  function ensureMobileStyles(){
    if(document.querySelector('link[data-radz-mobile-nav]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='css/mobile-nav.css?v=20260821-1';link.dataset.radzMobileNav='true';document.head.appendChild(link);
  }
  function ensureDesktopMegaStyles(){
    if(document.getElementById('radz-generic-mega-style'))return;
    const style=document.createElement('style');style.id='radz-generic-mega-style';style.textContent='@media (min-width:901px){.nav-mega-item{position:relative}.nav-mega-item>.mega-menu{display:none}.nav-mega-item:hover>.mega-menu,.nav-mega-item:focus-within>.mega-menu,.nav-mega-item.open>.mega-menu{display:block}.nav-mega-trigger{display:inline-flex;align-items:center;gap:4px;text-decoration:none;color:inherit}.nav-mega-trigger span{font-size:.8em}}';document.head.appendChild(style);
  }
  function closeMobileMenu(nav){nav.classList.remove('mobile-menu-open');nav.querySelector('.mobile-menu-toggle')?.setAttribute('aria-expanded','false');nav.querySelectorAll('.nav-mega-item.open').forEach(item=>item.classList.remove('open'))}
  function ensureMobileMenu(nav,links,carrinho){
    if(!links.id)links.id='radz-menu-'+Math.random().toString(36).slice(2,8);
    let button=nav.querySelector('.mobile-menu-toggle');
    if(!button){button=document.createElement('button');button.type='button';button.className='mobile-menu-toggle';button.setAttribute('aria-label','Abrir menu');button.setAttribute('aria-expanded','false');button.innerHTML='<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';if(carrinho)nav.insertBefore(button,carrinho);else nav.insertBefore(button,links);button.addEventListener('click',()=>{const open=nav.classList.toggle('mobile-menu-open');button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');if(!open)nav.querySelectorAll('.nav-mega-item.open').forEach(item=>item.classList.remove('open'))})}
    button.setAttribute('aria-controls',links.id);links.addEventListener('click',event=>{if(event.target.closest('a')&&!event.target.closest('.nav-mega-arrow'))closeMobileMenu(nav)})
  }
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const slugify=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  function isProductHub(p){const slug=slugify(p.slug);return slug==='produtos'||slug==='products'||slug==='catalogo'||slug==='catalog'}
  function pageUrl(p){
    if(p.pageType==='link'&&p.externalUrl)return p.externalUrl;
    const cfg=String(p.configuratorId||'').trim();
    if(cfg&&!isProductHub(p)){
      if(cfg==='persiana')return 'configurador-persiana.html?id=persiana';
      return 'configurador.html?id='+encodeURIComponent(cfg);
    }
    return 'pagina.html?slug='+encodeURIComponent(p.slug);
  }
  function itemLabel(p){return p.menuLabel||p.title||'Página'}
  function simpleLink(p){return `<a href="${esc(pageUrl(p))}">${esc(itemLabel(p))}</a>`}
  function dropdown(parent,children){
    return `<div class="nav-mega-item"><a class="nav-mega-trigger" href="${esc(pageUrl(parent))}">${esc(itemLabel(parent))} <span>⌄</span></a><div class="mega-menu mega-menu-generic"><div class="mega-main mega-main-full"><div class="mega-card-grid">${children.map(child=>`<a class="mega-product-card" href="${esc(pageUrl(child))}"><div class="mega-product-image">${child.heroImageUrl?`<img src="${esc(child.heroImageUrl)}" alt="${esc(child.title)}" loading="lazy">`:'<span>•</span>'}</div><div><strong>${esc(itemLabel(child))}</strong><small>${esc(child.title||'')}</small></div></a>`).join('')}</div></div></div></div>`;
  }
  function notify(pages,error=false){window.dispatchEvent(new CustomEvent('salvatex:navigation-ready',{detail:{pages:Array.isArray(pages)?pages:[],error:Boolean(error)}}));window.dispatchEvent(new CustomEvent('radz:navigation-ready',{detail:{pages:Array.isArray(pages)?pages:[],error:Boolean(error)}}))}
  function resolveConfiguratorLinks(pages,configurators){
    const cfgs=Array.isArray(configurators)?configurators:[];
    return (Array.isArray(pages)?pages:[]).map(page=>{
      if(isProductHub(page)||page.pageType==='link'||page.configuratorId)return page;
      const keys=new Set([page.slug,page.title,page.menuLabel].map(slugify).filter(Boolean));
      const match=cfgs.find(c=>[c.id,c.nome].map(slugify).some(k=>keys.has(k)));
      return match?{...page,pageType:'configurador',configuratorId:match.id}:page;
    });
  }
  function build(pages){
    ensureMobileStyles();ensureDesktopMegaStyles();
    const visible=(Array.isArray(pages)?pages:[]).filter(p=>p.navGroup==='principal').sort((a,b)=>(a.navOrder||100)-(b.navOrder||100)||String(a.title||'').localeCompare(String(b.title||'')));
    const byParent=new Map();visible.forEach(p=>{if(p.navParentId){const arr=byParent.get(p.navParentId)||[];arr.push(p);byParent.set(p.navParentId,arr)}});
    const roots=visible.filter(p=>!p.navParentId||!visible.some(x=>x.id===p.navParentId));
    document.querySelectorAll('.topbar .nav,.storefront-topbar .nav').forEach(nav=>{
      const carrinho=nav.querySelector('.carrinho-link-topo');
      let links=nav.querySelector('.navlinks');if(!links){links=document.createElement('nav');links.className='navlinks';if(carrinho)nav.insertBefore(links,carrinho);else nav.appendChild(links)}
      links.innerHTML=roots.map(p=>{const children=(byParent.get(p.id)||[]).sort((a,b)=>(a.navOrder||100)-(b.navOrder||100));return children.length?dropdown(p,children):simpleLink(p)}).join('');
      ensureMobileMenu(nav,links,carrinho);
      nav.querySelectorAll('.nav-mega-trigger').forEach(trigger=>trigger.addEventListener('click',e=>{if(window.innerWidth>900)return;const item=trigger.closest('.nav-mega-item');if(!item.classList.contains('open')){e.preventDefault();nav.querySelectorAll('.nav-mega-item').forEach(x=>{if(x!==item)x.classList.remove('open')});item.classList.add('open')}}));
    });
    notify(pages,false);
  }
  async function load(){
    try{
      const [pagesRes,cfgRes]=await Promise.all([
        fetch('/api/pages?ts='+Date.now(),{cache:'no-store'}),
        fetch('/api/configurators?ts='+Date.now(),{cache:'no-store'})
      ]);
      const pagesData=await pagesRes.json().catch(()=>({}));
      const cfgData=await cfgRes.json().catch(()=>({}));
      if(!pagesRes.ok||!pagesData.ok)throw new Error(pagesData.message||'Falha ao carregar páginas');
      const pages=resolveConfiguratorLinks(Array.isArray(pagesData.pages)?pagesData.pages:[],cfgRes.ok&&cfgData.ok?cfgData.configurators:[]);
      build(pages);
    }catch(err){console.warn('Navegação dinâmica indisponível:',err);notify([],true)}
  }
  document.addEventListener('click',e=>{if(!e.target.closest('.nav-mega-item'))document.querySelectorAll('.nav-mega-item.open').forEach(x=>x.classList.remove('open'));if(!e.target.closest('.storefront-topbar,.topbar'))document.querySelectorAll('.nav.mobile-menu-open').forEach(closeMobileMenu)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.nav.mobile-menu-open').forEach(closeMobileMenu)});
  window.addEventListener('resize',()=>{if(window.innerWidth>900)document.querySelectorAll('.nav.mobile-menu-open').forEach(closeMobileMenu)});
  window.SALVATEX_RELOAD_NAV=load;window.RADZ_RELOAD_NAV=load;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
