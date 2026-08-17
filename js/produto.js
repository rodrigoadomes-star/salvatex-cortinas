const brlProduto = cents => (Number(cents || 0) / 100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const escProduto = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let produtoAtual=null;

function atualizarContadorProduto(){const el=document.getElementById('contador-carrinho');if(!el)return;try{const c=JSON.parse(localStorage.getItem('salvatexCarrinho')||'[]');const q=Array.isArray(c)?c.reduce((s,i)=>s+Number(i.quantidade||1),0):0;el.textContent=q;el.style.display=q?'flex':'none'}catch{el.style.display='none'}}
function rotaConfigurador(p){const map={wave:'configurador.html?id=wave',ilhos:'configurador.html?id=cortina-varao','cortina-varao':'configurador.html?id=cortina-varao',prega_macho:'configurador.html?id=prega-macho','prega-macho':'configurador.html?id=prega-macho',persiana:'configurador.html?id=persiana'};return map[p.configurator]||'index.html#configurador'}
function trackProduto(name,params={}){try{return window.SalvatexTracking?.track(name,params)}catch{return null}}

function galeriaProduto(p){
  const images=[];
  const add=url=>{url=String(url||'').trim();if(url&&!images.includes(url))images.push(url)};
  add(p.imageUrl);
  (Array.isArray(p.images)?p.images:[]).forEach(add);
  if(!images.length)return '<div class="product-main-image"><div class="catalog-placeholder">PRODUTO</div></div>';
  const main=images[0];
  const thumbs=images.length>1?`<div class="product-thumbs">${images.map((url,i)=>`<button type="button" class="product-thumb ${i===0?'active':''}" data-product-image="${escProduto(url)}" aria-label="Ver imagem ${i+1}"><img src="${escProduto(url)}" alt=""></button>`).join('')}</div>`:'';
  return `<div class="product-main-image"><img id="product-main-photo" src="${escProduto(main)}" alt="${escProduto(p.name)}"></div>${thumbs}`;
}

function bindGaleriaProduto(){
  const main=document.getElementById('product-main-photo');
  if(!main)return;
  document.querySelectorAll('[data-product-image]').forEach(btn=>btn.onclick=()=>{
    main.src=btn.dataset.productImage;
    document.querySelectorAll('[data-product-image]').forEach(x=>x.classList.toggle('active',x===btn));
  });
}

function adicionarProntaEntrega(){
  const p=produtoAtual;
  if(!p)return;
  if(p.trackStock && Number(p.stock||0)<=0){alert('Produto sem estoque no momento.');return;}
  if(!window.SalvatexCarrinho){alert('Não foi possível acessar o carrinho.');return;}
  const preco = Number(p.basePriceCents||0)/100;
  const item = SalvatexCarrinho.criarItem({
    categoria: p.categorySlug || 'produto',tipoVenda: p.saleType || 'pronta_entrega',configurador: p.configurator || '',sku: p.sku || '',nome: p.name,imagem: p.imageUrl || '',quantidade: 1,valorUnitario: preco,
    detalhes:[...(p.sku ? [{rotulo:'SKU', valor:p.sku}] : []),...(p.categoryName ? [{rotulo:'Categoria', valor:p.categoryName}] : [])],
    dados:{productId:p.id,productSlug:p.slug,stock:p.stock,trackStock:p.trackStock,options:p.options||{},metadata:p.metadata||{}}
  });
  SalvatexCarrinho.adicionarItem(item);
  trackProduto('add_to_cart',{currency:'BRL',value:preco,content_id:p.id,content_ids:[p.id],content_name:p.name,content_type:'product'});
  location.href='carrinho.html';
}

async function carregarProduto(){
  const view=document.getElementById('product-view'),slug=new URLSearchParams(location.search).get('slug');if(!slug){view.innerHTML='<div class="catalog-empty">Produto não informado.</div>';return}
  try{
    const r=await fetch('/api/catalog/'+encodeURIComponent(slug),{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.message||'Produto não encontrado');
    const p=d.product;produtoAtual=p;document.title=p.name+' | Loja';
    const estoque=p.trackStock?(Number(p.stock||0)>0?`${p.stock} em estoque`:'Sem estoque'):'Disponível',sob=p.saleType==='sob_medida';
    view.innerHTML=`<div class="product-gallery">${galeriaProduto(p)}</div>
      <section class="product-info"><a class="product-back" href="catalogo.html${p.categorySlug?'?categoria='+encodeURIComponent(p.categorySlug):''}">← Voltar aos produtos</a><div class="kicker">${escProduto(p.categoryName||'Produto')}</div><h1>${escProduto(p.name)}</h1>${p.sku?`<div class="product-sku">SKU ${escProduto(p.sku)}</div>`:''}<p class="product-description">${escProduto(p.description||'')}</p><div class="product-price">${p.basePriceCents>0?brlProduto(p.basePriceCents):(sob?'Valor calculado no configurador':'Consulte')}</div>${p.basePriceCents>0?`<div class="product-installment">ou 10x de ${brlProduto(p.basePriceCents/10)} sem juros</div>`:''}<div class="product-stock">${estoque}</div>${sob?`<a class="product-action" href="${rotaConfigurador(p)}">Configurar sob medida</a><small class="product-note">As medidas e opções serão calculadas no configurador.</small>`:`<button id="add-ready" class="product-action" ${p.trackStock&&Number(p.stock||0)<=0?'disabled':''}>Adicionar ao carrinho</button><small class="product-note">Produto com preço e estoque definidos.</small>`}</section>`;
    bindGaleriaProduto();
    const btn=document.getElementById('add-ready');if(btn)btn.onclick=adicionarProntaEntrega;
    trackProduto('view_item',{currency:'BRL',value:Number(p.basePriceCents||0)/100,content_id:p.id,content_ids:[p.id],content_name:p.name,content_type:'product'});
  }catch(e){view.innerHTML=`<div class="catalog-empty">${escProduto(e.message)}</div>`}
}

document.addEventListener('DOMContentLoaded',()=>{atualizarContadorProduto();carregarProduto()});
