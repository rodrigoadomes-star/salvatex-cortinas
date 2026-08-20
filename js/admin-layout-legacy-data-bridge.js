(()=>{
  if(window.__RADZ_LEGACY_LAYOUT_DATA_BRIDGE__) return;
  window.__RADZ_LEGACY_LAYOUT_DATA_BRIDGE__=true;

  let legacy=null;
  let loading=false;
  let observer=null;

  const get=(obj,path,fallback='')=>path.split('.').reduce((o,k)=>o&&o[k]!==undefined?o[k]:undefined,obj)??fallback;

  const pathMap={
    'branding.colors.primary':'colors.primary',
    'branding.colors.accent':'colors.accent',
    'navigation.contactLabel':'header.contactLabel',
    'navigation.cartLabel':'header.cartLabel',
    'hero.eyebrow':'home.hero.kicker',
    'hero.title':'home.hero.title',
    'hero.subtitle':'home.hero.subtitle',
    'hero.primaryAction.label':'home.hero.primaryText',
    'hero.primaryAction.href':'home.hero.primaryTarget',
    'hero.secondaryAction.label':'home.hero.secondaryText',
    'hero.secondaryAction.href':'home.hero.secondaryTarget',
    'hero.image':'home.hero.backgroundImage',
    'sections.categoriesEyebrow':'home.collections.kicker',
    'sections.categoriesTitle':'home.collections.title',
    'sections.benefits.0.title':'home.benefits.0.title',
    'sections.benefits.0.text':'home.benefits.0.text',
    'sections.benefits.1.title':'home.benefits.1.title',
    'sections.benefits.1.text':'home.benefits.1.text',
    'sections.benefits.2.title':'home.benefits.2.title',
    'sections.benefits.2.text':'home.benefits.2.text',
    'footer.text':'footer.copyright'
  };

  const liveSelectors={
    'header.logoText':'#brand',
    'header.contactLabel':'#contact-link',
    'header.cartLabel':'#cart-label',
    'home.hero.kicker':'#eyebrow',
    'home.hero.title':'#hero-title',
    'home.hero.subtitle':'#hero-subtitle',
    'home.hero.primaryText':'#primary-action',
    'home.hero.secondaryText':'#secondary-action',
    'home.collections.kicker':'#categories-eyebrow',
    'home.collections.title':'#categories-title',
    'home.benefits.0.title':'#benefit-1 strong',
    'home.benefits.0.text':'#benefit-1 span',
    'home.benefits.1.title':'#benefit-2 strong',
    'home.benefits.1.text':'#benefit-2 span',
    'home.benefits.2.title':'#benefit-3 strong',
    'home.benefits.2.text':'#benefit-3 span',
    'footer.copyright':'#footer-text'
  };

  async function loadLegacy(){
    if(loading) return;
    loading=true;
    try{
      const r=await fetch('/admin/api/layout',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      const d=await r.json().catch(()=>({}));
      const l=d?.layout||{};
      legacy=(l.header&&l.home&&l.colors)?l:null;
    }catch{legacy=null}
    finally{loading=false}
  }

  function setLabel(el,text){
    const label=el.closest('.ve-field')?.querySelector('span');
    if(label) label.textContent=text;
  }

  function bindLive(el){
    if(el.dataset.legacyLiveBound==='1') return;
    el.dataset.legacyLiveBound='1';
    el.addEventListener('input',()=>{
      const frame=document.getElementById('ve-frame');
      const doc=frame?.contentDocument;
      if(!doc) return;
      const path=el.dataset.path;
      const val=el.value;
      if(path==='colors.primary'){doc.documentElement.style.setProperty('--layout-primary',val);return}
      if(path==='colors.accent'){doc.documentElement.style.setProperty('--layout-accent',val);return}
      if(path==='home.hero.backgroundImage'){
        const hero=doc.querySelector('.hero-home-new');
        if(hero) hero.style.backgroundImage=`linear-gradient(90deg,rgba(247,242,235,.98) 0%,rgba(247,242,235,.91) 33%,rgba(247,242,235,.25) 68%,rgba(247,242,235,.12) 100%),url("${String(val).replace(/"/g,'%22')}")`;
        return;
      }
      if(path==='home.hero.primaryTarget'){const a=doc.querySelector('#primary-action');if(a)a.setAttribute('href',val);return}
      if(path==='home.hero.secondaryTarget'){const a=doc.querySelector('#secondary-action');if(a)a.setAttribute('href',val);return}
      if(path==='header.logoSubtext'){const brand=doc.querySelector('#brand small,.logo small');if(brand)brand.textContent=val;return}
      const sel=liveSelectors[path];
      const target=sel?doc.querySelector(sel):null;
      if(target) target.textContent=val;
    },true);
  }

  function rewritePanel(){
    if(location.hash!=='#layout'||!legacy) return;
    const body=document.getElementById('ve-body');
    if(!body) return;

    const title=document.getElementById('ve-title')?.textContent||'';
    const fields=[...body.querySelectorAll('[data-scope][data-path]')];

    fields.forEach((el,index)=>{
      let oldPath=el.dataset.path;
      let newPath=pathMap[oldPath]||oldPath;

      if(title==='Marca / logo'||title==='Configurações gerais'){
        if(el.dataset.scope==='config'&&oldPath==='storeName'){
          el.dataset.scope='layout';newPath='header.logoText';setLabel(el,'Nome da marca');
        }else if(oldPath==='branding.logo'){
          newPath='header.logoSubtext';setLabel(el,'Texto abaixo da marca');
        }
      }

      if(newPath!==oldPath||newPath.startsWith('header.')||newPath.startsWith('home.')||newPath.startsWith('colors.')||newPath.startsWith('footer.')){
        el.dataset.scope='layout';
        el.dataset.path=newPath;
        const value=get(legacy,newPath,'');
        if(el.type==='color'){
          if(/^#[0-9a-f]{6}$/i.test(String(value))) el.value=value;
        }else{
          el.value=String(value??'');
        }
        bindLive(el);
      }
    });

    if(title==='Botão principal'){
      fields[0]&&setLabel(fields[0],'Texto');fields[1]&&setLabel(fields[1],'Destino');
    }
    if(title==='Botão secundário'){
      fields[0]&&setLabel(fields[0],'Texto');fields[1]&&setLabel(fields[1],'Destino');
    }
  }

  function watch(){
    if(observer) return;
    observer=new MutationObserver(()=>setTimeout(rewritePanel,0));
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#ve-save')) setTimeout(async()=>{await loadLegacy();rewritePanel()},900);
      if(e.target.closest?.('[data-view="layout"]')) setTimeout(async()=>{await loadLegacy();rewritePanel()},250);
    },true);
    window.addEventListener('hashchange',()=>setTimeout(async()=>{await loadLegacy();rewritePanel()},150));
  }

  (async()=>{await loadLegacy();watch();setTimeout(rewritePanel,250)})();
})();
