(()=>{
let storeName='Loja';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function replaceText(value){return String(value||'').replace(/SALVATEX\s*—\s*ENVIO/gi,storeName.toUpperCase()+' — ENVIO').replace(/Salvatex Cortinas/gi,storeName).replace(/Retorno Salvatex/gi,'Retorno '+storeName)}
function patchFunctions(){
  if(window.orderPrintHtml&&!window.orderPrintHtml.__radzTenant){const original=window.orderPrintHtml;const wrapped=function(){return replaceText(original.apply(this,arguments))};wrapped.__radzTenant=true;window.orderPrintHtml=wrapped;}
  if(window.zplForOrder&&!window.zplForOrder.__radzTenant){const original=window.zplForOrder;const wrapped=function(){return replaceText(original.apply(this,arguments))};wrapped.__radzTenant=true;window.zplForOrder=wrapped;}
}
function patchDom(){
  document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{try{const href=decodeURIComponent(a.getAttribute('href')||'');if(/Retorno Salvatex/i.test(href)){const next=encodeURI(replaceText(href)).replace(/#/g,'%23');if(a.getAttribute('href')!==next)a.setAttribute('href',next)}}catch{}});
  const user=document.querySelector('.sidebar-user small');if(user&&storeName!=='Loja'&&user.textContent!==storeName)user.textContent=storeName;
}
async function load(){
  try{const r=await fetch('/admin/api/config',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const d=await r.json();const next=String(d.config?.storeName||d.config?.name||storeName).trim()||'Loja';if(next!==storeName)storeName=next;patchFunctions();patchDom();}
  catch{}
}
document.addEventListener('DOMContentLoaded',()=>{
  patchFunctions();patchDom();load();
  const root=document.getElementById('admin-app');
  if(root){
    let scheduled=false;
    new MutationObserver(()=>{
      if(scheduled)return;scheduled=true;
      requestAnimationFrame(()=>{scheduled=false;patchFunctions();patchDom();if(!root.hidden&&storeName==='Loja')load()});
    }).observe(root,{subtree:true,childList:true});
  }
},{once:true});
window.addEventListener('hashchange',()=>setTimeout(()=>{patchFunctions();patchDom()},120));
})();
