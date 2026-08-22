(()=>{
  const legacyConfigurator={configurador_wave:'wave',configurador_prega_macho:'prega-macho',configurador_ilhos:'cortina-varao',configurador_persiana:'persiana'};
  const normalizeType=v=>String(v||'conteudo').startsWith('configurador_')?'configurador':String(v||'conteudo');
  const normalizeNav=v=>['cortinas_sob_medida','persianas_sob_medida','pronta_entrega'].includes(String(v||''))?'principal':String(v||'oculto');
  const parseJson=(v,fallback=[])=>{try{return JSON.parse(v||'[]')}catch{return fallback}};

  pageForm=async function(x={},products=ADMIN.cache.pageProducts||[],allPages=ADMIN.cache.pages||[]){
    let configurators=[];
    try{const d=await api('configurators');configurators=d.configurators||[]}catch{}

    const selected=parseJson(x.product_ids_json,[]);
    const measures=parseJson(x.measures_json,[]);
    const type=normalizeType(x.page_type);
    const navGroup=normalizeNav(x.nav_group);
    const cfgId=x.configurator_id||legacyConfigurator[x.page_type]||'';
    const productPicker=(name,selectedIds=[])=>products.map(p=>`<label class="page-product-option"><input type="checkbox" name="${name}" value="${esc(p.id)}" ${selectedIds.includes(p.id)?'checked':''}><span>${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:'<i></i>'}<b>${esc(p.name)}</b><small>${brlCents(p.base_price_cents)} · ${esc(p.category_name||p.sale_type||'')}</small></span></label>`).join('')||'<div class="empty">Cadastre produtos antes de montar uma vitrine.</div>';
    const parentOptions=(allPages||[]).filter(p=>p.id!==x.id).map(p=>`<option value="${esc(p.id)}" ${x.nav_parent_id===p.id?'selected':''}>${esc(p.menu_label||p.title)}</option>`).join('');
    const cfgOptions=configurators.map(c=>`<option value="${esc(c.id)}" ${cfgId===c.id?'selected':''}>${esc(c.nome||c.id)}</option>`).join('');

    openModal(`<h2>${x.id?'Editar página':'Nova página'}</h2><form id="page-form" class="page-simple-editor">
      <div class="page-editor-section">
        <h3>O que este item deve abrir?</h3>
        <div class="form-field full"><label>Destino</label><select name="pageType" id="page-type">
          <option value="conteudo" ${type==='conteudo'?'selected':''}>Página de conteúdo</option>
          <option value="produtos" ${type==='produtos'?'selected':''}>Lista de produtos</option>
          <option value="configurador" ${type==='configurador'?'selected':''}>Configurador</option>
          <option value="link" ${type==='link'?'selected':''}>Link externo ou outra página</option>
        </select><small class="field-hint" id="destination-help"></small></div>
        <div class="form-field full" id="page-configurator-wrap"><label>Abrir configurador</label><select name="configuratorId"><option value="">Selecione o configurador...</option>${cfgOptions}</select><small class="field-hint">Aqui você só escolhe o destino. Tecidos, forros, fotos, preços e regras permanecem no cadastro do configurador.</small></div>
        <div class="form-field full" id="page-link-wrap"><label>Endereço do link</label><input name="externalUrl" value="${esc(x.external_url||'')}" placeholder="https://... ou /pagina"></div>
      </div>

      <div class="page-editor-section">
        <h3>Como aparecerá no site</h3>
        <div class="form-grid">
          <div class="form-field full"><label>Nome da página</label><input name="title" value="${esc(x.title||'')}" placeholder="Ex.: Produtos" required><small class="field-hint">Título exibido ao cliente dentro da página.</small></div>
          <div class="form-field"><label>Nome no menu</label><input name="menuLabel" value="${esc(x.menu_label||x.title||'')}" placeholder="Ex.: Produtos"><small class="field-hint">Pode ser mais curto que o título.</small></div>
          <div class="form-field"><label>Mostrar em</label><select name="navGroup"><option value="principal" ${navGroup==='principal'?'selected':''}>Menu principal</option><option value="rodape" ${navGroup==='rodape'?'selected':''}>Rodapé</option><option value="oculto" ${navGroup==='oculto'?'selected':''}>Não mostrar no menu</option></select></div>
          <div class="form-field"><label>Submenu de</label><select name="navParentId"><option value="">Nenhum — item principal</option>${parentOptions}</select></div>
          <div class="form-field"><label><input name="active" type="checkbox" ${x.active!==0?'checked':''}> Página publicada</label></div>
        </div>
      </div>

      <div id="page-products-wrap" class="page-editor-section"><h3>Produtos exibidos</h3><div class="form-field full"><div class="page-product-picker">${productPicker('productIds',selected)}</div></div><div id="page-measures-wrap"><div class="measure-admin-head"><div><label>Opções / medidas pré-definidas</label><small class="field-hint">Opcional. Use somente quando esta vitrine precisar de escolhas especiais.</small></div><button type="button" id="add-measure" class="ghost-btn">+ Adicionar opção</button></div><div id="measure-builder" class="measure-builder"></div><div class="form-field full custom-measure-field"><label>Destino alternativo</label><input name="customMeasureUrl" value="${esc(x.custom_measure_url||'')}" placeholder="/configurador"></div></div></div>

      <div id="page-content-wrap" class="page-editor-section"><h3>Conteúdo da página</h3><div class="form-field full"><label>Conteúdo HTML</label><textarea name="contentHtml" style="min-height:220px">${esc(x.content_html||'')}</textarea></div></div>

      <details class="page-editor-advanced"><summary>Configurações avançadas</summary><div class="form-grid">
        <div class="form-field"><label>Endereço / slug</label><input name="slug" value="${esc(x.slug||'')}" placeholder="produtos"><small class="field-hint">Não altere sem necessidade. O endereço pode continuar igual mesmo se o nome mudar.</small></div>
        <div class="form-field"><label>Ordem no menu</label><input name="navOrder" type="number" step="1" value="${Number(x.nav_order??100)}"><small class="field-hint">Menor número aparece primeiro.</small></div>
        <div class="form-field full"><label>Imagem de capa opcional</label><input name="heroImageUrl" value="${esc(x.hero_image_url||'')}" placeholder="https://..."></div>
        <div class="form-field"><label>SEO título</label><input name="seoTitle" value="${esc(x.seo_title||'')}"></div>
        <div class="form-field"><label>SEO descrição</label><input name="seoDescription" value="${esc(x.seo_description||'')}"></div>
      </div></details>

      <div class="form-actions">${x.id?'<button id="delete-page" type="button" class="danger-btn">Excluir</button>':''}<button type="button" class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn">Salvar página</button></div>
    </form>`);

    const f=$('#page-form'),typeEl=$('#page-type'),productsWrap=$('#page-products-wrap'),contentWrap=$('#page-content-wrap'),cfgWrap=$('#page-configurator-wrap'),linkWrap=$('#page-link-wrap'),builder=$('#measure-builder');
    let seq=0;
    function renderMeasure(m={}){seq++;const id=m.id||`opcao-${Date.now()}-${seq}`,productIds=Array.isArray(m.productIds)?m.productIds:[];const row=document.createElement('div');row.className='measure-admin-card';row.dataset.measureId=id;row.innerHTML=`<div class="measure-admin-row"><div class="form-field"><label>Texto exibido</label><input class="measure-label" value="${esc(m.label||'')}" placeholder="Ex.: Tamanho P"></div><div class="form-field"><label>Valor / referência</label><input class="measure-value" value="${esc(m.value||'')}"></div><button type="button" class="measure-remove danger-link">Remover</button></div><div class="form-field full"><label>Produtos desta opção</label><div class="page-product-picker measure-products">${productPicker('ignore',productIds)}</div></div>`;$$('.measure-products input',row).forEach(i=>i.removeAttribute('name'));$('.measure-remove',row).onclick=()=>row.remove();builder.appendChild(row)}
    measures.forEach(renderMeasure);
    $('#add-measure').onclick=()=>renderMeasure({});

    const help={conteudo:'Crie uma página com texto e conteúdo próprio.',produtos:'Mostra uma vitrine/lista com os produtos escolhidos abaixo.',configurador:'Leva o cliente diretamente para um configurador sob medida.',link:'Leva o cliente para outro endereço.'};
    const toggle=()=>{const t=typeEl.value;productsWrap.style.display=t==='produtos'?'block':'none';contentWrap.style.display=t==='conteudo'?'block':'none';cfgWrap.style.display=t==='configurador'?'block':'none';linkWrap.style.display=t==='link'?'block':'none';$('#destination-help').textContent=help[t]||''};
    typeEl.onchange=toggle;toggle();

    f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f);if(fd.get('pageType')==='configurador'&&!fd.get('configuratorId')){alert('Escolha qual configurador esta página deve abrir.');return}if(fd.get('pageType')==='link'&&!String(fd.get('externalUrl')||'').trim()){alert('Informe o endereço que este item deve abrir.');return}const measurePayload=$$('.measure-admin-card',builder).map(row=>({id:row.dataset.measureId,label:$('.measure-label',row).value.trim(),value:$('.measure-value',row).value.trim(),productIds:$$('.measure-products input:checked',row).map(i=>i.value)})).filter(m=>m.label);const body={title:fd.get('title'),menuLabel:fd.get('menuLabel'),slug:fd.get('slug'),pageType:fd.get('pageType'),configuratorId:fd.get('configuratorId'),navGroup:fd.get('navGroup'),navParentId:fd.get('navParentId'),navOrder:Number(fd.get('navOrder')||100),externalUrl:fd.get('externalUrl'),heroImageUrl:fd.get('heroImageUrl'),productIds:fd.getAll('productIds'),measures:measurePayload,customMeasureUrl:fd.get('customMeasureUrl'),contentHtml:fd.get('contentHtml'),seoTitle:fd.get('seoTitle'),seoDescription:fd.get('seoDescription'),active:fd.get('active')==='on'};await api(x.id?'pages/'+x.id:'pages',{method:x.id?'PUT':'POST',body:JSON.stringify(body)});toast('Página salva');closeModal();navigate('pages',true)};
    if(x.id)$('#delete-page').onclick=async()=>{if(confirm('Excluir página?')){await api('pages/'+x.id,{method:'DELETE'});closeModal();navigate('pages',true)}};
  };

  const style=document.createElement('style');
  style.textContent=`.page-simple-editor{display:grid;gap:16px}.page-editor-section{border:1px solid var(--line);border-radius:12px;padding:16px;background:#fff}.page-editor-section h3{margin:0 0 14px;font-size:14px}.page-editor-advanced{border:1px solid var(--line);border-radius:12px;background:#fafbfc}.page-editor-advanced summary{padding:14px 16px;font-weight:700;cursor:pointer}.page-editor-advanced[open] summary{border-bottom:1px solid var(--line)}.page-editor-advanced>.form-grid{padding:16px}.page-simple-editor .form-actions{margin-top:0}`;
  document.head.appendChild(style);
})();