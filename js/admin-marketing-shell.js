(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const fmt=n=>new Intl.NumberFormat('pt-BR').format(Number(n||0));
  const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(c||0)/100);
  let identity=null;

  async function fetchJson(url,options={}){
    const headers={...(options.headers||{})};
    if(options.body&&!headers['content-type'])headers['content-type']='application/json';
    const csrf=sessionStorage.getItem('salvatexAdminCsrf')||'';
    if(csrf&&!['GET','HEAD'].includes(String(options.method||'GET').toUpperCase()))headers['x-csrf-token']=csrf;
    const r=await fetch(url,{credentials:'same-origin',...options,headers});
    const d=await r.json().catch(()=>({}));
    if(r.status===401){location.href='/admin/';throw new Error('Sessão expirada.');}
    if(!r.ok){const e=new Error(d.message||d.code||`Falha (${r.status})`);e.status=r.status;e.data=d;throw e;}
    return d;
  }

  function activate(key){
    $$('#admin-nav [data-radz-panel]').forEach(a=>a.classList.toggle('active',a.dataset.radzPanel===key));
    $$('#admin-nav [data-view]').forEach(b=>b.classList.remove('active'));
    $('.sidebar')?.classList.remove('open');
  }
  function header(title,subtitle){
    $('#view-title').textContent=title;
    $('#view-subtitle').textContent=subtitle;
  }
  function content(html){$('#view-content').innerHTML=html;}

  function panelCss(){return `<style>
    .radz-tools{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:18px;flex-wrap:wrap}.radz-tools .filters{display:flex;gap:8px;flex-wrap:wrap}.radz-tools input,.radz-tools button{border:1px solid #dce2eb;border-radius:9px;padding:9px 12px;background:#fff}.radz-tools button,.radz-primary{background:#071b2e!important;color:#fff!important;border:0!important;cursor:pointer}.radz-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.radz-card{background:#fff;border:1px solid #e3e8ef;border-radius:14px;padding:18px}.radz-card.full{grid-column:1/-1}.radz-card h2{margin:0 0 8px}.radz-muted{color:#667085}.radz-field{display:grid;gap:6px;margin:12px 0}.radz-field input{padding:11px;border:1px solid #d0d5dd;border-radius:9px}.radz-row{display:flex;gap:12px;align-items:center;margin:12px 0;flex-wrap:wrap}.radz-save{margin-top:16px;border:0;border-radius:9px;padding:11px 15px;font-weight:800;background:#071b2e;color:#fff;cursor:pointer}.radz-status{display:inline-flex;padding:6px 9px;border-radius:999px;background:#eef2f7;font-weight:700}.radz-status.ok{background:#e8f7ef;color:#087a42}.radz-beta{display:inline-block;padding:3px 7px;border-radius:999px;background:#eef2ff;color:#444ce7;font-size:11px;font-weight:800}.radz-upgrade{padding:20px;border:1px dashed #c7d0dc;border-radius:14px;background:#fbfcfe}.radz-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.radz-stat{background:#fff;border:1px solid #e3e8ef;border-radius:14px;padding:18px}.radz-stat small{color:#667085}.radz-stat strong{display:block;font-size:24px;margin-top:4px}.radz-funnel{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.radz-step{text-align:center;background:#f8fafc;border-radius:10px;padding:12px 8px}.radz-step strong{display:block;font-size:19px}.radz-bar{display:grid;grid-template-columns:120px 1fr 52px;gap:8px;align-items:center;margin:9px 0}.radz-track{height:8px;background:#eef2f6;border-radius:9px;overflow:hidden}.radz-fill{height:100%;background:#ad8246}.radz-account{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:13px 0;border-top:1px solid #eee}.radz-account:first-child{border-top:0}.radz-account small{display:block;color:#687386;margin-top:3px}.radz-message{margin-top:12px}.radz-error{color:#b42318}.radz-ok{color:#087a42}@media(max-width:800px){.radz-grid,.radz-cards{grid-template-columns:1fr}.radz-card.full{grid-column:auto}.radz-funnel{grid-template-columns:1fr}.radz-bar{grid-template-columns:95px 1fr 42px}}
  </style>`}

  function bars(rows,key,label){
    const max=Math.max(1,...rows.map(r=>Number(r[key]||0)));
    return rows.map(r=>`<div class="radz-bar"><span title="${esc(r[label]||'')}">${esc(String(r[label]||'—').slice(0,25))}</span><div class="radz-track"><div class="radz-fill" style="width:${Math.max(2,Number(r[key]||0)/max*100)}%"></div></div><b>${fmt(r[key])}</b></div>`).join('')||'<span class="radz-muted">Sem dados no período.</span>';
  }

  async function showAnalytics(){
    activate('analytics');header('Visitas e conversão','Analytics próprio da loja, independente de plataformas externas.');
    const today=new Date(),fromDefault=new Date(Date.now()-29*86400000);
    content(panelCss()+`<div class="radz-tools"><div class="radz-muted">Acompanhe o funil da loja e as origens de tráfego.</div><div class="filters"><input id="radz-from" type="date" value="${fromDefault.toISOString().slice(0,10)}"><input id="radz-to" type="date" value="${today.toISOString().slice(0,10)}"><button id="radz-analytics-load">Atualizar</button></div></div><div id="radz-analytics-app"><div class="radz-card">Carregando…</div></div>`);
    async function load(){
      const app=$('#radz-analytics-app');app.innerHTML='<div class="radz-card">Carregando…</div>';
      try{
        const d=await fetchJson(`/admin/api/analytics?from=${encodeURIComponent($('#radz-from').value)}&to=${encodeURIComponent($('#radz-to').value)}`),s=d.summary||{};
        app.innerHTML=`<section class="radz-cards"><div class="radz-stat"><small>Visitantes únicos</small><strong>${fmt(s.visitors)}</strong></div><div class="radz-stat"><small>Sessões</small><strong>${fmt(s.sessions)}</strong></div><div class="radz-stat"><small>Visualizações</small><strong>${fmt(s.page_views)}</strong></div><div class="radz-stat"><small>Conversão</small><strong>${Number(s.conversionRate||0).toFixed(2).replace('.',',')}%</strong></div></section><section class="radz-card" style="margin-top:14px"><h2>Funil da loja</h2><div class="radz-funnel"><div class="radz-step"><small>Visitas</small><strong>${fmt(s.page_views)}</strong></div><div class="radz-step"><small>Produtos</small><strong>${fmt(s.product_views)}</strong></div><div class="radz-step"><small>Carrinho</small><strong>${fmt(s.add_to_cart)}</strong></div><div class="radz-step"><small>Checkout</small><strong>${fmt(s.checkout_started)}</strong></div><div class="radz-step"><small>Pedidos</small><strong>${fmt(s.orders)}</strong></div></div><p><b>Receita atribuída:</b> ${money(s.revenue_cents)}</p></section><div class="radz-grid" style="margin-top:14px"><section class="radz-card"><h2>Origem das visitas</h2>${bars(d.sources||[],'visits','source')}</section><section class="radz-card"><h2>Dispositivos</h2>${bars(d.devices||[],'visits','device')}</section><section class="radz-card"><h2>Páginas mais acessadas</h2>${bars(d.pages||[],'views','path')}</section><section class="radz-card"><h2>Histórico diário</h2><div class="table-wrap"><table class="admin-table"><thead><tr><th>Dia</th><th>Visitas</th><th>Carrinhos</th><th>Pedidos</th></tr></thead><tbody>${(d.series||[]).slice(-14).reverse().map(x=>`<tr><td>${esc(x.event_date)}</td><td>${fmt(x.page_views)}</td><td>${fmt(x.add_to_cart)}</td><td>${fmt(x.orders)}</td></tr>`).join('')||'<tr><td colspan="4">Sem dados.</td></tr>'}</tbody></table></div></section></div>`;
      }catch(e){app.innerHTML=`<div class="radz-card radz-error"><b>Analytics ainda não disponível.</b><br>${esc(e.message)}</div>`;}
    }
    $('#radz-analytics-load').onclick=load;load();
  }

  async function showMarketing(){
    activate('marketing');header('Marketing e Analytics','Configure Pixel, GA4, Google Ads e GTM sem alterar o código da loja.');
    content(panelCss()+`<div id="radz-marketing-app"><div class="radz-card">Carregando…</div></div>`);
    const app=$('#radz-marketing-app');
    try{
      const d=await fetchJson('/admin/api/marketing'),c=d.config||{};
      app.innerHTML=`<div class="radz-grid"><section class="radz-card"><h2>Meta Pixel</h2><p class="radz-muted">Rastreie visitas, produtos, carrinho, checkout e compras.</p><label class="radz-row"><input type="checkbox" id="mk-meta-enabled"> Ativar Meta Pixel</label><label class="radz-field">Pixel ID<input id="mk-meta-pixel" value="${esc(c.meta?.pixelId||'')}" placeholder="Ex.: 123456789012345"></label><label class="radz-row"><input type="checkbox" id="mk-meta-capi" ${c.meta?.capiEnabled?'checked':''}> Preparar Meta Conversions API (CAPI)</label><p class="radz-muted" style="font-size:12px">A CAPI é server-side e não expõe token no navegador.</p></section><section class="radz-card"><h2>Google Analytics 4</h2><p class="radz-muted">Métricas e eventos de e-commerce.</p><label class="radz-row"><input type="checkbox" id="mk-ga-enabled"> Ativar GA4</label><label class="radz-field">Measurement ID<input id="mk-ga-id" value="${esc(c.google?.ga4Id||'')}" placeholder="G-XXXXXXXXXX"></label></section><section class="radz-card"><h2>Google Ads</h2><p class="radz-muted">Envie conversões de compra com valor e moeda.</p><label class="radz-row"><input type="checkbox" id="mk-ads-enabled"> Ativar Google Ads</label><label class="radz-field">Conversion ID<input id="mk-ads-id" value="${esc(c.google?.adsId||'')}" placeholder="AW-123456789"></label><label class="radz-field">Conversion Label<input id="mk-ads-label" value="${esc(c.google?.adsConversionLabel||'')}"></label></section><section class="radz-card"><h2>Google Tag Manager</h2><p class="radz-muted">Use um container GTM para tags adicionais.</p><label class="radz-row"><input type="checkbox" id="mk-gtm-enabled"> Ativar GTM</label><label class="radz-field">Container ID<input id="mk-gtm-id" value="${esc(c.google?.gtmId||'')}" placeholder="GTM-XXXXXXX"></label></section><section class="radz-card full"><h2>Eventos do RADZ</h2><p class="radz-muted">A loja emite um único evento interno e as integrações ativas recebem o mesmo evento.</p><div class="radz-row"><label><input type="checkbox" id="mk-ev-page"> PageView</label><label><input type="checkbox" id="mk-ev-view"> ViewContent</label><label><input type="checkbox" id="mk-ev-cart"> AddToCart</label><label><input type="checkbox" id="mk-ev-checkout"> InitiateCheckout</label><label><input type="checkbox" id="mk-ev-purchase"> Purchase</label></div><label class="radz-row"><input type="checkbox" id="mk-consent"> Exigir consentimento antes de carregar tags de marketing</label></section></div><button class="radz-save" id="mk-save">Salvar configurações</button><div id="mk-msg" class="radz-message"></div>`;
      $('#mk-meta-enabled').checked=!!c.meta?.enabled;$('#mk-ga-enabled').checked=!!c.google?.ga4Id&&!!c.google?.enabled;$('#mk-ads-enabled').checked=!!c.google?.adsId&&!!c.google?.enabled;$('#mk-gtm-enabled').checked=!!c.google?.gtmId&&!!c.google?.enabled;$('#mk-ev-page').checked=c.events?.pageView!==false;$('#mk-ev-view').checked=c.events?.viewContent!==false;$('#mk-ev-cart').checked=c.events?.addToCart!==false;$('#mk-ev-checkout').checked=c.events?.beginCheckout!==false;$('#mk-ev-purchase').checked=c.events?.purchase!==false;$('#mk-consent').checked=c.consentRequired!==false;
      const syncCapi=()=>{const on=$('#mk-meta-enabled').checked;$('#mk-meta-capi').disabled=!on;if(!on)$('#mk-meta-capi').checked=false;};$('#mk-meta-enabled').onchange=syncCapi;syncCapi();
      $('#mk-save').onclick=async()=>{const msg=$('#mk-msg');msg.textContent='Salvando…';msg.className='radz-message';const anyGoogle=$('#mk-ga-enabled').checked||$('#mk-ads-enabled').checked||$('#mk-gtm-enabled').checked;const config={meta:{enabled:$('#mk-meta-enabled').checked,pixelId:$('#mk-meta-pixel').value.trim(),capiEnabled:$('#mk-meta-enabled').checked&&$('#mk-meta-capi').checked},google:{enabled:anyGoogle,ga4Id:$('#mk-ga-id').value.trim(),adsId:$('#mk-ads-id').value.trim(),adsConversionLabel:$('#mk-ads-label').value.trim(),gtmId:$('#mk-gtm-id').value.trim()},events:{pageView:$('#mk-ev-page').checked,viewContent:$('#mk-ev-view').checked,addToCart:$('#mk-ev-cart').checked,beginCheckout:$('#mk-ev-checkout').checked,purchase:$('#mk-ev-purchase').checked},consentRequired:$('#mk-consent').checked};try{await fetchJson('/admin/api/marketing',{method:'PUT',body:JSON.stringify({config})});msg.textContent='Configurações salvas.';msg.className='radz-message radz-ok';}catch(e){msg.textContent=e.message;msg.className='radz-message radz-error';}};
    }catch(e){app.innerHTML=`<div class="radz-card radz-error">${esc(e.message)}</div>`;}
  }

  async function showMeta(){
    activate('meta');header('Meta Ads (Beta)','Gerenciamento avançado de anúncios — exclusivo do plano Business.');
    content(panelCss()+`<div id="radz-meta-app"><div class="radz-card">Carregando…</div></div>`);const app=$('#radz-meta-app');
    try{
      identity=identity||await fetchJson('/admin/api/identity');
      if(!identity?.features?.metaAds){app.innerHTML=`<div class="radz-upgrade"><span class="radz-beta">BUSINESS</span><h2>Meta Ads (Beta)</h2><p>Esta integração avançada está disponível somente no plano Business.</p><p class="radz-muted">Meta Pixel, GA4, Google Ads, GTM e Visitas e conversão continuam disponíveis normalmente no seu plano atual.</p><button class="radz-save" onclick="location.hash='billing'">Ver plano e cobrança</button></div>`;return;}
      const d=await fetchJson('/admin/api/meta');
      app.innerHTML=`<section class="radz-card"><h2>Status da conexão</h2><span class="radz-status ${d.connected?'ok':''}">${d.connected?'Conectado':'Não conectado'}</span><p>${d.connected?'Conta Meta: '+esc(d.integration?.metaUserName||d.integration?.metaUserId||'conectada'):'Esta empresa ainda não conectou uma conta Meta própria.'}</p><p><a class="radz-save" style="display:inline-block;text-decoration:none" href="${esc(d.connectUrl)}">${d.connected?'Reconectar / trocar conta Meta':'Conectar conta Meta desta empresa'}</a></p></section><section class="radz-card" style="margin-top:14px"><h2>Contas de anúncios</h2><div id="radz-meta-accounts">${d.connected?((d.adAccounts||[]).length?(d.adAccounts||[]).map(a=>`<div class="radz-account"><div><strong>${esc(a.name||('Conta '+a.id))}</strong><small>${esc(a.graphId)} · ${esc(a.currency||'moeda não informada')} · ${esc(a.timezone||'fuso não informado')}</small></div><button class="radz-save" data-meta-account="${esc(a.id)}" ${a.selected?'disabled':''}>${a.selected?'Selecionada':'Usar esta conta'}</button></div>`).join(''):'<div class="radz-muted">Nenhuma conta de anúncios encontrada.</div>'):'<div class="radz-muted">Conecte primeiro a conta Meta desta empresa.</div>'}</div><div id="radz-meta-msg" class="radz-message"></div></section>`;
      $$('[data-meta-account]',app).forEach(b=>b.onclick=async()=>{const msg=$('#radz-meta-msg');msg.textContent='Salvando…';try{await fetchJson('/admin/api/meta',{method:'PATCH',body:JSON.stringify({accountId:b.dataset.metaAccount})});msg.textContent='Conta selecionada.';msg.className='radz-message radz-ok';setTimeout(showMeta,300);}catch(e){msg.textContent=e.message;msg.className='radz-message radz-error';}});
    }catch(e){if(e.status===403){app.innerHTML=`<div class="radz-upgrade"><span class="radz-beta">BUSINESS</span><h2>Meta Ads (Beta)</h2><p>${esc(e.message)}</p></div>`;}else app.innerHTML=`<div class="radz-card radz-error">${esc(e.message)}</div>`;}
  }

  function bind(){
    $$('#admin-nav [data-radz-panel]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const p=a.dataset.radzPanel;if(p==='analytics')showAnalytics();if(p==='marketing')showMarketing();if(p==='meta')showMeta();}));
  }
  bind();
})();
