(()=>{
  if(window.__RADZ_PAGES_UX_FIX__)return;window.__RADZ_PAGES_UX_FIX__=true;
  const install=()=>{
    if(typeof window.pageForm!=='function')return false;
    const original=window.pageForm;
    window.pageForm=async function(page={},products,allPages){
      const effective={...page};
      if(effective.configurator_id&&!String(effective.page_type||'').startsWith('configurador'))effective.page_type='configurador';
      await original(effective,products,allPages);
      const form=document.querySelector('#page-form');if(!form)return;
      const nav=form.elements.navGroup,type=form.elements.pageType,cfg=form.elements.configuratorId;
      if(!page.id&&nav)nav.value='oculto';
      const menuLabel=form.elements.menuLabel?.closest('.form-field');if(menuLabel){const hint=menuLabel.querySelector('.field-hint');if(hint)hint.textContent='Só vira item do menu quando você escolher Menu principal ou Rodapé em “Mostrar em”.'}
      const navField=nav?.closest('.form-field');if(navField){const label=navField.querySelector('label');if(label)label.textContent='Mostrar em';let hint=navField.querySelector('.field-hint');if(!hint){hint=document.createElement('small');hint.className='field-hint';navField.appendChild(hint)}hint.textContent='Criar ou renomear uma página não cria menu automaticamente. Escolha onde exibir apenas se desejar.'}
      const parentField=form.elements.navParentId?.closest('.form-field');if(parentField){let hint=parentField.querySelector('.field-hint');if(!hint){hint=document.createElement('small');hint.className='field-hint';parentField.appendChild(hint)}hint.textContent='Use para criar as opções que aparecem ao passar o mouse sobre um item principal.'}
      const enforce=()=>{if(type?.value==='configurador'){form.querySelectorAll('#page-products-wrap input[type="checkbox"]').forEach(i=>i.checked=false)}if(type?.value!=='configurador'&&cfg)cfg.value=''};
      type?.addEventListener('change',enforce);form.addEventListener('submit',enforce,{capture:true});
    };
    return true;
  };
  if(!install()){let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer)},100)}
})();
