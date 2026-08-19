(()=>{
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function getJson(url,opt={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt,headers:{accept:'application/json','content-type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Falha ao carregar.');return d}
  function field(label,name,value='',type='text'){return `<label style="display:grid;gap:7px"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" value="${esc(value)}" style="width:100%;padding:11px;border:1px solid #d7dde5;border-radius:9px"></label>`}
  async function render(){
    if(location.hash!=='#layout')return;
    const c=$('#view-content');if(!c)return;
    c.innerHTML='<div class="panel empty">Carregando editor de layout…</div>';
    try{
      const [l,s]=await Promise.all([getJson('/admin/api/layout'),getJson('/admin/api/config')]);
      const layout=l.layout||{},config=s.config||{},hero=layout.hero||{},branding=layout.branding||{},colors=branding.colors||{},footer=layout.footer||{},pa=hero.primaryAction||{},sa=hero.secondaryAction||{};
      c.innerHTML=`<section class="panel" data-layout-v2><div class="panel-head"><div><h2>Identidade e página inicial</h2><small>Estas informações são exclusivas desta empresa e substituem qualquer conteúdo do protótipo Salvatex.</small></div></div><form id="layout-v2-form" style="display:grid;gap:22px"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">${field('Nome exibido da loja','storeName',config.storeName||'')}${field('Logo (URL)','logo',branding.logo||'')}${field('Cor principal','primary',colors.primary||'#102a43','color')}${field('Cor de destaque','accent',colors.accent||'#c49a58','color')}</div><div><h3>Banner principal</h3><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">${field('Texto superior','eyebrow',hero.eyebrow||'')}${field('Imagem do banner (URL)','heroImage',hero.image||'')}${field('Título principal','title',hero.title||'')}${field('Subtítulo','subtitle',hero.subtitle||'')}${field('Botão principal','primaryLabel',pa.label||pa.text||'Ver produtos')}${field('Link do botão principal','primaryHref',pa.href||pa.url||'#produtos')}${field('Botão secundário','secondaryLabel',sa.label||sa.text||'Explorar categorias')}${field('Link do botão secundário','secondaryHref',sa.href||sa.url||'#categorias')}</div></div><div><h3>Rodapé</h3>${field('Texto do rodapé','footerText',footer.text||config.footerText||'')}</div><div style="display:flex;gap:12px;align-items:center"><button type="submit" class="primary-btn">Salvar layout</button><a href="/" target="_blank" class="ghost-btn">Visualizar loja ↗</a><span id="layout-v2-result"></span></div></form></section>`;
      $('#layout-v2-form').addEventListener('submit',save);
    }catch(e){c.innerHTML=`<div class="panel empty">${esc(e.message)}</div>`}
  }
  async function save(e){
    e.preventDefault();const f=e.currentTarget,out=$('#layout-v2-result'),btn=f.querySelector('button[type="submit"]');btn.disabled=true;out.textContent='Salvando…';
    const v=n=>f.elements[n]?.value?.trim()||'';
    const layout={branding:{logo:v('logo'),colors:{primary:v('primary'),accent:v('accent')}},hero:{enabled:true,eyebrow:v('eyebrow'),title:v('title'),subtitle:v('subtitle'),image:v('heroImage'),primaryAction:{label:v('primaryLabel'),href:v('primaryHref')},secondaryAction:{label:v('secondaryLabel'),href:v('secondaryHref')}},footer:{text:v('footerText')}};
    try{await Promise.all([getJson('/admin/api/layout',{method:'PUT',body:JSON.stringify({layout})}),getJson('/admin/api/config',{method:'PUT',body:JSON.stringify({config:{storeName:v('storeName'),footerText:v('footerText')}})})]);out.textContent='Layout salvo e publicado.'}catch(err){out.textContent=err.message}finally{btn.disabled=false}
  }
  function schedule(){if(location.hash==='#layout')setTimeout(render,80)}
  window.addEventListener('hashchange',schedule);document.addEventListener('click',e=>{if(e.target.closest('[data-view="layout"]'))setTimeout(render,120)});document.addEventListener('DOMContentLoaded',schedule,{once:true});
})();
