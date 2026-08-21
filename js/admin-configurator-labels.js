(()=>{
  if(window.__RADZ_CONFIGURATOR_LABELS_ADMIN__) return;
  window.__RADZ_CONFIGURATOR_LABELS_ADMIN__=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const getCsrf=()=>sessionStorage.getItem('salvatexAdminCsrf')||'';
  let lastLayout={};
  let mounting=false;
  let scheduled=false;

  function cleanupDuplicates(){
    const sections=$$('#cfg-editable-labels');
    sections.slice(1).forEach(el=>el.remove());
  }

  async function loadLayout(){
    const r=await fetch('/admin/api/layout',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.message||'Não foi possível carregar os textos do configurador.');
    lastLayout=d.layout||{};
    return lastLayout;
  }

  async function saveLayout(layout){
    const headers={'content-type':'application/json',accept:'application/json'};
    const csrf=getCsrf();
    if(csrf) headers['x-csrf-token']=csrf;
    const r=await fetch('/admin/api/layout',{method:'PUT',credentials:'same-origin',headers,body:JSON.stringify({layout})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.message||'Não foi possível salvar.');
    lastLayout=layout;
  }

  async function mount(){
    scheduled=false;
    if(location.hash!=='#configurators') return;
    cleanupDuplicates();
    if($('#cfg-editable-labels')||mounting) return;
    const editor=$('#configurator-editor');
    if(!editor) return;

    mounting=true;
    try{
      const layout=await loadLayout();
      if(location.hash!=='#configurators'||!document.contains(editor)||$('#cfg-editable-labels')) return;
      const labels=layout.configuratorLabels||{};
      const section=document.createElement('section');
      section.id='cfg-editable-labels';
      section.className='panel configurator-section';
      section.innerHTML=`<div class="panel-head"><div><h2>Textos do configurador</h2><p>Esses textos são exclusivos desta empresa.</p></div></div><div class="form-grid"><div class="form-field full"><label>Opção para não incluir trilho ou varão</label><input id="cfg-no-finish-label" value="${String(labels.noFinishOption||'Não quero trilho ou varão').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}"><small>Ex.: Não quero trilho ou varão, Sem acabamento, Não incluir instalação.</small></div></div><div class="form-actions"><button type="button" class="primary-btn" id="save-cfg-labels">Salvar textos</button><span id="cfg-labels-result" style="font-size:12px;font-weight:700"></span></div>`;
      editor.appendChild(section);
      const btn=$('#save-cfg-labels',section),out=$('#cfg-labels-result',section),input=$('#cfg-no-finish-label',section);
      btn.onclick=async()=>{
        btn.disabled=true;out.textContent='Salvando…';out.style.color='';
        try{
          const next=JSON.parse(JSON.stringify(lastLayout||{}));
          next.configuratorLabels={...(next.configuratorLabels||{}),noFinishOption:(input?.value||'').trim()||'Não quero trilho ou varão'};
          await saveLayout(next);
          out.style.color='#16794b';out.textContent='Salvo.';
        }catch(e){out.style.color='#b42318';out.textContent=e.message||'Erro ao salvar.'}
        finally{btn.disabled=false}
      };
    }catch(e){console.warn('[RADZ configurator labels admin]',e)}
    finally{mounting=false;cleanupDuplicates()}
  }

  function scheduleMount(){
    if(scheduled||location.hash!=='#configurators') return;
    scheduled=true;
    setTimeout(mount,120);
  }

  const observer=new MutationObserver(()=>{
    if(location.hash!=='#configurators') return;
    cleanupDuplicates();
    if(!$('#cfg-editable-labels')) scheduleMount();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',scheduleMount);
  scheduleMount();
})();
