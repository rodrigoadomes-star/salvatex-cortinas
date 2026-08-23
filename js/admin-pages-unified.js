(()=>{
  const parse=(v,f=[])=>{try{return JSON.parse(v||'[]')}catch{return f}};
  const pageTypeLabel=t=>({produtos:'Lista de produtos',conteudo:'Página de conteúdo',configurador:'Configurador',link:'Link externo'})[String(t||'conteudo')]||'Página de conteúdo';
  const navLabel=n=>({principal:'Menu principal',rodape:'Rodapé',oculto:'Oculta'})[String(n||'oculto')]||'Oculta';
  const publicUrl=p=>{
    if(p.page_type==='link'&&p.external_url)return p.external_url;
    if(p.page_type==='configurador'&&p.configurator_id)return p.configurator_id==='persiana'?`../configurador-persiana.html?id=persiana`:`../configurador.html?id=${encodeURIComponent(p.configurator_id)}`;
    return `../pagina.html?slug=${encodeURIComponent(p.slug||'')}`;
  };
  async function loadData(){
    const [pages,products,configs]=await Promise.all([
      api('pages'),
      api('catalog/products'),
      api('configurators').catch(()=>({configurators:[]}))
    ]);
    ADMIN.cache.pages=pages.pages||[];ADMIN.cache.pageProducts=products.products||[];ADMIN.cache.pageConfigurators=configs.configurators||[];
    return{pages:ADMIN.cache.pages,products:ADMIN.cache.pageProducts,configurators:ADMIN.cache.pageConfigurators};
  }
  window.renderPages=async function(){
    const {pages}=await loadData();const c=$('#view-content');
    c.innerHTML=`<div class="page-toolbar"><div class="orders-help">Cada página tem um destino explícito. O nome exibido não altera o funcionamento.</div><button id="new-page" class="primary-btn">+ Nova página</button></div><section class="panel"><div class="table-wrap"><table class="admin-table"><thead><tr><th>Página</th><th>Menu</th><th>Destino</th><th>URL</th><th>Status</th><th></th></tr></thead><tbody>${pages.map(p=>`<tr data-page-id="${esc(p.id)}"><td><b>${esc(p.title)}</b><small class="order-cell-sub">/${esc(p.slug||'')}</small></td><td>${esc(p.menu_label||p.title)}<small class="order-cell-sub">${navLabel(p.nav_group)}</small></td><td>${pageTypeLabel(p.page_type)}${p.configurator_id?`<small class="order-cell-sub">${esc(p.configurator_id)}</small>`:''}</td><td><a href="${esc(publicUrl(p))}" target="_blank">Abrir ↗</a></td><td>${p.active?'Publicada':'Rascunho'}</td><td><button class="ghost-btn edit-page">Editar</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhuma página criada.</td></tr>'}</tbody></table></div></section>`;
    $('#new-page').onclick=()=>window.pageForm({});
    $$('.edit-page',c).forEach(b=>b.onclick=()=>window.pageForm(pages.find(p=>String(p.id)===String(b.closest('tr').dataset.pageId))||{}));
  };
  window.pageForm=async function(x={}){
    if(!ADMIN.cache.pages||!ADMIN.cache.pageProducts||!ADMIN.cache.pageConfigurators)await loadData();
    const products=ADMIN.cache.pageProducts||[],configs=ADMIN.cache.pageConfigurators||[],pages=ADMIN.cache.pages||[];
    const selected=parse(x.product_ids_json,[]).map(String),measures=parse(x.measures_json,[]);
    const productPicker=(ids=[])=>products.map(p=>`<label class="page-product-option"><input type="checkbox" name="productIds" value="${esc(p.id)}" ${ids.includes(String(p.id))?'checked':''}><span>${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:'<i></i>'}<b>${esc(p.name)}</b><small>${brlCents(p.base_price_cents)} · ${esc(p.category_name||p.sale_type||'')}</small></span></label>`).join('')||'<div class="empty">Nenhum produto cadastrado nesta empresa.</div>';
    const cfgOptions=configs.map(c=>`<option value="${esc(c.id)}" ${String(x.configurator_id||'')===String(c.id)?'selected':''}>${esc(c.nome||c.id)}</option>`).join('');
    const parentOptions=pages.filter(p=>p.id!==x.id).map(p=>`<option value="${esc(p.id)}" ${String(x.nav_parent_id||'')===String(p.id)?'selected':''}>${esc(p.menu_label||p.title)}</option>`).join('');
    openModal(`<h2>${x.id?'Editar página':'Nova página'}</h2><form id="page-form" class="page-simple-editor">
      <div class="page-editor-section"><h3>Destino</h3><div class="form-grid">
        <div class="form-field full"><label>O que este item deve abrir?</label><select name="pageType" id="page-type"><option value="conteudo" ${x.page_type==='conteudo'||!x.page_type?'selected':''}>Página de conteúdo</option><option value="produtos" ${x.page_type==='produtos'?'selected':''}>Lista de produtos</option><option value="configurador" ${x.page_type==='configurador'?'selected':''}>Configurador</option><option value="link" ${x.page_type==='link'?'selected':''}>Link externo</option></select><small class="field-hint">O destino é salvo no banco e não depende do nome da página.</small></div>
        <div class="form-field full" id="cfg-wrap"><label>Configurador</label><select name="configuratorId"><option value="">Selecione...</option>${cfgOptions}</select><small class="field-hint">Apenas cria o vínculo. Tecidos, forros, fotos, preços e regras não são alterados.</small></div>
        <div class="form-field full" id="link-wrap"><label>Endereço</label><input name="externalUrl" value="${esc(x.external_url||'')}" placeholder="https://..."></div>
      </div></div>
      <div class="page-editor-section"><h3>Identificação e menu</h3><div class="form-grid">
        <div class="form-field full"><label>Nome da página</label><input name="title" required value="${esc(x.title||'')}"></div>
        <div class="form-field"><label>Nome no menu</label><input name="menuLabel" value="${esc(x.menu_label||x.title||'')}"></div>
        <div class="form-field"><label>Mostrar em</label><select name="navGroup"><option value="oculto" ${!x.nav_group||x.nav_group==='oculto'?'selected':''}>Não mostrar</option><option value="principal" ${x.nav_group==='principal'?'selected':''}>Menu principal</option><option value="rodape" ${x.nav_group==='rodape'?'selected':''}>Rodapé</option></select></div>
        <div class="form-field"><label>Submenu de</label><select name="navParentId"><option value="">Nenhum</option>${parentOptions}</select></div>
        <div class="form-field"><label>Ordem</label><input type="number" name="navOrder" value="${Number(x.nav_order??100)}"></div>
        <div class="form-field"><label><input type="checkbox" name="active" ${x.active!==0?'checked':''}> Publicada</label></div>
      </div></div>
      <div class="page-editor-section" id="products-wrap"><h3>Produtos desta página</h3><div class="page-product-picker">${productPicker(selected)}</div></div>
      <div class="page-editor-section" id="content-wrap"><h3>Conteúdo</h3><textarea name="contentHtml" style="min-height:220px;width:100%">${esc(x.content_html||'')}</textarea></div>
      <details class="page-editor-advanced"><summary>Configurações avançadas</summary><div class="form-grid" style="padding:16px"><div class="form-field"><label>Slug / URL</label><input name="slug" value="${esc(x.slug||'')}"></div><div class="form-field full"><label>Imagem de capa</label><input name="heroImageUrl" value="${esc(x.hero_image_url||'')}"></div><div class="form-field"><label>SEO título</label><input name="seoTitle" value="${esc(x.seo_title||'')}"></div><div class="form-field"><label>SEO descrição</label><input name="seoDescription" value="${esc(x.seo_description||'')}"></div></div></details>
      <div class="form-actions">${x.id?'<button type="button" id="delete-page" class="danger-btn">Excluir</button>':''}<button type="button" class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn">Salvar página</button></div>
    </form>`);
    const f=$('#page-form'),type=$('#page-type'),pw=$('#products-wrap'),cw=$('#content-wrap'),cfg=$('#cfg-wrap'),link=$('#link-wrap');
    const toggle=()=>{const t=type.value;pw.style.display=t==='produtos'?'block':'none';cw.style.display=t==='conteudo'?'block':'none';cfg.style.display=t==='configurador'?'block':'none';link.style.display=t==='link'?'block':'none'};type.onchange=toggle;toggle();
    f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),t=String(fd.get('pageType')||'conteudo');if(t==='configurador'&&!fd.get('configuratorId'))return alert('Selecione o configurador.');if(t==='link'&&!String(fd.get('externalUrl')||'').trim())return alert('Informe o endereço do link.');const body={title:fd.get('title'),menuLabel:fd.get('menuLabel'),slug:fd.get('slug'),pageType:t,configuratorId:t==='configurador'?fd.get('configuratorId'):'',navGroup:fd.get('navGroup'),navParentId:fd.get('navParentId'),navOrder:Number(fd.get('navOrder')||100),externalUrl:t==='link'?fd.get('externalUrl'):'',heroImageUrl:fd.get('heroImageUrl'),productIds:t==='produtos'?fd.getAll('productIds'):[],measures:t==='produtos'?measures:[],customMeasureUrl:'',contentHtml:t==='conteudo'?fd.get('contentHtml'):'',seoTitle:fd.get('seoTitle'),seoDescription:fd.get('seoDescription'),active:fd.get('active')==='on'};await api(x.id?'pages/'+x.id:'pages',{method:x.id?'PUT':'POST',body:JSON.stringify(body)});toast('Página salva');closeModal();await window.renderPages()};
    if(x.id)$('#delete-page').onclick=async()=>{if(confirm('Excluir página?')){await api('pages/'+x.id,{method:'DELETE'});closeModal();await window.renderPages()}};
  };
  const style=document.createElement('style');style.textContent='.page-simple-editor{display:grid;gap:16px}.page-editor-section{border:1px solid var(--line);border-radius:12px;padding:16px;background:#fff}.page-editor-section h3{margin:0 0 14px}.page-editor-advanced{border:1px solid var(--line);border-radius:12px;background:#fafbfc}.page-editor-advanced summary{padding:14px 16px;font-weight:700;cursor:pointer}.order-cell-sub{display:block;margin-top:4px;color:#7b8491}';document.head.appendChild(style);
})();