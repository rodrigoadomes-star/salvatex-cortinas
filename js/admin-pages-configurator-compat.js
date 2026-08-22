(()=>{
  if(window.__RADZ_PAGE_COMPAT__)return;window.__RADZ_PAGE_COMPAT__=true;
  const originalPageForm=window.pageForm,originalRenderPages=window.renderPages;
  const normalizePage=x=>{if(!x||typeof x!=='object')return x;const copy={...x};if(copy.configurator_id)copy.page_type='configurador';return copy};
  if(typeof originalPageForm==='function'){
    window.pageForm=async function(x={},products,allPages){
      const page=normalizePage(x);await originalPageForm(page,products,(allPages||[]).map(normalizePage));
      const form=document.querySelector('#page-form');if(!form)return;
      const nav=form.elements.navGroup,type=form.elements.pageType,cfg=form.elements.configuratorId,parent=form.elements.navParentId;
      if(!x.id&&nav)nav.value='oculto';
      const navField=nav?.closest('.form-field');if(navField){let hint=navField.querySelector('.field-hint');if(!hint){hint=document.createElement('small');hint.className='field-hint';navField.appendChild(hint)}hint.textContent='A página só aparece no menu quando você escolher Menu principal ou Rodapé.'}
      const parentField=parent?.closest('.form-field');if(parentField){let hint=parentField.querySelector('.field-hint');if(!hint){hint=document.createElement('small');hint.className='field-hint';parentField.appendChild(hint)}hint.textContent='Escolha um item principal para esta página aparecer como opção ao passar o mouse.'}
      const enforce=()=>{if(type?.value==='configurador'){form.querySelectorAll('#page-products-wrap input[type="checkbox"]').forEach(i=>i.checked=false)}else if(cfg)cfg.value=''};
      type?.addEventListener('change',enforce);form.addEventListener('submit',enforce,{capture:true});
    };
  }
  if(typeof originalRenderPages==='function'){
    window.renderPages=async function(){await originalRenderPages();try{(ADMIN.cache.pages||[]).forEach((p,i)=>ADMIN.cache.pages[i]=normalizePage(p));document.querySelectorAll('#view-content tbody tr[data-page]').forEach(row=>{let p;try{p=normalizePage(JSON.parse(decodeURIComponent(row.dataset.page||'')))}catch{return}row.dataset.page=encodeURIComponent(JSON.stringify(p));const cells=row.querySelectorAll('td');if(p.configurator_id){if(cells[2])cells[2].textContent='Configurador';const link=cells[3]?.querySelector('a');if(link){const id=String(p.configurator_id);link.href=id==='persiana'?'../configurador-persiana.html?id=persiana':'../configurador.html?id='+encodeURIComponent(id)}}})}catch(e){console.warn('[RADZ page compat]',e)}};
  }
})();
