(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0)/100);
  const date=v=>v?new Date(v).toLocaleDateString('pt-BR'):'—';
  let csrf='';
  let user=null;
  let financeActive=false;

  async function session(){
    const r=await fetch('/radz/api/session',{credentials:'same-origin'});
    if(!r.ok)return null;
    const d=await r.json();
    csrf=d.csrfToken||'';
    user=d.user||null;
    return d;
  }

  async function financeApi(opt={}){
    const method=String(opt.method||'GET').toUpperCase();
    const headers={accept:'application/json',...(opt.headers||{})};
    if(!['GET','HEAD'].includes(method)){
      headers['content-type']='application/json';
      if(!csrf)await session();
      headers['x-csrf-token']=csrf;
    }
    const r=await fetch('/radz/api/finance',{credentials:'same-origin',...opt,headers});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Object.assign(new Error(d.message||`Falha ${r.status}`),{data:d,status:r.status});
    return d;
  }

  function hasRole(role){return (user?.roles||[user?.role]).includes(role);}
  function canFinance(){return hasRole('platform_owner')||hasRole('platform_finance');}
  function canWrite(){return canFinance();}
  function statusLabel(s){return ({pending:'Pendente',paid:'Pago',overdue:'Vencido',cancelled:'Cancelado',refunded:'Reembolsado',waived:'Isento',unknown:'Sem cobrança'})[s]||s;}
  function statusClass(s){return s==='paid'?'active':s==='overdue'?'cancelled':s==='pending'?'trial':'disabled';}
  function metric(label,value,foot=''){return `<article><small>${esc(label)}</small><strong>${esc(value)}</strong>${foot?`<span>${esc(foot)}</span>`:''}</article>`;}
  function billingSource(row){return row?.metadata?.source==='calculated'?'Calculada':row?.metadata?.source==='legacy'?'Legada':'Manual';}

  function ensureNav(){
    const nav=$('#radz-nav');
    if(!nav||$('#radz-finance-nav'))return;
    const b=document.createElement('button');
    b.id='radz-finance-nav';
    b.type='button';
    b.textContent='Financeiro';
    b.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      openFinance();
    });
    nav.appendChild(b);
  }

  function applyRoleVisibility(){
    if(!user)return;
    ensureNav();
    const finance=$('#radz-finance-nav');
    if(finance)finance.hidden=!canFinance();
    if(hasRole('platform_finance')&&!hasRole('platform_owner')){
      $$('#radz-nav [data-section]').forEach(b=>{b.hidden=true;});
      if(finance)finance.hidden=false;
      if(!financeActive)setTimeout(()=>openFinance(),0);
    }
  }

  async function openFinance(){
    if(!canFinance())return;
    financeActive=true;
    $$('#radz-nav button').forEach(b=>b.classList.toggle('active',b.id==='radz-finance-nav'));
    const title=$('#section-title');
    const content=$('#section-content');
    if(title)title.textContent='Financeiro';
    if(!content)return;
    content.innerHTML='<div class="config-card">Carregando financeiro…</div>';

    try{
      const d=await financeApi();
      const m=d.metrics||{};
      const rows=d.billing||[];
      const formHtml=canWrite()?`
        <form id="radz-billing-form" class="config-card top-gap">
          <div class="section-head"><div><h2>Lançar / atualizar cobrança</h2><p>Você pode calcular automaticamente pelo faturamento real ou informar um valor manual.</p></div></div>
          <div class="form-grid">
            <label>Empresa<select name="companyId" required><option value="">Selecione…</option>${rows.map(x=>`<option value="${esc(x.companyId)}">${esc(x.companyName)}</option>`).join('')}</select></label>
            <label>Competência<input name="referenceMonth" type="month" required></label>
            <label>Valor manual (centavos)<input name="amountCents" type="number" min="0" value="0"></label>
            <label>Status<select name="paymentStatus"><option value="pending">Pendente</option><option value="paid">Pago</option><option value="overdue">Vencido</option><option value="waived">Isento</option><option value="cancelled">Cancelado</option><option value="refunded">Reembolsado</option></select></label>
            <label>Vencimento<input name="dueAt" type="date"></label>
            <label>Observação<input name="notes" maxlength="1000"></label>
          </div>
          <div class="toolbar"><button type="button" id="radz-billing-calculate">Calcular pelo faturamento</button><button type="submit">Salvar valor manual</button></div>
          <p class="form-result"></p>
        </form>`:'';

      const tableRows=rows.map(x=>`<tr>
        <td><strong>${esc(x.companyName)}</strong><small>${esc(x.companyId)}</small></td>
        <td>${esc(x.planCode||'—')}</td>
        <td>${esc(x.referenceMonth||'—')}</td>
        <td>${x.billingId?money(x.amountCents):'—'}</td>
        <td><span class="status ${statusClass(x.paymentStatus)}">${esc(statusLabel(x.paymentStatus))}</span></td>
        <td>${esc(x.billingId?billingSource(x):'—')}</td>
        <td>${esc(date(x.dueAt||x.billingDueAt))}</td>
        <td>${esc(x.updatedAt?new Date(x.updatedAt).toLocaleString('pt-BR'):'—')}</td>
      </tr>`).join('')||'<tr><td colspan="8">Nenhuma empresa.</td></tr>';

      content.innerHTML=`
        <div class="metrics metrics-wide">
          ${metric('Empresas',m.companies?.total||0)}
          ${metric('Pedidos · '+Number(d.periodDays||30)+'d',m.orders||0)}
          ${metric('Vendas brutas',money(m.grossCents||0))}
          ${metric('Cobranças pendentes',m.pendingCompanies||0,money(m.pendingAmountCents||0))}
        </div>
        ${formHtml}
        <div class="table-wrap top-gap"><table>
          <thead><tr><th>Empresa</th><th>Plano</th><th>Competência</th><th>Valor</th><th>Status</th><th>Origem</th><th>Vencimento</th><th>Atualizado</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table></div>`;
      bindFinance();
    }catch(e){
      const mig=e.data?.code==='MIGRATION_REQUIRED';
      content.innerHTML=`<div class="config-card"><h2>${mig?'Migration financeira pendente':'Não foi possível carregar o financeiro'}</h2><p>${esc(e.message)}</p>${mig?`<p><code>${esc(e.data.migration||'')}</code></p>`:''}</div>`;
    }
  }

  function formPayload(form){
    const fd=new FormData(form);
    return {
      companyId:fd.get('companyId'),
      referenceMonth:fd.get('referenceMonth'),
      amountCents:Number(fd.get('amountCents')||0),
      paymentStatus:fd.get('paymentStatus'),
      dueAt:fd.get('dueAt')||null,
      notes:fd.get('notes')||''
    };
  }

  function bindFinance(){
    const form=$('#radz-billing-form');
    if(!form)return;
    const out=$('.form-result',form);
    form.onsubmit=async e=>{
      e.preventDefault();
      out.textContent='Salvando…';
      try{
        await financeApi({method:'POST',body:JSON.stringify(formPayload(form))});
        out.textContent='Cobrança salva.';
        setTimeout(openFinance,250);
      }catch(x){out.textContent=x.message;}
    };
    const calc=$('#radz-billing-calculate');
    if(calc)calc.onclick=async()=>{
      const payload=formPayload(form);
      if(!payload.companyId||!payload.referenceMonth){out.textContent='Selecione a empresa e a competência.';return;}
      out.textContent='Calculando pelo faturamento real…';
      calc.disabled=true;
      try{
        const result=await financeApi({method:'POST',body:JSON.stringify({action:'calculate',companyId:payload.companyId,referenceMonth:payload.referenceMonth})});
        out.textContent=`Calculado: ${money(result.amountCents||0)}. Atualizando…`;
        setTimeout(openFinance,450);
      }catch(x){out.textContent=x.message;}
      finally{calc.disabled=false;}
    };
  }

  function augmentUsers(){
    const select=$('#new-user select[name="role"]');
    if(select&&!select.querySelector('option[value="platform_finance"]')){
      const o=document.createElement('option');
      o.value='platform_finance';
      o.textContent='Financeiro';
      select.appendChild(o);
    }
  }

  const observer=new MutationObserver(()=>{
    ensureNav();
    applyRoleVisibility();
    augmentUsers();
    if(financeActive&&$('#radz-finance-nav')){
      $$('#radz-nav button').forEach(b=>b.classList.toggle('active',b.id==='radz-finance-nav'));
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener('click',e=>{
    const b=e.target.closest('#radz-nav [data-section]');
    if(b)financeActive=false;
  },true);

  const refresh=$('#refresh');
  if(refresh){
    refresh.addEventListener('click',e=>{
      if(financeActive){
        e.preventDefault();
        e.stopImmediatePropagation();
        openFinance();
      }
    },true);
  }

  session().then(()=>{
    ensureNav();
    applyRoleVisibility();
  }).catch(()=>{});
})();
