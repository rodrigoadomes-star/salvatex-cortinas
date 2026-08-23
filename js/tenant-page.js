(()=>{
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(c||0)/100);
  async function j(url){const r=await fetch(url,{cache:'no-store',credentials:'same-origin'}),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'Falha ao carregar');return d}
  function card(p){return `<article class="card"><a href="/produto.html?slug=${encodeURIComponent(p.slug)}"><div class="product-img" ${p.imageUrl?`style="background-image:url('${esc(p.imageUrl)}')"`:''}></div></a><div class="product-body"><h3><a href="/produto.html?slug=${encodeURIComponent(p.slug)}">${esc(p.name)}</a></h3><p>${esc(p.description||'')}</p><div class="price">${p.basePriceCents>0?money(p.basePriceCents):'Consulte'}</div></div></article>`}
  const configuratorUrl=id=>String(id||'').trim()==='persiana'?'/configurador-persiana.html?id=persiana':'/configurador.html?id='+encodeURIComponent(String(id||'').trim());
  function configuratorItems(page){const list=Array.isArray(page?.configurators)?page.configurators.filter(item=>item&&item.active!==false&&item.configuratorId):[];if(list.length)return list;return page?.configuratorId?[{configuratorId:page.configuratorId,menuLabel:page.menuLabel||page.title,active:true}]:[]}
  function renderConfiguratorChoices(view,page,name,items){view.innerHTML=`<a class="back" href="/">← Voltar para a loja</a><div class="kicker">${esc(name)}</div><h1>${esc(page.title||'Escolha uma opção')}</h1><section class="products">${items.map(item=>`<article class="card"><div class="product-body"><h3><a href="${esc(configuratorUrl(item.configuratorId))}">${esc(item.menuLabel||item.configuratorId)}</a></h3><p>Configure este produto sob medida.</p><a class="btn" href="${esc(configuratorUrl(item.configuratorId))}">Configurar</a></div></article>`).join('')}</section>`}
  async function boot(){
    const view=$('#page-view');const slug=new URLSearchParams(location.search).get('slug');if(!slug){view.innerHTML='<div class="empty">Página não informada.</div>';return}
    try{
      const [sc,ly,pd]=await Promise.all([j('/api/store-config'),j('/api/layout'),j('/api/pages/'+encodeURIComponent(slug))]);
      const cfg=sc.config||{},layout=ly.layout||{},page=pd.page||{},name=String(cfg.storeName||cfg.name||location.hostname.split('.')[0]||'Loja').trim();
      $('#brand').textContent=name.toUpperCase();$('#footer-brand').textContent=name.toUpperCase();document.title=`${page.seoTitle||page.title||name} — ${name}`;
      const meta=document.querySelector('meta[name="description"]');if(meta&&page.seoDescription)meta.content=page.seoDescription;
      const primary=layout.branding?.colors?.primary||layout.colors?.primary||cfg.primaryColor;if(primary)document.documentElement.style.setProperty('--brand',primary);
      const accent=layout.branding?.colors?.accent||layout.colors?.accent||cfg.accentColor;if(accent)document.documentElement.style.setProperty('--accent',accent);
      if(page.pageType==='configurador'){
        const items=configuratorItems(page);
        if(items.length===1){location.replace(configuratorUrl(items[0].configuratorId));return}
        if(items.length>1){renderConfiguratorChoices(view,page,name,items);return}
        throw new Error('Configurador não vinculado a esta página.');
      }
      if(page.pageType==='link'&&page.externalUrl){location.replace(page.externalUrl);return}
      if(page.pageType==='produtos')view.innerHTML=`<a class="back" href="/">← Voltar para a loja</a>${page.heroImageUrl?`<img class="hero-image" src="${esc(page.heroImageUrl)}" alt="">`:''}<div class="kicker">${esc(name)}</div><h1>${esc(page.title)}</h1><section class="products">${(pd.products||[]).length?(pd.products||[]).map(card).join(''):'<div class="empty">Nenhum produto publicado nesta página.</div>'}</section>`;
      else view.innerHTML=`<a class="back" href="/">← Voltar para a loja</a>${page.heroImageUrl?`<img class="hero-image" src="${esc(page.heroImageUrl)}" alt="">`:''}<div class="kicker">${esc(name)}</div><h1>${esc(page.title)}</h1><article class="content">${page.contentHtml||''}</article>`;
    }catch(e){view.innerHTML=`<div class="empty">${esc(e.message)}</div>`}
  }
  boot();
})();
