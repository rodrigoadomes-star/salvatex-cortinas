(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function prettyPlan(v){return String(v||'').toLowerCase()==='business'?'Business':'Essencial'}
let decorating=false;
async function decoratePlans(){
  if(decorating)return;
  const forms=$$('.plan-form');if(!forms.length)return;
  decorating=true;
  try{
    let companies=[];try{const r=await fetch('/radz/api/companies',{credentials:'same-origin',headers:{accept:'application/json'}});const d=await r.json();if(r.ok)companies=d.companies||[]}catch{}
    forms.forEach(f=>{
      const old=f.querySelector('input[name="plan"]');
      if(old){const select=document.createElement('select');select.name='plan';select.innerHTML='<option value="essencial">Essencial</option><option value="business">Business</option>';select.value=String(old.value||'').toLowerCase()==='business'?'business':'essencial';old.replaceWith(select)}
      const c=companies.find(x=>String(x.id)===String(f.dataset.id));
      let request={};try{request=JSON.parse(c?.upgrade_request_json||'{}')}catch{}
      if(request?.status==='pending_review'&&!f.querySelector('.upgrade-review')){
        const p=document.createElement('p');p.className='form-result upgrade-review';p.innerHTML='<strong>Upgrade solicitado pela empresa:</strong> Business · <span class="status trial">Em análise</span>';f.insertBefore(p,f.querySelector('button[type="submit"]'));
      }
    });
  }finally{decorating=false}
}
function decorateCompanyTable(){
  const table=$('#section-content table');if(!table)return;
  const heads=[...table.querySelectorAll('thead th')];const idx=heads.findIndex(h=>h.textContent.trim()==='Plano');if(idx<0)return;
  table.querySelectorAll('tbody tr').forEach(tr=>{const td=tr.children[idx];if(!td)return;const next=prettyPlan(td.textContent.trim());if(td.textContent.trim()!==next)td.textContent=next});
}
function decorate(){decorateCompanyTable();decoratePlans()}
document.getElementById('radz-nav')?.addEventListener('click',()=>setTimeout(decorate,40));
document.getElementById('refresh')?.addEventListener('click',()=>setTimeout(decorate,120));
setTimeout(decorate,200);
})();
