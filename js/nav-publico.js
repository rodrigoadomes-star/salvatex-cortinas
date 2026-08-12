(function(){
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function carregarPaginasMenu(){
    const nav=document.querySelector('.navlinks');
    if(!nav) return;
    try{
      const r=await fetch('/api/pages',{cache:'no-store'});
      const d=await r.json();
      if(!r.ok||!d.ok||!Array.isArray(d.pages)) return;
      const pages=d.pages.filter(p=>p.slug&&p.title);
      if(!pages.length) return;

      const existente=nav.querySelector('[data-dynamic-pages]');
      if(existente) existente.remove();

      const wrap=document.createElement('div');
      wrap.className='nav-pages-dropdown';
      wrap.dataset.dynamicPages='1';
      wrap.innerHTML=`<button type="button" class="nav-pages-toggle">Páginas <span>⌄</span></button><div class="nav-pages-menu">${pages.map(p=>`<a href="pagina.html?slug=${encodeURIComponent(p.slug)}">${esc(p.title)}</a>`).join('')}</div>`;
      nav.appendChild(wrap);

      const btn=wrap.querySelector('.nav-pages-toggle');
      btn.addEventListener('click',e=>{e.stopPropagation();wrap.classList.toggle('open')});
      document.addEventListener('click',e=>{if(!wrap.contains(e.target))wrap.classList.remove('open')});
    }catch(error){
      console.warn('Não foi possível carregar páginas no menu',error);
    }
  }
  document.addEventListener('DOMContentLoaded',carregarPaginasMenu);
})();
