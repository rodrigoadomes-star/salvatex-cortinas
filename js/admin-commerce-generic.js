(()=>{
  const closeSafe=()=>{try{if(typeof closeModal==='function')return closeModal()}catch{}const m=document.getElementById('admin-modal');if(m)m.hidden=true};
  const feature=(key,def=false)=>{try{return window.RADZ_FEATURES?.isEnabled(key,def)??def}catch{return def}};

  if(typeof productForm==='function'){
    const originalProductForm=productForm;
    productForm=function(p,cats){
      originalProductForm(p,cats);
      const f=document.getElementById('product-form');if(!f)return;
      const sale=f.elements.saleType;
      if(sale){sale.innerHTML=`<option value="pronta_entrega">Produto padrão / pronta entrega</option><option value="sob_encomenda">Sob encomenda</option><option value="digital">Produto digital</option><option value="servico">Serviço</option><option value="acessorio">Acessório</option>`;sale.value=p?.sale_type||'pronta_entrega';}
      const conf=f.elements.configurator;
      if(conf){
        const field=conf.closest('.form-field');
        if(!feature('configurator',false)){if(field)field.remove();}
        else{conf.innerHTML=`<option value="">Nenhum</option><option value="wave">Cortina Wave</option><option value="ilhos">Cortina Ilhós</option><option value="prega_macho">Prega Macho</option><option value="persiana">Persiana</option>`;conf.value=p?.configurator||'';}
      }
      const price=f.elements.basePrice?.closest('.form-field');
      if(price&&!f.elements.comparePrice){const wrap=document.createElement('div');wrap.className='form-field';wrap.innerHTML=`<label>Preço anterior / comparação (R$)</label><input name="comparePrice" type="number" min="0" step="0.01" value="${Number(p?.compare_price_cents||0)/100||''}" placeholder="Opcional">`;price.insertAdjacentElement('afterend',wrap)}
      const active=f.elements.active?.closest('.form-field');
      if(active&&!f.elements.featured){const wrap=document.createElement('div');wrap.className='form-field';wrap.innerHTML=`<label><input name="featured" type="checkbox" ${p?.featured?'checked':''}> Destacar na vitrine</label>`;active.insertAdjacentElement('afterend',wrap)}
      const previousSubmit=f.onsubmit;
      f.onsubmit=async e=>{
        e.preventDefault();
        const fd=new FormData(f),button=f.querySelector('[type="submit"]');if(button)button.disabled=true;
        const body={name:fd.get('name'),categoryId:fd.get('categoryId'),sku:fd.get('sku'),saleType:fd.get('saleType')||'pronta_entrega',productType:fd.get('saleType')||'pronta_entrega',configurator:feature('configurator',false)?fd.get('configurator')||'':'',basePrice:fd.get('basePrice'),comparePrice:fd.get('comparePrice'),stock:fd.get('stock'),imageUrl:fd.get('imageUrl'),description:fd.get('description'),active:fd.get('active')==='on',trackStock:fd.get('trackStock')==='on',featured:fd.get('featured')==='on'};
        try{await api(p?.id?'catalog/products/'+p.id:'catalog/products',{method:p?.id?'PUT':'POST',body:JSON.stringify(body)});toast('Produto salvo');closeSafe();navigate('products',true)}catch(error){toast(error?.message||'Não foi possível salvar o produto');const status=f.querySelector('.product-save-error')||document.createElement('p');status.className='product-save-error';status.style.cssText='color:#b42318;margin:10px 0 0';status.textContent=error?.message||'Não foi possível salvar o produto';f.appendChild(status)}finally{if(button)button.disabled=false}
      };
    };
  }

  if(typeof renderPages==='function'&&typeof pageForm==='function'){
    renderPages=async function(){
      const [d,p]=await Promise.all([api('pages'),api('catalog/products')]);ADMIN.cache.pageProducts=p.products||[];const c=document.getElementById('view-content');
      const typeName=x=>x==='produtos'?'Vitrine de produtos':x==='link'?'Link':x&&x.startsWith('configurador_')?'Configurador':'Conteúdo';
      const menuName=x=>x==='principal'?'Menu principal':x==='rodape'?'Rodapé':x==='oculto'?'Oculta':(['cortinas_sob_medida','persianas_sob_medida','pronta_entrega'].includes(x)?'Menu principal':'Oculta');
      c.innerHTML=`<div class="page-toolbar"><div><div class="orders-help">Crie páginas, vitrines e links. O nome, posição e destino do menu são definidos por você.</div></div><button id="new-page" class="primary-btn">+ Nova página / item de menu</button></div><section class="panel"><div class="table-wrap"><table class="admin-table"><thead><tr><th>Página / menu</th><th>Tipo</th><th>URL</th><th>Menu</th><th>Ordem</th><th>Status</th><th></th></tr></thead><tbody>${(d.pages||[]).map(x=>{const href=x.page_type==='link'?(x.external_url||'#'):`../pagina.html?slug=${encodeURIComponent(x.slug)}`;return `<tr data-page='${encodeURIComponent(JSON.stringify(x))}'><td><b>${esc(x.menu_label||x.title)}</b><br><small>${esc(x.title)}</small></td><td>${typeName(x.page_type)}</td><td><a href="${esc(href)}" target="_blank" rel="noopener">${x.page_type==='link'?esc(x.external_url||'—'):'/'+esc(x.slug)} ↗</a></td><td>${menuName(x.nav_group)}</td><td>${Number(x.nav_order||100)}</td><td>${x.active?'Publicada':'Rascunho'}</td><td><button class="ghost-btn edit-page">Editar</button></td></tr>`}).join('')||'<tr><td colspan="7" class="empty">Nenhuma página criada.</td></tr>'}</tbody></table></div></section>`;
      document.getElementById('new-page').onclick=()=>pageForm({},ADMIN.cache.pageProducts);document.querySelectorAll('.edit-page').forEach(b=>b.onclick=()=>pageForm(JSON.parse(decodeURIComponent(b.closest('tr').dataset.page)),ADMIN.cache.pageProducts));
    };
    const originalPageForm=pageForm;
    pageForm=function(x={},products=[]){
      originalPageForm(x,products);const f=document.getElementById('page-form');if(!f)return;
      const title=f.elements.title;if(title)title.placeholder='Ex.: Roupas, Sobre nós, Ofertas';const slug=f.elements.slug;if(slug)slug.placeholder='ex.: roupas-femininas';
      const type=f.elements.pageType;if(type){
        const current=x.page_type||'conteudo';let html='<option value="produtos">Vitrine de produtos</option><option value="conteudo">Página de conteúdo</option><option value="link">Link personalizado</option>';
        if(feature('configurator',false))html+='<option value="configurador_wave">Configurador — Cortina Wave</option><option value="configurador_prega_macho">Configurador — Prega Macho</option><option value="configurador_ilhos">Configurador — Ilhós</option><option value="configurador_persiana">Configurador — Persiana</option>';
        type.innerHTML=html;type.value=[...type.options].some(o=>o.value===current)?current:'conteudo';
      }
      const nav=f.elements.navGroup;if(nav){const current=['cortinas_sob_medida','persianas_sob_medida','pronta_entrega'].includes(x.nav_group)?'principal':(x.nav_group||'oculto');nav.innerHTML='<option value="principal">Menu principal</option><option value="rodape">Rodapé</option><option value="oculto">Não exibir no menu</option>';nav.value=current;}
      if(title&&!f.elements.menuLabel){const wrap=document.createElement('div');wrap.className='form-field';wrap.innerHTML=`<label>Nome exibido no menu</label><input name="menuLabel" maxlength="120" value="${esc(x.menu_label||x.title||'')}" placeholder="Pode ser diferente do título"><small class="field-hint">Ex.: a página pode se chamar “Coleção Verão” e aparecer no menu como “Roupas”.</small>`;title.closest('.form-field')?.insertAdjacentElement('afterend',wrap)}
      if(type&&!f.elements.externalUrl){const wrap=document.createElement('div');wrap.className='form-field full' ;wrap.id='page-external-field';wrap.innerHTML=`<label>Destino do link</label><input name="externalUrl" value="${esc(x.external_url||'')}" placeholder="/contato ou https://..."><small class="field-hint">Usado somente quando o tipo for Link personalizado.</small>`;type.closest('.form-field')?.insertAdjacentElement('afterend',wrap)}
      const toggleGeneric=()=>{const isLink=f.elements.pageType?.value==='link',ext=document.getElementById('page-external-field');if(ext)ext.style.display=isLink?'':'none';const content=f.elements.contentHtml?.closest('.form-field');if(content)content.style.display=isLink?'none':'';};
      f.elements.pageType?.addEventListener('change',toggleGeneric);toggleGeneric();
      f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),builder=document.getElementById('measure-builder');const measurePayload=builder?[...builder.querySelectorAll('.measure-admin-card')].map(row=>({id:row.dataset.measureId,label:row.querySelector('.measure-label')?.value.trim()||'',value:row.querySelector('.measure-value')?.value.trim()||'',productIds:[...row.querySelectorAll('.measure-products input:checked')].map(i=>i.value)})).filter(m=>m.label):[];const body={title:fd.get('title'),menuLabel:fd.get('menuLabel')||fd.get('title'),slug:fd.get('slug'),pageType:fd.get('pageType'),navGroup:fd.get('navGroup'),navOrder:Number(fd.get('navOrder')||100),heroImageUrl:fd.get('heroImageUrl'),productIds:fd.getAll('productIds'),measures:measurePayload,customMeasureUrl:fd.get('customMeasureUrl'),externalUrl:fd.get('externalUrl'),contentHtml:fd.get('contentHtml'),seoTitle:fd.get('seoTitle'),seoDescription:fd.get('seoDescription'),active:fd.get('active')==='on'};try{await api(x.id?'pages/'+x.id:'pages',{method:x.id?'PUT':'POST',body:JSON.stringify(body)});toast('Página salva');closeSafe();navigate('pages',true)}catch(error){toast(error?.message||'Não foi possível salvar a página')}};
    };
  }
})();
