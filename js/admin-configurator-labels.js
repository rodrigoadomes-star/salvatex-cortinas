(()=>{
  if(window.__RADZ_CONFIGURATOR_LABELS_ADMIN_V2__) return;
  window.__RADZ_CONFIGURATOR_LABELS_ADMIN_V2__=true;

  function cleanupLegacy(){
    document.querySelectorAll('#cfg-editable-labels').forEach(el=>el.remove());
  }

  function mountInline(){
    if(location.hash!=='#configurators') return;
    cleanupLegacy();
    const form=document.getElementById('cfg-form');
    if(!form) return;
    const section=form.querySelector('[data-radz-config-labels]');
    const grid=section?.querySelector('.form-grid');
    if(!grid||grid.querySelector('[data-config-label="noFinishOption"]')) return;

    const field=document.createElement('label');
    field.className='form-field full';
    field.dataset.radzNoFinishField='1';
    field.innerHTML='<span>Opção para não incluir trilho ou varão</span><input data-config-label="noFinishOption" value="Não quero trilho ou varão"><small class="field-hint">Ex.: Não quero trilho ou varão, Sem acabamento, Não incluir instalação.</small>';
    grid.appendChild(field);

    const id=document.querySelector('.configurator-switch.active')?.dataset.configurator||'wave';
    fetch('/admin/api/configurators/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}})
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        const cfg=d?.configurator||d?.wave||{};
        const value=String(cfg?.labels?.noFinishOption||'').trim();
        const input=field.querySelector('input');
        if(value&&input) input.value=value;
      })
      .catch(()=>{});
  }

  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{cleanupLegacy();mountInline()},80)};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.configurator-switch,.cfg-option-tab'))schedule()});
  cleanupLegacy();
  schedule();
})();
