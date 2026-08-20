(()=>{
  function text(el,value){if(el&&value!=null&&value!=='')el.textContent=value}
  function apply(){
    const c=window.CONFIG||{},l=c.labels||{};
    text(document.getElementById('configurator-page-kicker'),l.kicker);
    text(document.getElementById('configurator-page-title'),l.pageTitle||c.configurador?.nome);
    text(document.getElementById('configurator-page-description'),l.pageDescription||c.configurador?.descricao);
    text(document.querySelector('.config .section-title'),l.formTitle);
    text(document.querySelector('.config .section-sub'),l.formSubtitle);
    const steps=[...document.querySelectorAll('.steps .step')];
    [l.step1,l.step2,l.step3,l.step4,l.step5].forEach((v,i)=>text(steps[i],v));
    text(document.querySelector('label[for="largura"]'),l.widthLabel);
    text(document.querySelector('label[for="altura"]'),l.heightLabel);
    const choiceTitles=[...document.querySelectorAll('.choice-title')];
    const values=[l.modelLabel,l.fabricLabel,l.liningLabel,l.colorLabel,l.trackLabel];
    values.forEach((v,i)=>text(choiceTitles[i],v));
    const summary=document.querySelector('.pricebox small,.summary .summary-title,[data-summary-title]');
    text(summary,l.summaryTitle);
    const cart=[...document.querySelectorAll('button,a')].find(el=>/adicionar ao carrinho/i.test(el.textContent||''));
    text(cart,l.addToCartLabel);
    document.documentElement.dataset.configuratorTenant='1';
  }
  Promise.resolve(window.CONFIG_READY).then(apply).catch(apply);
  window.addEventListener('salvatex:layout-ready',apply);
})();
