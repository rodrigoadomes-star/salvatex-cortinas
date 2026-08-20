(()=>{
  if(window.__RADZ_VISUAL_SITE_PAGES__)return;
  window.__RADZ_VISUAL_SITE_PAGES__=true;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const csrf=()=>window.ADMIN?.csrf||sessionStorage.getItem('salvatexAdminCsrf')||'';
  let pages=[];
  async function req(url,opt={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers:{accept:'application/json','content-type':'application/json','x-csrf-token':csrf(),...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`Falha (${r.status})`);return d}
  const parse=a=>{try{return JSON.parse(a||'[]')}catch{return[]}};
  function pagePayload(p,changes={}){return{title:changes.title??p.title,slug:p.slug,pageType:p.page_type||p.pageType||'conteudo',contentHtml:changes.contentHtml??p.content_html??p.contentHtml??'',seoTitle:p.seo_title||p.seoTitle||'',seoDescription:p.seo_description||p.seoDescription||'',active:Number(p.active)!==0,productIds:parse(p.product_ids_json),heroImageUrl:changes.heroImageUrl??p.hero_image_url??p.heroImageUrl??'',measures:parse(p.measures_json),customMeasureUrl:p.custom_measure_url||'',navGroup:p.nav_group||'principal',navOrder:Number(p.nav_order||100),menuLabel:p.menu_label??p.title,externalUrl:p.external_url||'',navParentId:p.nav_parent_id||''}}
  function pageUrl(p){const type=p.page_type||p.pageType||'';const map={configurador_wave:'/configurador.html?id=wave',configurador_prega_macho:'/configurador.html?id=prega-macho',configurador_ilhos:'/configurador.html?id=cortina-varao',configurador_persiana:'/configurador-persiana.html?id=persiana'};return map[type]||('/pagina.html?slug='+encodeURIComponent(p.slug));}
  function slugFromAnchor(a){try{const u=new URL(a.href,location.origin);return u.searchParams.get('slug')||''}catch{return''}}
  function pageByAnchor(a){const slug=slugFromAnchor(a);return pages.find(p=>p.slug===slug)||pages.find(p=>(p.menu_label||p.title||'').trim()===(a.textContent||'').trim())||null}
  function currentUrl(){return window.RADZ_VISUAL_PREVIEW?.current?.()||'/'}
  function currentPage(){try{const u=new URL(currentUrl(),location.origin),slug=u.searchParams.get('slug');return pages.find(p=>p.slug===slug)||null}catch{return null}}
  function currentConfiguratorId(){try{const u=new URL(currentUrl(),location.origin);if(!/configurador/.test(u.pathname))return'';return u.searchParams.get('id')||(/persiana/.test(u.pathname)?'persiana':'wave')}catch{return''}}
  function setInspector(title,subtitle,html,onSave){const t=document.getElementById('ve-title'),s=document.getElementById('ve-subtitle'),b=document.getElementById('ve-body');if(!t||!s||!b)return;t.textContent=title;s.textContent=subtitle;b.innerHTML=html+'<div class="ve-save"><button class="primary-btn" id="ve-page-save">Salvar alterações</button></div><div class="ve-result" id="ve-page-result"></div>';document.getElementById('ve-page-save').onclick=onSave;}
  function pageTitleEditor(p,previewEl){setInspector('Título da página','Edita esta página; produtos e anúncios não são alterados.',`<label class="ve-field"><span>Título</span><input id="ve-page-title" value="${esc(p.title||'')}"></label>`,async()=>{const out=document.getElementById('ve-page-result');try{const title=document.getElementById('ve-page-title').value.trim();await req('/admin/api/pages/'+encodeURIComponent(p.id),{method:'PUT',body:JSON.stringify(pagePayload(p,{title}))});p.title=title;previewEl.textContent=title;out.style.color='#16794b';out.textContent='Página atualizada.'}catch(e){out.style.color='#b42318';out.textContent=e.message}})}
  function pageContentEditor(p,previewEl){setInspector('Conteúdo da página','Edite o conteúdo institucional. Cards de produtos permanecem protegidos.',`<label class="ve-field"><span>Conteúdo (HTML seguro)</span><textarea id="ve-page-content" style="min-height:260px">${esc(p.content_html||p.contentHtml||'')}</textarea></label>`,async()=>{const out=document.getElementById('ve-page-result');try{const contentHtml=document.getElementById('ve-page-content').value;await req('/admin/api/pages/'+encodeURIComponent(p.id),{method:'PUT',body:JSON.stringify(pagePayload(p,{contentHtml}))});p.content_html=contentHtml;previewEl.innerHTML=contentHtml;out.style.color='#16794b';out.textContent='Conteúdo atualizado.'}catch(e){out.style.color='#b42318';out.textContent=e.message}})}
  function pageHeroEditor(p,previewEl){setInspector('Imagem da página','Altera somente a apresentação desta página.',`<label class="ve-field"><span>URL da imagem</span><input id="ve-page-hero" value="${esc(p.hero_image_url||p.heroImageUrl||'')}"></label>`,async()=>{const out=document.getElementById('ve-page-result');try{const heroImageUrl=document.getElementById('ve-page-hero').value.trim();await req('/admin/api/pages/'+encodeURIComponent(p.id),{method:'PUT',body:JSON.stringify(pagePayload(p,{heroImageUrl}))});p.hero_image_url=heroImageUrl;const img=previewEl.tagName==='IMG'?previewEl:previewEl.querySelector('img');if(img)img.src=heroImageUrl;out.style.color='#16794b';out.textContent='Imagem atualizada.'}catch(e){out.style.color='#b42318';out.textContent=e.message}})}
  async function configEditor(id,key,label,previewEl){let d;try{d=await req('/admin/api/configurators/'+encodeURIComponent(id))}catch{return}const cfg=d.wave||d.configurator||{},labels={...(cfg.labels||{})};setInspector(label,'Texto exclusivo do configurador desta empresa.',`<label class="ve-field"><span>Texto</span><textarea id="ve-config-label">${esc(labels[key]||previewEl.textContent.trim())}</textarea></label>`,async()=>{const out=document.getElementById('ve-page-result');try{labels[key]=document.getElementById('ve-config-label').value.trim();await req('/admin/api/configurators/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({configurator:{...cfg,labels}})});previewEl.textContent=labels[key];out.style.color='#16794b';out.textContent='Configurador atualizado para esta empresa.'}catch(e){out.style.color='#b42318';out.textContent=e.message}})}
  function addBackButton(){const actions=document.querySelector('.ve-toolbar-actions');if(!actions)return;let btn=document.getElementById('ve-home-preview');const home=currentUrl()==='/'||currentUrl().startsWith('/?');if(home){btn?.remove();return}if(!btn){btn=document.createElement('button');btn.id='ve-home-preview';btn.className='outline-btn';btn.textContent='← Página inicial';btn.onclick=()=>window.RADZ_VISUAL_PREVIEW?.home();actions.prepend(btn)}}
  function bindDoc(frame){const doc=frame.contentDocument;if(!doc||doc.__radzSitePagesBound)return;doc.__radzSitePagesBound=true;const style=doc.createElement('style');style.textContent='.radz-layout-editable{cursor:pointer!important}.radz-layout-editable:hover{outline:2px dashed #7c3aed!important;outline-offset:2px!important}.collection-card,.collection-card *{outline-color:transparent}';doc.head?.appendChild(style);
    const enhance=()=>{
      addBackButton();
      const p=currentPage();
      if(p){
        doc.querySelectorAll('.content-page h1,.collection-head h1').forEach(x=>x.classList.add('radz-layout-editable'));
        doc.querySelectorAll('.content-page-body').forEach(x=>x.classList.add('radz-layout-editable'));
        doc.querySelectorAll('.collection-hero,.collection-hero img').forEach(x=>x.classList.add('radz-layout-editable'));
      }
      const cid=currentConfiguratorId();
      if(cid){
        const map={'#configurator-page-kicker':['kicker','Texto superior'],'#configurator-page-title':['pageTitle','Título do configurador'],'#configurator-page-description':['pageDescription','Descrição do configurador'],'.config .section-title':['formTitle','Título do formulário'],'.config .section-sub':['formSubtitle','Texto do formulário']};
        Object.keys(map).forEach(q=>doc.querySelector(q)?.classList.add('radz-layout-editable'));
        [...doc.querySelectorAll('.steps .step')].forEach(x=>x.classList.add('radz-layout-editable'));
      }
    };
    enhance();new MutationObserver(enhance).observe(doc.documentElement,{childList:true,subtree:true});
    doc.addEventListener('click',e=>{
      const el=e.target instanceof Element?e.target:null;if(!el)return;
      const nav=el.closest('.page-nav-link');if(nav){const p=pageByAnchor(nav);if(p){e.preventDefault();e.stopPropagation();window.RADZ_VISUAL_PREVIEW?.open(pageUrl(p));setTimeout(addBackButton,100);return}}
      if(el.closest('.collection-card'))return; // produtos/anúncios são deliberadamente protegidos
      const p=currentPage();
      if(p){const title=el.closest('.content-page h1,.collection-head h1');if(title){e.preventDefault();e.stopPropagation();pageTitleEditor(p,title);return}const body=el.closest('.content-page-body');if(body){e.preventDefault();e.stopPropagation();pageContentEditor(p,body);return}const hero=el.closest('.collection-hero,.collection-hero img');if(hero){e.preventDefault();e.stopPropagation();pageHeroEditor(p,hero);return}}
      const cid=currentConfiguratorId();if(cid){const rules=[['#configurator-page-kicker','kicker','Texto superior'],['#configurator-page-title','pageTitle','Título do configurador'],['#configurator-page-description','pageDescription','Descrição do configurador'],['.config .section-title','formTitle','Título do formulário'],['.config .section-sub','formSubtitle','Texto do formulário']];for(const[q,key,label]of rules){const target=el.closest(q);if(target){e.preventDefault();e.stopPropagation();configEditor(cid,key,label,target);return}}const step=el.closest('.steps .step');if(step){const i=[...doc.querySelectorAll('.steps .step')].indexOf(step);if(i>=0){e.preventDefault();e.stopPropagation();configEditor(cid,'step'+(i+1),'Etapa '+(i+1),step);return}}}
    },true);
  }
  function bindFrame(){const frame=document.getElementById('ve-frame');if(!frame)return;frame.addEventListener('load',()=>setTimeout(()=>bindDoc(frame),30));setTimeout(()=>bindDoc(frame),30)}
  async function loadPages(){try{const d=await req('/admin/api/pages');pages=d.pages||[]}catch{pages=[]}}
  const obs=new MutationObserver(()=>{if(location.hash==='#layout')setTimeout(bindFrame,30)});obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{if(location.hash==='#layout'){loadPages();setTimeout(bindFrame,80)}});
  loadPages();setTimeout(bindFrame,150);
})();
