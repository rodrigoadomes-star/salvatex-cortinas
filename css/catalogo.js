const brlCatalogo = cents => Number(cents||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const escCatalogo = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let categoriaAtual = new URLSearchParams(location.search).get('categoria') || '';

function atualizarContadorCatalogo(){
  const el=document.getElementById('contador-carrinho'); if(!el)return;
  try{const c=JSON.parse(localStorage.getItem('salvatexCarrinho')||'[]');const q=Array.isArray(c)?c.reduce((s,i)=>s+Number(i.quantidade||1),0):0;el.textContent=q;el.style.display=q?'flex':'none'}catch{el.style.display='none'}
}

function cardProduto(p){
  const preco=p.basePriceCents>0?brlCatalogo(p.basePriceCents):'Ver opções';
  const tipo=p.saleType==='sob_medida'?'Sob medida':p.saleType==='pronta_entrega'?'Pronta entrega':'Acessório';
  return `<a class="catalog-card" href="produto.html?slug=${encodeURIComponent(p.slug)}">
    <div class="catalog-card-image">${p.imageUrl?`<img src="${escCatalogo(p.imageUrl)}" alt="${escCatalogo(p.name)}" loading="lazy">`:'<div class="catalog-placeholder">SALVATEX</div>'}</div>
    <div class="catalog-card-body"><small>${escCatalogo(p.categoryName||tipo)}</small><h2>${escCatalogo(p.name)}</h2><p>${escCatalogo((p.description||'').slice(0,110))}</p><div class="catalog-card-bottom"><strong>${preco}</strong><span>${tipo}</span></div></div>
  </a>`;
}

async function carregarCatalogo(){
  const grid=document.getElementById('catalog-products'),catsEl=document.getElementById('catalog-categories');
  try{
    const url='/api/catalog'+(categoriaAtual?'?categoria='+encodeURIComponent(categoriaAtual):'');
    const r=await fetch(url,{cache:'no-store'}); const d=await r.json(); if(!r.ok||!d.ok)throw new Error(d.message||'Falha ao carregar');
    catsEl.innerHTML=`<button class="catalog-chip ${!categoriaAtual?'active':''}" data-cat="">Todos</button>`+d.categories.map(c=>`<button class="catalog-chip ${categoriaAtual===c.slug?'active':''}" data-cat="${escCatalogo(c.slug)}">${escCatalogo(c.name)} <span>${c.productCount}</span></button>`).join('');
    catsEl.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{const cat=b.dataset.cat;location.href=cat?'catalogo.html?categoria='+encodeURIComponent(cat):'catalogo.html'});
    const cat=d.categories.find(c=>c.slug===categoriaAtual); document.getElementById('catalog-title').textContent=cat?cat.name:'Todos os produtos'; document.getElementById('catalog-count').textContent=`${d.products.length} ${d.products.length===1?'produto':'produtos'}`;
    grid.innerHTML=d.products.length?d.products.map(cardProduto).join(''):'<div class="catalog-empty">Nenhum produto publicado nesta categoria ainda.</div>';
  }catch(e){grid.innerHTML=`<div class="catalog-empty">${escCatalogo(e.message)}</div>`}
}

document.addEventListener('DOMContentLoaded',()=>{atualizarContadorCatalogo();carregarCatalogo()});
