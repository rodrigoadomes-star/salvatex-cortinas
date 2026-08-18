(function(){
  function openFromHash(){
    const key=location.hash.replace('#','').trim();
    if(!['analytics','marketing','meta'].includes(key))return;
    const app=document.getElementById('admin-app');
    if(!app||app.hidden)return;
    const link=document.querySelector(`[data-radz-panel="${key}"]`);
    if(link)link.click();
  }
  window.addEventListener('hashchange',()=>setTimeout(openFromHash,40));
  let tries=0;const timer=setInterval(()=>{tries++;openFromHash();const app=document.getElementById('admin-app');if((app&&!app.hidden)||tries>40)clearInterval(timer)},125);
})();
