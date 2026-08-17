(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let running=false;
  let lastRun=0;

  async function fixUsersView(){
    const form=$('#new-user');
    if(!form)return;
    const select=$('select[name="role"]',form);
    if(select&&!select.querySelector('option[value="platform_finance"]')){
      const option=document.createElement('option');
      option.value='platform_finance';
      option.textContent='Financeiro';
      select.appendChild(option);
    }

    const now=Date.now();
    if(running||now-lastRun<1000)return;
    running=true;
    lastRun=now;
    try{
      const response=await fetch('/radz/api/users',{credentials:'same-origin'});
      if(!response.ok)return;
      const data=await response.json();
      const roles=new Map((data.users||[]).map(u=>[String(u.email||'').toLowerCase(),u.role]));
      $$('#section-content table tbody tr').forEach(row=>{
        const cells=row.querySelectorAll('td');
        if(cells.length<2)return;
        const email=String(cells[0].querySelector('small')?.textContent||'').trim().toLowerCase();
        const role=roles.get(email);
        if(role==='platform_finance')cells[1].textContent='Financeiro';
        else if(role==='platform_owner')cells[1].textContent='Super Admin';
        else if(role==='platform_support')cells[1].textContent='Suporte';
      });
    }catch{}finally{running=false;}
  }

  new MutationObserver(()=>fixUsersView()).observe(document.documentElement,{childList:true,subtree:true});
  fixUsersView();
})();
