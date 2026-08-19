(()=>{
  const host=location.hostname.toLowerCase();
  const tenant=host.endsWith('.radzhub.com.br')&&host!=='salvatex.radzhub.com.br'&&host!=='radzhub.com.br'&&host!=='www.radzhub.com.br';
  if(!tenant)return;
  function patch(){
    document.querySelectorAll('.carrinho-voltar').forEach(a=>{a.textContent='← Continuar comprando';a.href='/';});
    document.querySelectorAll('.carrinho-continuar').forEach(a=>{a.textContent='+ Adicionar outro produto';a.href='/#produtos';});
    document.querySelectorAll('.carrinho-vazio-botao').forEach(a=>{a.textContent='Ver produtos';a.href='/#produtos';});
    document.querySelectorAll('.carrinho-vazio p').forEach(p=>{p.textContent='Adicione produtos ao carrinho para continuar sua compra.';});
    const layout=document.getElementById('carrinho-layout');
    if(layout){
      const btn=layout.querySelector('.carrinho-vazio-botao');if(btn){btn.textContent='Ver produtos';btn.href='/#produtos';}
      layout.querySelectorAll('a').forEach(a=>{if(/configurar minha cortina/i.test(a.textContent||'')){a.textContent='Ver produtos';a.href='/#produtos';}});
      layout.querySelectorAll('p').forEach(p=>{if(/configure um produto/i.test(p.textContent||''))p.textContent='Escolha um produto para adicioná-lo ao carrinho.';});
    }
  }
  const obs=new MutationObserver(patch);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{patch();obs.observe(document.body,{subtree:true,childList:true});},{once:true});
  else{patch();obs.observe(document.body,{subtree:true,childList:true});}
})();
