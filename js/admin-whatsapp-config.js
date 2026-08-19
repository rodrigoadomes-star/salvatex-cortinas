(()=>{
  const STYLE_ID='radz-whatsapp-admin-style',PANEL_ID='radz-whatsapp-admin-panel';
  const csrf=()=>sessionStorage.getItem('salvatexAdminCsrf')||'';
  async function req(path,options={}){
    const method=(options.method||'GET').toUpperCase();
    const headers={...(options.headers||{})};
    if(!['GET','HEAD','OPTIONS'].includes(method)){headers['content-type']='application/json';const token=csrf();if(token)headers['x-csrf-token']=token}
    const r=await fetch('/admin/api/'+path,{...options,credentials:'same-origin',headers});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Não foi possível salvar.');return d;
  }
  function style(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`#${PANEL_ID}{margin-top:18px}.wa-admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.wa-admin-field{display:grid;gap:7px}.wa-admin-field.full{grid-column:1/-1}.wa-admin-field label,.wa-admin-switch strong{font-size:13px;font-weight:750}.wa-admin-field input,.wa-admin-field textarea,.wa-admin-field select{width:100%;box-sizing:border-box;border:1px solid #d8dee8;border-radius:9px;padding:11px 12px;background:#fff;color:#14213d;font:inherit}.wa-admin-field textarea{min-height:82px;resize:vertical}.wa-admin-switch{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1px solid #edf0f4}.wa-admin-switch input{width:20px;height:20px}.wa-admin-help{font-size:12px;color:#6b778a}.wa-admin-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}.wa-preview{width:50px;height:50px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px #0002}.wa-preview svg{width:30px;height:30px}@media(max-width:760px){.wa-admin-grid{grid-template-columns:1fr}.wa-admin-field.full{grid-column:auto}}`;document.head.appendChild(s)}
  function icon(){return '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C8.86 3 3.02 8.82 3.02 15.98c0 2.52.73 4.99 2.11 7.1L3 29l6.1-2.01a13.02 13.02 0 0 0 6.93 1.9h.01c7.18 0 13.02-5.82 13.02-12.98C29.06 8.82 23.22 3 16.04 3Zm0 23.7h-.01a10.82 10.82 0 0 1-5.51-1.5l-.4-.24-3.62 1.19 1.18-3.52-.26-.42a10.77 10.77 0 0 1-1.65-5.72c0-5.94 4.85-10.77 10.81-10.77 5.96 0 10.81 4.83 10.81 10.77 0 5.94-4.85 10.77-10.81 10.77Zm5.93-8.07c-.33-.16-1.92-.94-2.22-1.05-.3-.11-.52-.16-.74.16-.22.33-.85 1.05-1.04 1.27-.19.22-.38.25-.71.08-.33-.16-1.38-.51-2.63-1.62-.97-.86-1.63-1.92-1.82-2.25-.19-.33-.02-.5.14-.67.15-.15.33-.38.49-.57.16-.19.22-.33.33-.54.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.43-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.13 1.33 3.35.16.22 2.3 3.5 5.57 4.91.78.34 1.38.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.92-.78 2.19-1.54.27-.76.27-1.41.19-1.54-.08-.14-.3-.22-.63-.38Z"/></svg>'}
  async function mount(){
    if(!location.hash.includes('layout')||document.getElementById(PANEL_ID)||!document.getElementById('view-content'))return;
    try{
      const d=await req('layout'),layout=d.layout&&typeof d.layout==='object'?d.layout:{};
      const wa=layout?.footer?.whatsapp||layout?.whatsapp||{};
      const root=document.createElement('section');root.id=PANEL_ID;root.className='panel';root.innerHTML=`<div class="panel-head"><div><h2>WhatsApp flutuante</h2><p class="wa-admin-help">Exiba um botão fixo de atendimento no site desta loja.</p></div><div class="wa-preview">${icon()}</div></div><div class="wa-admin-switch"><div><strong>Mostrar botão do WhatsApp</strong><div class="wa-admin-help">Aparece nas páginas públicas da loja.</div></div><input id="wa-enabled" type="checkbox" ${wa.enabled!==false?'checked':''}></div><div class="wa-admin-grid" style="margin-top:16px"><div class="wa-admin-field"><label for="wa-number">Número do WhatsApp</label><input id="wa-number" inputmode="tel" placeholder="5544999999999" value="${String(wa.number||'').replace(/"/g,'&quot;')}"><span class="wa-admin-help">Use DDI + DDD + número. Ex.: 5544991234567.</span></div><div class="wa-admin-field"><label for="wa-position">Posição do botão</label><select id="wa-position"><option value="right" ${wa.position!=='left'?'selected':''}>Canto inferior direito</option><option value="left" ${wa.position==='left'?'selected':''}>Canto inferior esquerdo</option></select></div><div class="wa-admin-field full"><label for="wa-message">Mensagem inicial</label><textarea id="wa-message" placeholder="Olá! Vim pelo site e gostaria de mais informações.">${String(wa.message||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</textarea></div></div><div id="wa-feedback" class="wa-admin-help" style="margin-top:10px"></div><div class="wa-admin-actions"><button type="button" class="primary-btn" id="wa-save">Salvar WhatsApp</button></div>`;
      document.getElementById('view-content').appendChild(root);
      root.querySelector('#wa-save').onclick=async()=>{
        const button=root.querySelector('#wa-save'),feedback=root.querySelector('#wa-feedback');button.disabled=true;feedback.textContent='Salvando…';
        try{
          const latest=await req('layout'),next=latest.layout&&typeof latest.layout==='object'?structuredClone(latest.layout):{};next.footer=next.footer&&typeof next.footer==='object'?next.footer:{};
          next.footer.whatsapp={enabled:root.querySelector('#wa-enabled').checked,number:root.querySelector('#wa-number').value.replace(/\D/g,''),message:root.querySelector('#wa-message').value.trim(),position:root.querySelector('#wa-position').value==='left'?'left':'right'};
          await req('layout',{method:'PUT',body:JSON.stringify({layout:next})});feedback.style.color='#16794b';feedback.textContent='Configuração do WhatsApp salva.';
        }catch(error){feedback.style.color='#b42318';feedback.textContent=error.message||'Não foi possível salvar.'}finally{button.disabled=false}
      };
    }catch(error){console.warn('[RADZ admin WhatsApp]',error)}
  }
  style();
  const observer=new MutationObserver(()=>mount());observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(mount,80));setTimeout(mount,400);
})();