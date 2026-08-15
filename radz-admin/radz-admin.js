(()=>{
  let csrf="";
  const login=document.querySelector("#login"),app=document.querySelector("#app"),body=document.querySelector("#companies"),metrics=document.querySelector("#metrics");
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function api(url,opt={}){const method=String(opt.method||"GET").toUpperCase();const headers={accept:"application/json","content-type":"application/json",...(opt.headers||{})};if(!["GET","HEAD","OPTIONS"].includes(method)&&csrf)headers["x-csrf-token"]=csrf;const r=await fetch(url,{credentials:"same-origin",...opt,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.message||d.code||"Falha"),{status:r.status});return d}
  async function load(){const d=await api("/radz/api/companies");const active=d.companies.filter(c=>c.status==="active"||c.status==="trial").length;const fees=d.companies.reduce((s,c)=>s+Number(c.platform_fee_basis_points||0),0);metrics.innerHTML=`<article><small>EMPRESAS</small><strong>${d.companies.length}</strong></article><article><small>ATIVAS / TESTE</small><strong>${active}</strong></article><article><small>TAXA MÉDIA</small><strong>${d.companies.length?(fees/d.companies.length/100).toFixed(2).replace(".",","):"0,00"}%</strong></article>`;body.innerHTML=d.companies.map(c=>`<tr><td><strong>${esc(c.trade_name)}</strong><small>${esc(c.email)}</small></td><td>${esc(c.document_number)}</td><td>${esc(c.plan_code)}</td><td>${(Number(c.platform_fee_basis_points)/100).toFixed(2).replace(".",",")}%</td><td><span class="status ${esc(c.status)}">${esc(c.status)}</span></td><td>${c.active_domains||0}</td><td>${c.active_users||0}</td></tr>`).join("")}
  async function boot(){try{const session=await api("/radz/api/session");csrf=session.csrfToken||"";login.hidden=true;app.hidden=false;await load()}catch{csrf="";login.hidden=false;app.hidden=true}}
  document.querySelector("#login-form").addEventListener("submit",async e=>{e.preventDefault();const error=document.querySelector("#error");error.textContent="";try{const result=await api("/radz/api/login",{method:"POST",body:JSON.stringify({token:document.querySelector("#token").value})});csrf=result.csrfToken||"";await boot()}catch(x){error.textContent=x.message}});
  document.querySelector("#refresh").addEventListener("click",load);
  document.querySelector("#logout").addEventListener("click",async()=>{await api("/radz/api/logout",{method:"POST"}).catch(()=>{});csrf="";location.reload()});
  boot();
})();

