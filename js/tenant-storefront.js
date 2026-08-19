(()=>{
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100);
  async function j(url){const r=await fetch(url,{cache:'no-store',credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Falha ao carregar');return d}
  function actionData(value,fallbackLabel,fallbackHref){if(value&&typeof value==='object')return{label:value.label||value.text||fallbackLabel,href:value.href||value.url||fallbackHref};return{label:fallbackLabel,href:fallbackHref}}
  function applyIdentity(config,layout){
    const name=String(config.storeName||config.name||location.hostname.split('.')[0]||'Loja').trim();
    document.title=`${name} — Loja online`;
    $('#brand').textContent=name.toUpperCase();$('#footer-brand').textContent=name.toUpperCase();
    const hero=layout.hero||config.hero||{};
    $('#eyebrow').textContent=hero.eyebrow||config.segment||'NOSSA LOJA';
    $('#hero-title').textContent=hero.title||`Bem-vindo à ${name}`;
    $('#hero-subtitle').textContent=hero.subtitle||`Conheça os produtos, novidades e opções disponíveis na ${name}.`;
    const p=actionData(hero.primaryAction,'Ver produtos','#produtos'),s=actionData(hero.secondaryAction,'Explorar categorias','#categorias');
    $('#primary-action').textContent=p.label;$('#primary-action').href=p.href;$('#secondary-action').textContent=s.label;$('#secondary-action').href=s.href;
    const image=hero.image||layout.branding?.heroImage||config.heroImage||'';if(image)$('#hero-media').style.backgroundImage=`url("${String(image).replace(/"/g,'%22')}")`;
    const primary=layout.branding?.colors?.primary||layout.colors?.primary||config.primaryColor;if(primary)document.documentElement.style.setProperty('--brand',primary);
    const accent=layout.branding?.colors?.accent||layout.colors?.accent||config.accentColor;if(accent)document.documentElement.style.setProperty('--accent',accent);
    $('#footer-text').textContent=layout.footer?.text||config.footerText||`${name} · Loja online.`;
  }
  function renderCatalog(data){
    const cats=data.categories||[],products=data.products||[];
    $('#categories').innerHTML=cats.length?cats.map(c=>`<a class="card category" href="#produtos" data-category="${esc(c.slug)}"><strong>${esc(c.name)}</strong><p>${esc(c.description||`${c.productCount||0} produto(s)`)}</p></a>`).join(''):'<div class="empty">Nenhuma categoria publicada no momento.</div>';
    $('#products').innerHTML=products.length?products.slice(0,12).map(p=>`<article class="card"><div class="product-img" ${p.imageUrl?`style="background-image:url('${esc(p.imageUrl)}')"`:''}></div><div class="product-body"><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p><div class="price">${money(p.basePriceCents)}</div></div></article>`).join(''):'<div class="empty">Nenhum produto publicado no momento. Cadastre produtos pelo painel administrativo.</div>';
    document.querySelectorAll('[data-category]').forEach(a=>a.addEventListener('click',()=>{const slug=a.dataset.category;document.querySelectorAll('#products .card').forEach(()=>{});history.replaceState(null,'',`#produtos`)}));
  }
  async function boot(){
    try{
      const [sc,ly,cat]=await Promise.all([j('/api/store-config'),j('/api/layout'),j('/api/catalog')]);
      applyIdentity(sc.config||{},ly.layout||{});renderCatalog(cat);
    }catch(e){console.error('[RADZ storefront]',e);$('#products').innerHTML='<div class="empty">A loja está sendo configurada. Tente novamente em instantes.</div>'}
  }
  boot();
})();
