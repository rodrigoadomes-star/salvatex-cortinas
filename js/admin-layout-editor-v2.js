(()=>{
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state={layout:{},config:{},pages:[],selected:null,renderToken:0};
  async function getJson(url,opt={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers:{accept:'application/json','content-type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Falha ao carregar.');return d}
  const clone=v=>{try{return structuredClone(v)}catch{return JSON.parse(JSON.stringify(v||{}))}};
  const get=(obj,path,fallback='')=>path.split('.').reduce((o,k)=>o&&o[k]!==undefined?o[k]:undefined,obj)??fallback;
  const set=(obj,path,value)=>{const parts=path.split('.');let cur=obj;parts.forEach((k,i)=>{if(i===parts.length-1)cur[k]=value;else cur=cur[k]&&typeof cur[k]==='object'?cur[k]:(cur[k]={})});};
  const field=(label,value,scope,path,type='text',extra='')=>`<label class="ve-field"><span>${esc(label)}</span><input type="${type}" value="${esc(value)}" data-scope="${scope}" data-path="${path}" ${extra}></label>`;
  const textarea=(label,value,scope,path)=>`<label class="ve-field"><span>${esc(label)}</span><textarea data-scope="${scope}" data-path="${path}">${esc(value)}</textarea></label>`;
  function editorCss(){return `<style id="visual-editor-css">.ve-shell{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px;align-items:start}.ve-preview-card,.ve-inspector{background:#fff;border:1px solid #e2e7ef;border-radius:14px;overflow:hidden}.ve-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #e8edf3}.ve-toolbar strong{font-size:14px}.ve-toolbar-actions{display:flex;gap:8px;align-items:center}.ve-frame-wrap{background:#eef2f7;padding:12px}.ve-frame{width:100%;height:720px;border:0;border-radius:10px;background:#fff;display:block}.ve-inspector{position:sticky;top:18px;max-height:calc(100vh - 140px);overflow:auto}.ve-inspector-head{padding:16px 16px 12px;border-bottom:1px solid #edf1f5}.ve-inspector-head h3{margin:0 0 4px;font-size:17px}.ve-inspector-head p{margin:0;color:#667085;font-size:12px}.ve-inspector-body{padding:16px;display:grid;gap:14px}.ve-field{display:grid;gap:6px}.ve-field span{font-size:12px;font-weight:800;color:#344054}.ve-field input,.ve-field textarea,.ve-field select{width:100%;box-sizing:border-box;border:1px solid #d5dce6;border-radius:9px;padding:10px 11px;background:#fff;color:#132238;font:inherit}.ve-field textarea{min-height:86px;resize:vertical}.ve-save{display:flex;gap:9px;align-items:center;position:sticky;bottom:0;background:#fff;padding-top:8px}.ve-save .primary-btn{flex:1}.ve-hint{font-size:12px;color:#667085;line-height:1.45}.ve-result{font-size:12px;font-weight:700;min-height:18px}.ve-general{display:grid;gap:12px;padding:14px;background:#f8fafc;border:1px solid #e8edf3;border-radius:10px}.ve-general h4{margin:0}.ve-chip{border:1px solid #d5dce6;background:#fff;border-radius:999px;padding:7px 10px;cursor:pointer;font-weight:700}.ve-chip.active{background:#102a43;color:#fff;border-color:#102a43}@media(max-width:1180px){.ve-shell{grid-template-columns:1fr}.ve-inspector{position:static;max-height:none}.ve-frame{height:620px}}</style>`}
  function layoutShell(){return `${editorCss()}<div class="ve-shell"><section class="ve-preview-card"><div class="ve-toolbar"><div><strong>Editor visual</strong><div class="ve-hint">Clique diretamente em textos, botões, menu ou imagem para editar.</div></div><div class="ve-toolbar-actions"><button class="ve-chip" id="ve-general">Configurações gerais</button><button class="outline-btn" id="ve-reload">Atualizar espelho ↻</button><a class="outline-btn" href="/" target="_blank">Abrir loja ↗</a></div></div><div class="ve-frame-wrap"><iframe id="ve-frame" class="ve-frame" src="/?radz-preview=1" title="Espelho da loja"></iframe></div></section><aside class="ve-inspector"><div class="ve-inspector-head"><h3 id="ve-title">Selecione algo no site</h3><p id="ve-subtitle">As alterações são exclusivas desta empresa.</p></div><div class="ve-inspector-body" id="ve-body"><div class="ve-hint">Clique em um item dentro do espelho. O código da loja permanece protegido; você altera apenas conteúdo, links, cores e imagens.</div></div></aside></div>`}
  function generalPanel(){
    const b=state.layout.branding||{},colors=b.colors||{};
    return `<div class="ve-general"><h4>Identidade da loja</h4>${field('Nome exibido',state.config.storeName||'','config','storeName')}${field('Logo (URL)',b.logo||'','layout','branding.logo')}${field('Cor principal',colors.primary||'#102a43','layout','branding.colors.primary','color')}${field('Cor de destaque',colors.accent||'#c49a58','layout','branding.colors.accent','color')}</div><div class="ve-save"><button class="primary-btn" id="ve-save">Salvar alterações</button></div><div id="ve-result" class="ve-result"></div>`;
  }
  function selectionDef(key){
    const l=state.layout,c=state.config;
    const defs={
      brand:{title:'Marca / logo',fields:()=>`${field('Nome exibido',c.storeName||'','config','storeName')}${field('Logo (URL)',get(l,'branding.logo'),'layout','branding.logo')}`},
      contactNav:{title:'Menu: contato',fields:()=>field('Texto do menu',get(l,'navigation.contactLabel','Contato'),'layout','navigation.contactLabel')},
      accountNav:{title:'Menu: minha conta',fields:()=>field('Texto do menu',get(l,'navigation.accountLabel','Minha conta'),'layout','navigation.accountLabel')},
      cartNav:{title:'Menu: carrinho',fields:()=>field('Texto do menu',get(l,'navigation.cartLabel','Carrinho'),'layout','navigation.cartLabel')},
      categoriesNav:{title:'Menu: categorias',fields:()=>field('Texto do menu',get(l,'navigation.categoriesLabel','Categorias'),'layout','navigation.categoriesLabel')},
      productsNav:{title:'Menu: produtos',fields:()=>field('Texto do menu',get(l,'navigation.productsLabel','Produtos'),'layout','navigation.productsLabel')},
      heroEyebrow:{title:'Texto superior do banner',fields:()=>field('Texto',get(l,'hero.eyebrow'),'layout','hero.eyebrow')},
      heroTitle:{title:'Título principal',fields:()=>textarea('Título',get(l,'hero.title'),'layout','hero.title')},
      heroSubtitle:{title:'Subtítulo principal',fields:()=>textarea('Subtítulo',get(l,'hero.subtitle'),'layout','hero.subtitle')},
      primaryAction:{title:'Botão principal',fields:()=>`${field('Texto',get(l,'hero.primaryAction.label','Ver produtos'),'layout','hero.primaryAction.label')}${field('Destino',get(l,'hero.primaryAction.href','#produtos'),'layout','hero.primaryAction.href')}`},
      secondaryAction:{title:'Botão secundário',fields:()=>`${field('Texto',get(l,'hero.secondaryAction.label','Explorar categorias'),'layout','hero.secondaryAction.label')}${field('Destino',get(l,'hero.secondaryAction.href','#categorias'),'layout','hero.secondaryAction.href')}`},
      heroImage:{title:'Imagem principal',fields:()=>field('URL da imagem',get(l,'hero.image'),'layout','hero.image')},
      categoriesEyebrow:{title:'Seção de categorias',fields:()=>field('Texto superior',get(l,'sections.categoriesEyebrow','CATEGORIAS'),'layout','sections.categoriesEyebrow')},
      categoriesTitle:{title:'Título de categorias',fields:()=>field('Título',get(l,'sections.categoriesTitle','Encontre o que procura'),'layout','sections.categoriesTitle')},
      productsEyebrow:{title:'Seção de produtos',fields:()=>field('Texto superior',get(l,'sections.productsEyebrow','CATÁLOGO'),'layout','sections.productsEyebrow')},
      productsTitle:{title:'Título de produtos',fields:()=>field('Título',get(l,'sections.productsTitle','Produtos em destaque'),'layout','sections.productsTitle')},
      contactEyebrow:{title:'Seção de contato',fields:()=>field('Texto superior',get(l,'sections.contactEyebrow','CONTATO'),'layout','sections.contactEyebrow')},
      contactTitle:{title:'Título de contato',fields:()=>field('Título',get(l,'sections.contactTitle','Fale com a gente'),'layout','sections.contactTitle')},
      contactText:{title:'Texto de contato',fields:()=>textarea('Texto',get(l,'contact.text',get(c,'contact.text','Envie uma mensagem para a loja.')),'layout','contact.text')},
      benefit1:{title:'Benefício 1',fields:()=>`${field('Título',get(l,'sections.benefits.0.title','Compra simples'),'layout','sections.benefits.0.title')}${textarea('Texto',get(l,'sections.benefits.0.text','Navegue pelo catálogo de forma rápida e organizada.'),'layout','sections.benefits.0.text')}`},
      benefit2:{title:'Benefício 2',fields:()=>`${field('Título',get(l,'sections.benefits.1.title','Atendimento da loja'),'layout','sections.benefits.1.title')}${textarea('Texto',get(l,'sections.benefits.1.text','Entre em contato pelos canais configurados pela empresa.'),'layout','sections.benefits.1.text')}`},
      benefit3:{title:'Benefício 3',fields:()=>`${field('Título',get(l,'sections.benefits.2.title','Ambiente seguro'),'layout','sections.benefits.2.title')}${textarea('Texto',get(l,'sections.benefits.2.text','Sua experiência é protegida pela infraestrutura RADZ HUB.'),'layout','sections.benefits.2.text')}`},
      footerText:{title:'Rodapé',fields:()=>textarea('Texto do rodapé',get(l,'footer.text',c.footerText||''),'layout','footer.text')}
    };return defs[key]||null;
  }
  function showGeneral(){state.selected={type:'general'};$('#ve-title').textContent='Configurações gerais';$('#ve-subtitle').textContent='Identidade visual desta empresa.';$('#ve-body').innerHTML=generalPanel();bindInspector();}
  function showSelection(sel){state.selected=sel;const body=$('#ve-body');if(sel.type==='page'){
      const p=sel.page;$('#ve-title').textContent='Item de menu';$('#ve-subtitle').textContent='Edite o nome exibido no menu sem alterar o código.';body.innerHTML=`${field('Texto no menu',p.menu_label||p.title||'','page','menuLabel')}${field('Título da página',p.title||'','page','title')}<div class="ve-save"><button class="primary-btn" id="ve-save">Salvar menu</button></div><div id="ve-result" class="ve-result"></div>`;bindInspector();return;
    }
    const d=selectionDef(sel.key);if(!d)return;$('#ve-title').textContent=d.title;$('#ve-subtitle').textContent='Clique em salvar para publicar nesta loja.';body.innerHTML=`${d.fields()}<div class="ve-save"><button class="primary-btn" id="ve-save">Salvar alterações</button></div><div id="ve-result" class="ve-result"></div>`;bindInspector();
  }
  function pagePayload(p,changes){
    const parse=a=>{try{return JSON.parse(a||'[]')}catch{return[]}};
    return {title:changes.title??p.title,slug:p.slug,pageType:p.page_type||'conteudo',contentHtml:p.content_html||'',seoTitle:p.seo_title||'',seoDescription:p.seo_description||'',active:Number(p.active)!==0,productIds:parse(p.product_ids_json),heroImageUrl:p.hero_image_url||'',measures:parse(p.measures_json),customMeasureUrl:p.custom_measure_url||'',navGroup:p.nav_group||'principal',navOrder:Number(p.nav_order||100),menuLabel:changes.menuLabel??p.menu_label??p.title,externalUrl:p.external_url||'',navParentId:p.nav_parent_id||''};
  }
  async function saveInspector(){
    const out=$('#ve-result'),btn=$('#ve-save');if(!btn)return;btn.disabled=true;out.textContent='Salvando…';out.style.color='';
    try{
      if(state.selected?.type==='page'){
        const p=state.selected.page,menuLabel=$('[data-scope="page"][data-path="menuLabel"]')?.value.trim()||p.title,title=$('[data-scope="page"][data-path="title"]')?.value.trim()||p.title;
        await getJson('/admin/api/pages/'+encodeURIComponent(p.id),{method:'PUT',body:JSON.stringify(pagePayload(p,{menuLabel,title}))});p.menu_label=menuLabel;p.title=title;
      }else{
        const nextLayout=clone(state.layout),configPatch={};document.querySelectorAll('#ve-body [data-scope]').forEach(el=>{const value=el.type==='color'?el.value:(el.value||'').trim();if(el.dataset.scope==='layout')set(nextLayout,el.dataset.path,value);else if(el.dataset.scope==='config')set(configPatch,el.dataset.path,value)});
        const tasks=[getJson('/admin/api/layout',{method:'PUT',body:JSON.stringify({layout:nextLayout})})];if(Object.keys(configPatch).length)tasks.push(getJson('/admin/api/config',{method:'PUT',body:JSON.stringify({config:configPatch})}));await Promise.all(tasks);state.layout=nextLayout;Object.assign(state.config,configPatch);
      }
      out.style.color='#16794b';out.textContent='Publicado com sucesso.';reloadFrame();
    }catch(err){out.style.color='#b42318';out.textContent=err.message||'Não foi possível salvar.'}finally{btn.disabled=false}
  }
  function livePreview(el){
    const frame=$('#ve-frame');if(!frame?.contentDocument)return;const doc=frame.contentDocument,path=el.dataset.path,val=el.value;
    const map={'hero.eyebrow':'#eyebrow','hero.title':'#hero-title','hero.subtitle':'#hero-subtitle','hero.primaryAction.label':'#primary-action','hero.secondaryAction.label':'#secondary-action','sections.categoriesEyebrow':'#categories-eyebrow','sections.categoriesTitle':'#categories-title','sections.productsEyebrow':'#products-eyebrow','sections.productsTitle':'#products-title','sections.contactEyebrow':'#contact-eyebrow','sections.contactTitle':'#contact-title','contact.text':'#contact-copy','footer.text':'#footer-text','navigation.contactLabel':'#contact-link','navigation.accountLabel':'#account-link','navigation.cartLabel':'#cart-label'};
    if(el.dataset.scope==='config'&&path==='storeName'){const b=doc.querySelector('#brand'),fb=doc.querySelector('#footer-brand');if(b)b.textContent=val.toUpperCase();if(fb)fb.textContent=val.toUpperCase();return}
    if(path==='branding.colors.primary'){doc.documentElement.style.setProperty('--brand',val);return}if(path==='branding.colors.accent'){doc.documentElement.style.setProperty('--accent',val);return}if(path==='hero.image'){const x=doc.querySelector('#hero-media');if(x)x.style.backgroundImage=val?`url("${val.replace(/"/g,'%22')}")`:'';return}
    const target=doc.querySelector(map[path]||'');if(target)target.textContent=val;
    if(state.selected?.type==='page'&&path==='menuLabel'&&state.selected.previewEl)state.selected.previewEl.textContent=val;
  }
  function bindInspector(){const save=$('#ve-save');if(save)save.onclick=saveInspector;document.querySelectorAll('#ve-body [data-scope]').forEach(el=>el.addEventListener('input',()=>livePreview(el)));}
  function findPageFromLink(a){try{const u=new URL(a.href,location.origin),slug=u.searchParams.get('slug');return state.pages.find(p=>p.slug===slug)||state.pages.find(p=>(p.menu_label||p.title)===a.textContent.trim())||null}catch{return null}}
  function attachFrame(){
    const frame=$('#ve-frame');if(!frame)return;frame.onload=()=>{try{const doc=frame.contentDocument;if(!doc)return;const style=doc.createElement('style');style.textContent='[data-radz-selected]{outline:3px solid #7c3aed!important;outline-offset:3px!important;cursor:pointer!important} body *:hover{cursor:default} #brand,#contact-link,#account-link,#cart-label,#default-commerce-nav a,#eyebrow,#hero-title,#hero-subtitle,#primary-action,#secondary-action,#hero-media,#categories-eyebrow,#categories-title,#products-eyebrow,#products-title,#contact-eyebrow,#contact-title,#contact-copy,#benefit-1,#benefit-2,#benefit-3,#footer-text,.page-nav-link{cursor:pointer!important}';doc.head.appendChild(style);
      doc.addEventListener('submit',e=>e.preventDefault(),true);doc.addEventListener('click',e=>{const t=e.target.closest('a,button,#hero-media,#eyebrow,#hero-title,#hero-subtitle,#categories-eyebrow,#categories-title,#products-eyebrow,#products-title,#contact-eyebrow,#contact-title,#contact-copy,#benefit-1,#benefit-2,#benefit-3,#footer-text,#brand');if(!t)return;let sel=null;
        if(t.classList.contains('page-nav-link')){const p=findPageFromLink(t);if(p)sel={type:'page',page:p,previewEl:t};}
        else{const rules=[['#brand','brand'],['#contact-link','contactNav'],['#account-link','accountNav'],['#cart-label','cartNav'],['#default-commerce-nav a[href="#categorias"]','categoriesNav'],['#default-commerce-nav a[href="#produtos"]','productsNav'],['#eyebrow','heroEyebrow'],['#hero-title','heroTitle'],['#hero-subtitle','heroSubtitle'],['#primary-action','primaryAction'],['#secondary-action','secondaryAction'],['#hero-media','heroImage'],['#categories-eyebrow','categoriesEyebrow'],['#categories-title','categoriesTitle'],['#products-eyebrow','productsEyebrow'],['#products-title','productsTitle'],['#contact-eyebrow','contactEyebrow'],['#contact-title','contactTitle'],['#contact-copy','contactText'],['#benefit-1','benefit1'],['#benefit-2','benefit2'],['#benefit-3','benefit3'],['#footer-text','footerText']];for(const [q,key] of rules){if(t.matches(q)||t.closest(q)){sel={type:'layout',key};break}}}
        if(!sel)return;e.preventDefault();e.stopPropagation();doc.querySelectorAll('[data-radz-selected]').forEach(x=>x.removeAttribute('data-radz-selected'));t.setAttribute('data-radz-selected','1');showSelection(sel);
      },true);
    }catch(err){console.warn('[RADZ visual editor iframe]',err)}};
  }
  function reloadFrame(){const f=$('#ve-frame');if(!f)return;const base='/?radz-preview=1&v='+Date.now();f.src=base;}
  async function render(){
    if(location.hash!=='#layout')return;const token=++state.renderToken,c=$('#view-content');if(!c)return;c.innerHTML='<div class="panel empty">Carregando editor visual…</div>';
    try{const [l,s,p]=await Promise.all([getJson('/admin/api/layout'),getJson('/admin/api/config'),getJson('/admin/api/pages')]);if(token!==state.renderToken||location.hash!=='#layout')return;state.layout=l.layout||{};state.config=s.config||{};state.pages=p.pages||[];c.innerHTML=layoutShell();attachFrame();$('#ve-general').onclick=showGeneral;$('#ve-reload').onclick=reloadFrame;showGeneral();}
    catch(e){c.innerHTML=`<div class="panel empty">${esc(e.message)}</div>`}
  }
  function schedule(){if(location.hash==='#layout')setTimeout(render,90)}
  window.addEventListener('hashchange',schedule);document.addEventListener('click',e=>{if(e.target.closest('[data-view="layout"]'))setTimeout(render,130)});document.addEventListener('DOMContentLoaded',schedule,{once:true});
})();
