(function(){
let session=null;
async function getSession(){try{return await fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.json())}catch{return{authenticated:false}}}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function prefill(user){if(!user)return;const n=document.getElementById('checkout-nome'),e=document.getElementById('checkout-email');if(n&&!n.value)n.value=user.name||'';if(e&&!e.value)e.value=user.email||''}
function googleHref(returnTo){return `/api/auth/google/start?return_to=${encodeURIComponent(returnTo||location.pathname+location.search)}`}
function renderGoogleButton(target,returnTo){
  if(!target||session?.authenticated)return;
  target.innerHTML='';
  const a=document.createElement('a');
  a.href=googleHref(returnTo);
  a.className='radz-google-login';
  a.setAttribute('role','button');
  a.innerHTML='<span class="radz-google-g" aria-hidden="true">G</span><span>Continuar com Google</span>';
  a.style.cssText='display:flex;align-items:center;justify-content:center;gap:12px;width:min(100%,360px);min-height:46px;margin:0 auto;border:1px solid #cfd4dc;border-radius:8px;background:#fff;color:#172033;text-decoration:none;font:600 14px/1.2 Arial,sans-serif;box-shadow:0 1px 2px #1018280d;cursor:pointer';
  const g=a.querySelector('.radz-google-g');g.style.cssText='display:grid;place-items:center;width:22px;height:22px;border-radius:50%;font-weight:800;color:#4285f4;background:#fff';
  target.appendChild(a);
}
function renderCheckoutBox(){const box=document.getElementById('customer-login-box');if(!box)return;if(session?.authenticated){box.innerHTML=`<div class="customer-login-ok"><strong>Olá, ${esc(session.user.name||session.user.email)}</strong><span>Você está conectado à sua conta.</span><a href="minha-conta.html">Ver meus pedidos</a></div>`;prefill(session.user)}else{box.innerHTML='<div><strong>Finalize mais rápido</strong><span>Entre com sua conta ou preencha os dados abaixo.</span></div><div id="google-login-checkout"></div>';renderGoogleButton(document.getElementById('google-login-checkout'),'/checkout.html')}}
function renderAccountLogin(){renderGoogleButton(document.getElementById('google-login-account'),'/minha-conta.html')}
function renderNav(){document.querySelectorAll('.navlinks').forEach(nav=>{let menu=nav.querySelector('.customer-account-menu');if(!menu){menu=document.createElement('details');menu.className='customer-account-menu';menu.innerHTML='<summary>Minha conta</summary><div class="customer-account-dropdown"></div>';nav.appendChild(menu)}const drop=menu.querySelector('.customer-account-dropdown');if(session?.authenticated){drop.innerHTML='<a href="minha-conta.html">Meus pedidos</a><button type="button">Sair</button>';drop.querySelector('button').onclick=async()=>{await fetch('/api/auth/logout',{method:'POST'});location.href='/'}}else{drop.innerHTML='<a href="criar-conta.html">Criar uma conta</a><a href="minha-conta.html">Iniciar sessão</a>'}})}
async function init(){session=await getSession();renderCheckoutBox();renderAccountLogin();renderNav();window.addEventListener('salvatex:navigation-ready',renderNav);window.RADZCustomer={session,logout:async()=>{await fetch('/api/auth/logout',{method:'POST'});location.reload()}};window.SalvatexCustomer=window.RADZCustomer}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
