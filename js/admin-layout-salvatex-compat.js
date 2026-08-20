(()=>{
  if(window.__RADZ_SALVATEX_EDITOR_COMPAT__) return;
  window.__RADZ_SALVATEX_EDITOR_COMPAT__=true;

  function ensureId(el,id){
    if(el && !el.id) el.id=id;
    return el;
  }

  function normalizeLegacyPreview(frame){
    try{
      const doc=frame?.contentDocument;
      if(!doc?.documentElement) return;

      // Generic tenant storefronts already expose the editor IDs.
      // Only fill gaps for the legacy Salvatex storefront.
      const brand=doc.querySelector('#brand') || doc.querySelector('header .logo, .storefront-topbar .logo, a.logo');
      ensureId(brand,'brand');

      const contact=doc.querySelector('#contact-link') || [...doc.querySelectorAll('header a, .navlinks a')].find(a=>/contato/i.test(a.textContent||''));
      ensureId(contact,'contact-link');

      const cartLabel=doc.querySelector('#cart-label') || doc.querySelector('.carrinho-texto');
      ensureId(cartLabel,'cart-label');

      const hero=doc.querySelector('.hero-home-copy, .hero-home-content, .hero');
      ensureId(doc.querySelector('#eyebrow') || hero?.querySelector('.kicker'),'eyebrow');
      ensureId(doc.querySelector('#hero-title') || hero?.querySelector('h1'),'hero-title');
      ensureId(doc.querySelector('#hero-subtitle') || hero?.querySelector('p'),'hero-subtitle');
      ensureId(doc.querySelector('#primary-action') || hero?.querySelector('.hero-primary'),'primary-action');
      ensureId(doc.querySelector('#secondary-action') || hero?.querySelector('.hero-secondary'),'secondary-action');

      const heroMedia=doc.querySelector('#hero-media') || doc.querySelector('.hero-home-new');
      ensureId(heroMedia,'hero-media');

      const collections=doc.querySelector('#colecoes-home, .home-collections');
      const collectionHead=collections?.querySelector('.home-section-head') || collections;
      ensureId(doc.querySelector('#categories-eyebrow') || collectionHead?.querySelector('.kicker'),'categories-eyebrow');
      ensureId(doc.querySelector('#categories-title') || collectionHead?.querySelector('h2'),'categories-title');

      const intro=doc.querySelector('.home-configurator-intro');
      ensureId(doc.querySelector('#products-eyebrow') || intro?.querySelector('.kicker'),'products-eyebrow');
      ensureId(doc.querySelector('#products-title') || intro?.querySelector('h2'),'products-title');

      const contactSection=doc.querySelector('#contato, .contact-section, .contato');
      ensureId(doc.querySelector('#contact-eyebrow') || contactSection?.querySelector('.kicker'),'contact-eyebrow');
      ensureId(doc.querySelector('#contact-title') || contactSection?.querySelector('h2,h3'),'contact-title');
      ensureId(doc.querySelector('#contact-copy') || contactSection?.querySelector('p'),'contact-copy');

      const benefits=[...doc.querySelectorAll('.home-benefits-strip > div')];
      benefits.slice(0,3).forEach((el,i)=>ensureId(el,`benefit-${i+1}`));

      const footer=doc.querySelector('footer');
      ensureId(doc.querySelector('#footer-text') || footer?.querySelector('p,small'),'footer-text');
      ensureId(doc.querySelector('#footer-brand') || footer?.querySelector('.logo,.brand,strong'),'footer-brand');

      // Prevent legacy controls from acting while editing. The main editor still
      // receives the click and decides whether the element is editable.
      if(!doc.__radzSalvatexCompatBound){
        doc.__radzSalvatexCompatBound=true;
        doc.addEventListener('click',e=>{
          const el=e.target instanceof Element?e.target:null;
          if(!el) return;
          if(el.closest('a,button,input,select,textarea,label')){
            const editable=el.closest('#brand,#contact-link,#cart-label,#eyebrow,#hero-title,#hero-subtitle,#primary-action,#secondary-action,#hero-media,#categories-eyebrow,#categories-title,#products-eyebrow,#products-title,#contact-eyebrow,#contact-title,#contact-copy,#benefit-1,#benefit-2,#benefit-3,#footer-text,.page-nav-link');
            if(editable) e.preventDefault();
          }
        },true);
        doc.addEventListener('submit',e=>e.preventDefault(),true);
      }
    }catch(err){
      console.warn('[RADZ Salvatex editor compat]',err);
    }
  }

  function bind(frame){
    if(!frame || frame.dataset.radzSalvatexCompatBound==='1') return;
    frame.dataset.radzSalvatexCompatBound='1';
    frame.addEventListener('load',()=>{
      setTimeout(()=>normalizeLegacyPreview(frame),0);
      setTimeout(()=>normalizeLegacyPreview(frame),300);
      setTimeout(()=>normalizeLegacyPreview(frame),900);
    });
    normalizeLegacyPreview(frame);
  }

  function scan(){
    if(location.hash!=='#layout') return;
    const frame=document.getElementById('ve-frame');
    if(frame) bind(frame);
  }

  const observer=new MutationObserver(()=>scan());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(scan,0));
  setTimeout(scan,0);
})();
