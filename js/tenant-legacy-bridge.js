(()=>{
  const host=location.hostname.toLowerCase();
  const tenant=host.endsWith('.radzhub.com.br')&&host!=='salvatex.radzhub.com.br'&&host!=='radzhub.com.br'&&host!=='www.radzhub.com.br';
  if(!tenant)return;
  const esc=v=>String(v??'').trim();
  async function boot(){
    let cfg={};
    try{const r=await fetch('/api/store-config',{cache:'no-store',credentials:'same-origin'});const d=await r.json();cfg=d.config||{}}catch{}
    const name=esc(cfg.storeName||cfg.name||host.split('.')[0]||'Loja');
    document.querySelectorAll('.logo').forEach(el=>{el.textContent=name.toUpperCase();});
    document.querySelectorAll('[data-store-name]').forEach(el=>{el.textContent=name;});
    if(document.title.toLowerCase().includes('salvatex'))document.title=document.title.replace(/salvatex(?: cortinas)?/ig,name);
    const emptyText=document.querySelector('#carrinho-vazio p');
    if(emptyText)emptyText.textContent='Adicione produtos ao carrinho para continuar sua compra.';
    const emptyBtn=document.querySelector('#carrinho-vazio .carrinho-vazio-botao');
    if(emptyBtn){emptyBtn.textContent='Continuar comprando';emptyBtn.href='/';}
    document.querySelectorAll('.carrinho-voltar').forEach(a=>{a.textContent='← Continuar comprando';a.href='/';});
    document.querySelectorAll('.carrinho-continuar').forEach(a=>{a.textContent='+ Adicionar outro produto';a.href='/';});
    document.querySelectorAll('.collection-placeholder,.account-product-placeholder').forEach(el=>{el.textContent=name.toUpperCase();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
