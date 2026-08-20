(()=>{
  if(window.__RADZ_EXTRA_EDITABLES__) return;
  window.__RADZ_EXTRA_EDITABLES__=true;

  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function csrf(){
    return window.ADMIN?.csrf || sessionStorage.getItem('salvatexAdminCsrf') || '';
  }

  async function json(url,opt={}){
    const headers={'accept':'application/json','content-type':'application/json',...(opt.headers||{})};
    const token=csrf();
    if(token && !headers['x-csrf-token']) headers['x-csrf-token']=token;
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.message||`Falha (${r.status}).`);
    return d;
  }

  function mark(frame){
    try{
      const doc=frame?.contentDocument;
      if(!doc) return;
      const collections=doc.querySelector('#colecoes-home, .home-collections');
      const head=collections?.querySelector('.home-section-head') || collections;
      const subtitle=doc.querySelector('#categories-subtitle') || head?.querySelector('p');
      if(subtitle && !subtitle.id) subtitle.id='categories-subtitle';
      if(subtitle) subtitle.style.cursor='pointer';
    }catch(e){console.warn('[RADZ extra editables mark]',e)}
  }

  async function openSubtitleEditor(frame,el){
    const title=$('#ve-title'),sub=$('#ve-subtitle'),body=$('#ve-body');
    if(!title||!sub||!body) return;
    let data={};
    try{data=await json('/admin/api/layout')}catch{}
    const layout=data.layout||{};
    const legacy=!!layout.home?.collections;
    const current=legacy
      ? (layout.home?.collections?.subtitle ?? el.textContent.trim())
      : (layout.sections?.categoriesSubtitle ?? el.textContent.trim());

    title.textContent='Texto abaixo de categorias';
    sub.textContent='Clique em salvar para publicar nesta loja.';
    body.innerHTML=`<label class="ve-field"><span>Texto</span><textarea id="ve-extra-categories-subtitle">${esc(current)}</textarea></label><div class="ve-save"><button class="primary-btn" id="ve-extra-save">Salvar alterações</button></div><div id="ve-extra-result" class="ve-result"></div>`;

    const input=$('#ve-extra-categories-subtitle');
    const save=$('#ve-extra-save');
    const result=$('#ve-extra-result');
    input?.addEventListener('input',()=>{el.textContent=input.value});
    save?.addEventListener('click',async()=>{
      save.disabled=true;result.textContent='Salvando…';result.style.color='';
      try{
        const fresh=await json('/admin/api/layout');
        const next=structuredClone?structuredClone(fresh.layout||{}):JSON.parse(JSON.stringify(fresh.layout||{}));
        if(next.home?.collections || legacy){
          next.home=next.home||{};next.home.collections=next.home.collections||{};next.home.collections.subtitle=input.value.trim();
        }else{
          next.sections=next.sections||{};next.sections.categoriesSubtitle=input.value.trim();
        }
        await json('/admin/api/layout',{method:'PUT',body:JSON.stringify({layout:next})});
        result.style.color='#16794b';result.textContent='Publicado com sucesso.';
      }catch(err){
        result.style.color='#b42318';result.textContent=err.message||'Não foi possível salvar.';
      }finally{save.disabled=false}
    });
  }

  function bind(frame){
    if(!frame||frame.dataset.radzExtraEditableBound==='1') return;
    frame.dataset.radzExtraEditableBound='1';
    frame.addEventListener('load',()=>{
      setTimeout(()=>mark(frame),0);
      setTimeout(()=>mark(frame),400);
      setTimeout(()=>mark(frame),1000);
      try{
        const doc=frame.contentDocument;
        doc?.addEventListener('click',e=>{
          const t=e.target instanceof Element?e.target.closest('#categories-subtitle'):null;
          if(!t) return;
          e.preventDefault();e.stopImmediatePropagation();
          doc.querySelectorAll('[data-radz-selected]').forEach(x=>x.removeAttribute('data-radz-selected'));
          t.setAttribute('data-radz-selected','1');
          openSubtitleEditor(frame,t);
        },true);
      }catch{}
    });
    mark(frame);
  }

  function scan(){
    if(location.hash!=='#layout') return;
    const frame=$('#ve-frame');
    if(frame) bind(frame);
  }

  const observer=new MutationObserver(()=>scan());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(scan,0));
  setTimeout(scan,0);
})();
