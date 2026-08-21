(()=>{
  const legacyConfigurator={configurador_wave:'wave',configurador_prega_macho:'prega-macho',configurador_ilhos:'cortina-varao',configurador_persiana:'persiana'};
  const genericType=x=>String(x||'conteudo').startsWith('configurador_')?'configurador':String(x||'conteudo');
  const genericNav=x=>['cortinas_sob_medida','persianas_sob_medida','pronta_entrega'].includes(String(x||''))?'principal':String(x||'oculto');
  const pageTypeLabel=x=>({produtos:'Vitrine de produtos',conteudo:'Página de conteúdo',configurador:'Configurador',link:'Link'})[genericType(x)]||'Página de conteúdo';
  const parseIds=x=>{try{return JSON.parse(x||'[]')}catch{return[]}};
  const publicUrl=x=>{
    const type=genericType(x.page_type);
    const cfg=x.configurator_id||legacyConfigurator[x.page_type]||'';
    if(type==='configurador')return cfg==='persiana'?`../configurador-persiana.html?id=persiana`:`../configurador.html?id=${encodeURIComponent(cfg)}`;
    if(type==='link'&&x.external_url)return x.external_url;
    return `../pagina.html?slug=${encodeURIComponent(x.slug||'')}`;
  };

  renderPages=async function(){
    const [d,p]=await Promise.all([api('pages'),api('catalog/products')]);
    ADMIN.cache.pageProducts=p.products||[];
    ADMIN.cache.pages=d.pages||[];
    const c=$('#view-content');
    c.innerHTML=`<div class="page-toolbar"><div><div class="orders-help">Crie páginas e organize o menu da loja sem depender do segmento da empresa.</div></div><button id="new-page" class="primary-btn">+ Nova página</button></div><section class="panel"><table class="admin-table"><thead><tr><th>Página</th><th>Menu</th><th>Tipo</th><th>URL</th><th>Status</th><th>Atualizada</th><th></th></tr></thead><tbody>${(d.pages||[]).map(x=>`<tr data-page='${encodeURIComponent(JSON.stringify(x))}'><td><b>${esc(x.title)}</b><br><small>${esc(x.slug||'')}</small></td><td>${esc(x.menu_label||x.title)}<br><small>${genericNav(x.nav_group)==='principal'?'Menu principal':genericNav(x.nav_group)==='rodape'?'Rodapé':'Oculta'}</small></td><td>${pageTypeLabel(x.page_type)}</td><td><a href="${esc(publicUrl(x))}" target="_blank">Abrir ↗</a></td><td>${x.active?'Publicada':'Rascunho'}</td><td>${dateTime(x.updated_at)}</td><td><button class="ghost-btn edit-page">Editar</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">Nenhuma página criada.</td></tr>'}</tbody></table></section>`;
    $('#new-page').onclick=()=>pageForm({},ADMIN.cache.pageProducts,ADMIN.cache.pages);
    $$('.edit-page',c).forEach(b=>b.onclick=()=>pageForm(JSON.parse(decodeURIComponent(b.closest('tr').dataset.page)),ADMIN.cache.pageProducts,ADMIN.cache.pages));
  };

  pageForm=async function(x={},products=ADMIN.cache.pageProducts||[],allPages=ADMIN.cache.pages||[]){
    let configurators=[];
    try{const d=await api('configurators');configurators=d.configurators||[]}catch{}
    let selected=parseIds(x.product_ids_json),measures=[];try{measures=JSON.parse(x.measures_json||'[]')}catch{}
    const type=genericType(x.page_type),navGroup=genericNav(x.nav_group),cfgId=x.configurator_id||legacyConfigurator[x.page_type]||'';
    const productPicker=(name,selectedIds=[])=>products.map(p=>`<label class="page-product-option"><input type="checkbox" name="${name}" value="${esc(p.id)}" ${selectedIds.includes(p.id)?'checked':''}><span>${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:'<i></i>'}<b>${esc(p.name)}</b><small>${brlCents(p.base_price_cents)} · ${esc(p.category_name||p.sale_type||'')}</small></span></label>`).join('')||'<div class="empty">Cadastre produtos antes de montar uma vitrine.</div>';
    const parentOptions=(allPages||[]).filter(p=>p.id!==x.id).map(p=>`<option value="${esc(p.id)}" ${x.nav_parent_id===p.id?'selected':''}>${esc(p.menu_label||p.title)}</option>`).join('');
    const cfgOptions=configurators.map(c=>`<option value="${esc(c.id)}" ${cfgId===c.id?'selected':''}>${esc(c.nome||c.id)}</option>`).join('');
    openModal(`<h2>${x.id?'Editar página':'Nova página'}</h2><form id="page-form"><div class="form-grid">
      <div class="form-field full"><label>Título da página</label><input name="title" value="${esc(x.title||'')}" placeholder="Ex.: Coleção Feminina" required><small class="field-hint">Título exibido dentro da página. Pode ser diferente do nome no menu.</small></div>
      <div class="form-field"><label>Nome no menu</label><input name="menuLabel" value="${esc(x.menu_label||x.title||'')}" placeholder="Ex.: Feminino"><small class="field-hint">Texto curto mostrado na navegação.</small></div>
      <div class="form-field"><label>Endereço / slug</label><input name="slug" value="${esc(x.slug||'')}" placeholder="colecao-feminina"><small class="field-hint">Pode permanecer igual mesmo se você mudar o título.</small></div>
      <div class="form-field"><label>Tipo de página</label><select name="pageType" id="page-type"><option value="produtos" ${type==='produtos'?'selected':''}>Vitrine de produtos</option><option value="conteudo" ${type==='conteudo'?'selected':''}>Página de conteúdo</option><option value="configurador" ${type==='configurador'?'selected':''}>Configurador</option><option value="link" ${type==='link'?'selected':''}>Link</option></select></div>
      <div class="form-field" id="page-configurator-wrap"><label>Configurador vinculado</label><select name="configuratorId"><option value="">Selecione...</option>${cfgOptions}</select><small class="field-hint">A página apenas aponta para o configurador. Tecidos, forros, fotos, preços e regras continuam no cadastro do configurador e não são alterados aqui.</small></div>
      <div class="form-field" id="page-link-wrap"><label>Destino do link</label><input name="externalUrl" value="${esc(x.external_url||'')}" placeholder="https://... ou /pagina"><small class="field-hint">Use para levar o cliente a outro endereço.</small></div>
      <div class="form-field"><label>Exibir no site</label><select name="navGroup"><option value="oculto" ${navGroup==='oculto'?'selected':''}>Não exibir no menu</option><option value="principal" ${navGroup==='principal'?'selected':''}>Menu principal</option><option value="rodape" ${navGroup==='rodape'?'selected':''}>Rodapé</option></select></div>
      <div class="form-field"><label>Item pai / submenu</label><select name="navParentId"><option value="">Nenhum — item principal</option>${parentOptions}</select><small class="field-hint">Escolha outra página para transformar este item em submenu.</small></div>
      <div class="form-field"><label>Ordem</label><input name="navOrder" type="number" step="1" value="${Number(x.nav_order??100)}"><small class="field-hint">Menor número aparece primeiro.</small></div>
      <div class="form-field"><label><input name="active" type="checkbox" ${x.active!==0?'checked':''}> Publicada</label></div>
      <div class="form-field full"><label>Imagem de capa opcional</label><input name="heroImageUrl" value="${esc(x.hero_image_url||'')}" placeholder="https://..."></div>
      <div id="page-products-wrap" class="form-field full"><label>Produtos desta vitrine</label><div class="page-product-picker">${productPicker('productIds',selected)}</div></div>
      <div id="page-measures-wrap" class="form-field full"><div class="measure-admin-head"><div><label>Opções / medidas pré-definidas</label><small class="field-hint">Opcional. Vincule produtos específicos a cada opção.</small></div><button type="button" id="add-measure" class="ghost-btn">+ Adicionar opção</button></div><div id="measure-builder" class="measure-builder"></div><div class="form-field full custom-measure-field"><label>Destino alternativo</label><input name="customMeasureUrl" value="${esc(x.custom_measure_url||'')}" placeholder="/configurador"><small class="field-hint">Opcional para vitrines com escolha especial.</small></div></div>
      <div id="page-content-wrap" class="form-field full"><label>Conteúdo HTML</label><textarea name="contentHtml" style="min-height:220px">${esc(x.content_html||'')}</textarea></div>
      <div class="form-field"><label>SEO título</label><input name="seoTitle" value="${esc(x.seo_title||'')}"></div><div class="form-field"><label>SEO descrição</label><input name="seoDescription" value="${esc(x.seo_description||'')}"></div>
    </div><div class="form-actions">${x.id?'<button id="delete-page" type="button" class="danger-btn">Excluir</button>':''}<button type="button" class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn">Salvar página</button></div></form>`);
    const f=$('#page-form'),typeEl=$('#page-type'),productsWrap=$('#page-products-wrap'),contentWrap=$('#page-content-wrap'),measuresWrap=$('#page-measures-wrap'),cfgWrap=$('#page-configurator-wrap'),linkWrap=$('#page-link-wrap'),builder=$('#measure-builder');let seq=0;
    function renderMeasure(m={}){seq++;const id=m.id||`opcao-${Date.now()}-${seq}`,productIds=Array.isArray(m.productIds)?m.productIds:[];const row=document.createElement('div');row.className='measure-admin-card';row.dataset.measureId=id;row.innerHTML=`<div class="measure-admin-row"><div class="form-field"><label>Texto exibido</label><input class="measure-label" value="${esc(m.label||'')}" placeholder="Ex.: Tamanho P"></div><div class="form-field"><label>Valor / referência</label><input class="measure-value" value="${esc(m.value||'')}"></div><button type="button" class="measure-remove danger-link">Remover</button></div><div class="form-field full"><label>Produtos desta opção</label><div class="page-product-picker measure-products">${productPicker('ignore',productIds)}</div></div>`;$$('.measure-products input',row).forEach(i=>i.removeAttribute('name'));$('.measure-remove',row).onclick=()=>row.remove();builder.appendChild(row)}
    measures.forEach(renderMeasure);$('#add-measure').onclick=()=>renderMeasure({});
    const toggle=()=>{const t=typeEl.value;productsWrap.style.display=t==='produtos'?'block':'none';measuresWrap.style.display=t==='produtos'?'block':'none';contentWrap.style.display=t==='conteudo'?'block':'none';cfgWrap.style.display=t==='configurador'?'block':'none';linkWrap.style.display=t==='link'?'block':'none'};typeEl.onchange=toggle;toggle();
    f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),measurePayload=$$('.measure-admin-card',builder).map(row=>({id:row.dataset.measureId,label:$('.measure-label',row).value.trim(),value:$('.measure-value',row).value.trim(),productIds:$$('.measure-products input:checked',row).map(i=>i.value)})).filter(m=>m.label);const body={title:fd.get('title'),menuLabel:fd.get('menuLabel'),slug:fd.get('slug'),pageType:fd.get('pageType'),configuratorId:fd.get('configuratorId'),navGroup:fd.get('navGroup'),navParentId:fd.get('navParentId'),navOrder:Number(fd.get('navOrder')||100),externalUrl:fd.get('externalUrl'),heroImageUrl:fd.get('heroImageUrl'),productIds:fd.getAll('productIds'),measures:measurePayload,customMeasureUrl:fd.get('customMeasureUrl'),contentHtml:fd.get('contentHtml'),seoTitle:fd.get('seoTitle'),seoDescription:fd.get('seoDescription'),active:fd.get('active')==='on'};await api(x.id?'pages/'+x.id:'pages',{method:x.id?'PUT':'POST',body:JSON.stringify(body)});toast('Página salva');closeModal();navigate('pages',true)};
    if(x.id)$('#delete-page').onclick=async()=>{if(confirm('Excluir página?')){await api('pages/'+x.id,{method:'DELETE'});closeModal();navigate('pages',true)}};
  };
})();
