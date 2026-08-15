const ADMIN={csrf:sessionStorage.getItem('salvatexAdminCsrf')||'',view:'dashboard',cache:{},currency:new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const brlCents=v=>ADMIN.currency.format(Number(v||0)/100); const dateTime=v=>v?new Date(v).toLocaleString('pt-BR'):'—'; const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(msg){const t=$('#admin-toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
async function api(path,options={}){const method=(options.method||'GET').toUpperCase();const headers={...(options.headers||{})};if(!(options.body instanceof FormData))headers['content-type']='application/json';if(!['GET','HEAD','OPTIONS'].includes(method)&&ADMIN.csrf)headers['x-csrf-token']=ADMIN.csrf;const r=await fetch('/admin/api/'+path,{...options,credentials:'same-origin',headers});let d={};try{d=await r.json()}catch{}if(r.status===401){sessionStorage.removeItem('salvatexAdminCsrf');ADMIN.csrf='';throw new Error('Sessão inválida ou expirada')}if(!r.ok)throw new Error(d.message||'Erro ao acessar o servidor');return d}
async function login(token){try{const r=await fetch('/admin/api/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({token})});const d=await r.json();if(!r.ok)throw new Error(d.message||'Credencial inválida');ADMIN.csrf=d.csrfToken;sessionStorage.setItem('salvatexAdminCsrf',ADMIN.csrf);$('#admin-token-input').value='';$('#admin-login').style.display='none';$('#admin-app').hidden=false;await navigate(location.hash.slice(1)||'dashboard')}catch(e){ADMIN.csrf='';sessionStorage.removeItem('salvatexAdminCsrf');$('#login-error').textContent=e.message}}
async function logout(){try{if(ADMIN.csrf)await api('logout',{method:'POST',body:'{}'})}catch{}sessionStorage.removeItem('salvatexAdminCsrf');ADMIN.csrf='';location.reload()}
$('#login-form').addEventListener('submit',e=>{e.preventDefault();login($('#admin-token-input').value.trim())});$('#logout').addEventListener('click',logout);
$$('#admin-nav [data-view]').forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.view}));$('#customers-nav-toggle')?.addEventListener('click',()=>$('.admin-nav-group-customers')?.classList.toggle('open'));window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)||'dashboard'));$('#refresh-view').addEventListener('click',()=>navigate(ADMIN.view,true));$('#menu-toggle').addEventListener('click',()=>$('.sidebar').classList.toggle('open'));
const titles={dashboard:['Dashboard','Visão geral da sua loja'],orders:['Pedidos','Gerencie pedidos e andamento'],products:['Produtos','Catálogo e produtos da loja'],categories:['Categorias','Organize o catálogo'],customers:['Clientes','Contas cadastradas e compradores'],messages:['Mensagens','Atendimento recebido pelo site'],pages:['Páginas','Conteúdo institucional da loja'],layout:['Layout do site','Cabeçalho, página inicial, cores e rodapé'],media:['Mídia','Imagens usadas no catálogo'],coupons:['Cupons','Descontos e campanhas'],reports:['Relatórios','Desempenho da operação'],configurators:['Configuradores','Produtos sob medida, regras de cálculo e mídia'],settings:['Configurações','Dados gerais da loja'],integrations:['Integrações','Serviços conectados à loja'],billing:['Plano e cobrança','1% do faturamento ou mínimo de R$ 150'],logs:['Logs do Sistema','Histórico administrativo']};
async function navigate(view,force=false){ADMIN.view=titles[view]?view:'dashboard';$$('#admin-nav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===ADMIN.view));const customerGroup=$('.admin-nav-group-customers');if(customerGroup){customerGroup.classList.toggle('active-group',['customers','messages'].includes(ADMIN.view));if(['customers','messages'].includes(ADMIN.view))customerGroup.classList.add('open')}$('#view-title').textContent=titles[ADMIN.view][0];$('#view-subtitle').textContent=titles[ADMIN.view][1];$('.sidebar').classList.remove('open');const c=$('#view-content');c.innerHTML='<div class="empty">Carregando…</div>';try{await ({dashboard:renderDashboard,orders:renderOrders,products:renderProducts,categories:renderCategories,customers:renderCustomers,messages:renderMessages,pages:renderPages,layout:renderLayout,media:renderMedia,coupons:renderCoupons,reports:renderReports,configurators:renderConfigurators,settings:renderSettings,integrations:renderIntegrations,billing:renderBilling,logs:renderLogs}[ADMIN.view])()}catch(e){c.innerHTML='<div class="panel empty">'+esc(e.message)+'</div>'}}
function statCard(label,value,icon,cls,foot='Dados registrados no sistema'){return `<div class="stat-card"><div class="stat-head"><div><small>${label}</small><div class="stat-value">${value}</div></div><div class="stat-icon ${cls}">${icon}</div></div><div class="stat-foot">${foot}</div></div>`}
function statusLabel(s){const names={aguardando_pagamento:'Aguardando pagamento',pago:'Pago',em_producao:'Produção',pronto:'Pronto',enviado:'Enviado',entregue:'Entregue',cancelado:'Cancelado',reembolsado:'Reembolsado'};return names[s]||s||'—'}
async function renderDashboard(){const d=await api('dashboard');ADMIN.cache.dashboard=d;$('#nav-order-count').textContent=d.stats.totalOrders;const c=$('#view-content');c.innerHTML=`<div class="stats-grid">${statCard('Vendas hoje',brlCents(d.stats.salesToday),'＄','green')}${statCard('Pedidos hoje',d.stats.ordersToday,'▢','blue')}${statCard('Ticket médio',brlCents(d.stats.averageTicket),'▤','yellow')}${statCard('Faturamento mês',brlCents(d.stats.monthRevenue),'⌁','purple')}</div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><h2>Faturamento</h2><span class="select">Últimos 30 dias</span></div><div id="revenue-chart" class="chart"></div></section><section class="panel"><div class="panel-head"><h2>Pedidos por status</h2></div><div id="status-donut" class="donut-wrap"></div></section></div><div class="tables-grid"><section class="panel"><div class="panel-head"><h2>Pedidos recentes</h2><button class="ghost-btn" data-go="orders">Ver todos</button></div><div class="table-wrap">${ordersTable(d.recent,true)}</div></section><section class="panel"><div class="panel-head"><h2>Produtos mais vendidos</h2></div><div class="table-wrap">${topProductsTable(d.topProducts)}</div></section></div><div class="quick-actions"><button class="quick-card" data-go="products"><span class="quick-icon">◇</span><div><strong>Novo produto</strong><small>Cadastrar novo produto</small></div></button><button class="quick-card" data-go="categories"><span class="quick-icon">□</span><div><strong>Nova categoria</strong><small>Criar nova categoria</small></div></button><button class="quick-card" data-go="coupons"><span class="quick-icon">✂</span><div><strong>Novo cupom</strong><small>Criar cupom de desconto</small></div></button><button class="quick-card" data-go="pages"><span class="quick-icon">▤</span><div><strong>Nova página</strong><small>Criar nova página</small></div></button><button class="quick-card" data-go="orders"><span class="quick-icon">▣</span><div><strong>Ver pedidos</strong><small>Gerenciar pedidos</small></div></button></div>`; drawRevenue(d.revenue);drawStatuses(d.statuses,d.stats.totalOrders);$$('[data-go]',c).forEach(b=>b.onclick=()=>location.hash=b.dataset.go);bindOrderRows(c)}
function drawRevenue(rows){const el=$('#revenue-chart');const map=new Map(rows.map(r=>[r.dia,Number(r.total||0)]));const days=[];for(let i=29;i>=0;i--){const x=new Date(Date.now()-i*86400000);const k=x.toISOString().slice(0,10);days.push({date:k,total:map.get(k)||0})}const max=Math.max(1,...days.map(d=>d.total));const pts=days.map((d,i)=>`${(i/(days.length-1))*100},${92-(d.total/max)*80}`).join(' ');el.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="none"><g class="chart-grid"><line x1="0" y1="20" x2="100" y2="20"/><line x1="0" y1="45" x2="100" y2="45"/><line x1="0" y1="70" x2="100" y2="70"/><line x1="0" y1="92" x2="100" y2="92"/></g><defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c49a58" stop-opacity=".22"/><stop offset="1" stop-color="#c49a58" stop-opacity="0"/></linearGradient></defs><polygon points="0,92 ${pts} 100,92" fill="url(#rev)"/><polyline points="${pts}" fill="none" stroke="#c49343" stroke-width=".7" vector-effect="non-scaling-stroke"/></svg><div class="chart-labels"><span>${days[0].date.slice(8)}/${days[0].date.slice(5,7)}</span><span>${days[7].date.slice(8)}/${days[7].date.slice(5,7)}</span><span>${days[14].date.slice(8)}/${days[14].date.slice(5,7)}</span><span>${days[21].date.slice(8)}/${days[21].date.slice(5,7)}</span><span>Hoje</span></div>`}
function drawStatuses(rows,total){const colors=['#f7c64c','#69c779','#5ca3f7','#9a68e8','#e45f50','#8c98aa'];const denom=Math.max(1,rows.reduce((s,r)=>s+Number(r.quantidade||0),0));let a=0,stops=[];rows.forEach((r,i)=>{const p=Number(r.quantidade||0)/denom*100;stops.push(`${colors[i%colors.length]} ${a}% ${a+p}%`);a+=p});const el=$('#status-donut');el.innerHTML=`<div class="donut" style="background:conic-gradient(${stops.length?stops.join(','):'#eef0f4 0 100%'})"><div class="donut-center"><strong>${denom===1&&rows.length===0?0:denom}</strong><span>Total</span></div></div><div class="legend">${rows.map((r,i)=>`<div class="legend-row"><i class="legend-dot" style="background:${colors[i%colors.length]}"></i><span>${statusLabel(r.status)}</span><b>${r.quantidade} (${Math.round(Number(r.quantidade)/denom*100)}%)</b></div>`).join('')||'<span class="empty">Sem pedidos</span>'}</div>`}
function ordersTable(rows,compact=false){return `<table class="admin-table orders-list"><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>${rows.map(o=>`<tr data-order-id="${esc(o.id)}" class="order-row"><td><b>${esc(o.order_number)}</b>${o.customer_phone?`<small class="order-cell-sub">${esc(o.customer_phone)}</small>`:''}</td><td>${esc(o.customer_name||o.customer_email||'—')}<small class="order-cell-sub">${esc(o.customer_email||'')}</small></td><td>${dateTime(o.created_at)}</td><td><span class="status ${esc(o.status)}">${statusLabel(o.status)}</span></td><td><b>${brlCents(o.total_cents)}</b></td><td><button class="ghost-btn open-order" aria-label="Abrir pedido">Ver pedido</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhum pedido.</td></tr>'}</tbody></table>`}
function topProductsTable(rows){return `<table class="admin-table"><thead><tr><th>Produto</th><th>Vendas</th></tr></thead><tbody>${rows.map(p=>`<tr><td><div style="display:flex;align-items:center;gap:9px">${p.image?`<img class="mini-thumb" src="${esc(p.image)}">`:'<span class="mini-thumb"></span>'}<span>${esc(p.name)}</span></div></td><td>${p.vendas}</td></tr>`).join('')||'<tr><td colspan="2" class="empty">Sem vendas ainda.</td></tr>'}</tbody></table>`}
async function renderOrders(){const d=await api('orders');const c=$('#view-content');c.innerHTML=`<div class="page-toolbar"><div class="filters"><input id="order-search" class="search" placeholder="Buscar pedido, cliente, e-mail ou telefone"><select id="order-status" class="select"><option value="">Todos os status</option>${['aguardando_pagamento','pago','em_producao','pronto','enviado','entregue','cancelado','reembolsado'].map(s=>`<option value="${s}">${statusLabel(s)}</option>`).join('')}</select><button id="order-filter" class="ghost-btn">Filtrar</button></div><div class="orders-help">Clique em um pedido para abrir todos os detalhes.</div></div><section class="panel"><div class="table-wrap" id="orders-table">${ordersTable(d.orders)}</div></section>`;bindOrderRows(c);const filtrar=async()=>{const q=encodeURIComponent($('#order-search').value),s=encodeURIComponent($('#order-status').value);$('#orders-table').innerHTML='<div class="empty">Carregando…</div>';const x=await api(`orders?q=${q}&status=${s}`);$('#orders-table').innerHTML=ordersTable(x.orders);bindOrderRows($('#orders-table'))};$('#order-filter').onclick=filtrar;$('#order-search').addEventListener('keydown',e=>{if(e.key==='Enter')filtrar()});$('#order-status').addEventListener('change',filtrar)}
function bindOrderRows(root=document){$$('.open-order',root).forEach(b=>b.onclick=e=>{e.stopPropagation();openOrder(b.closest('tr').dataset.orderId)});$$('.order-row',root).forEach(tr=>tr.onclick=()=>openOrder(tr.dataset.orderId))}
function orderValue(v){return v===null||v===undefined||v===''?'—':String(v)}
function addressText(o){const d=o.delivery||{};const c=o.customer||{};const endereco=d.endereco||d.rua||c.endereco||'';const numero=d.numero||c.numero||'';const complemento=d.complemento||c.complemento||'';const bairro=d.bairro||c.bairro||'';const cidade=d.cidade||c.cidade||'';const estado=d.estado||c.estado||'';const cep=d.cep||c.cep||'';return [[endereco,numero].filter(Boolean).join(', '),complemento,bairro,[cidade,estado].filter(Boolean).join(' - '),cep?`CEP ${cep}`:''].filter(Boolean).join(' · ')||'—'}
function detailLine(label,value){return `<div class="order-detail-line"><span>${esc(label)}</span><b>${esc(orderValue(value))}</b></div>`}
function itemDetailText(i){const source={...(i.snapshot||{}),...(i.data||{}),...(i.details||{})};const rows=[];const keys=[['modelo','Modelo'],['tecido','Tecido'],['cor','Cor'],['forro','Forro'],['larguraAmbiente','Largura do ambiente'],['largura','Largura'],['altura','Altura'],['franzimento','Franzimento'],['consumoTecido','Consumo de tecido'],['barra','Barra']];for(const [k,label] of keys){let v=source[k]??i[k];if(v!==undefined&&v!==null&&v!==''){if(['larguraAmbiente','largura','altura','consumoTecido'].includes(k)&&!String(v).includes('m'))v=String(v).replace('.',',')+' m';if(k==='franzimento'&&!String(v).includes('x'))v=String(v).replace('.',',')+'x';if(k==='barra'&&!String(v).includes('cm'))v=String(v)+' cm';rows.push(detailLine(label,v))}}return rows.join('')}
function eventLabel(e){const map={order_created:'Pedido criado',admin_status_changed:'Status alterado pelo administrador',admin_order_updated:'Pedido atualizado pelo administrador',admin_internal_note_updated:'Observação interna atualizada',payment_updated:'Pagamento atualizado',payment_approved:'Pagamento aprovado',shipping_updated:'Envio atualizado',invoice_attached:'Nota fiscal anexada'};return map[e.event_type]||String(e.event_type||'Evento').replaceAll('_',' ')}
async function openOrder(id){const d=await api('orders/'+encodeURIComponent(id));const o=d.order;const freight=o.freight||{},payment=o.payment||{},customer=o.customer||{};const statusOptions=['aguardando_pagamento','pago','em_producao','pronto','enviado','entregue','cancelado','reembolsado'];openModal(`<div class="order-modal-head"><div><span class="order-number-label">PEDIDO</span><h2>${esc(o.order_number)}</h2><div class="order-created">Criado em ${dateTime(o.created_at)} · Atualizado em ${dateTime(o.updated_at)}</div></div><span class="status ${esc(o.status)} order-status-main">${statusLabel(o.status)}</span></div>
<div class="order-detail-grid">
<section class="order-card"><h3>Cliente</h3>${detailLine('Nome',o.customer_name||customer.nome)}${detailLine('CPF',o.customer_cpf||customer.cpf)}${detailLine('WhatsApp',o.customer_phone||customer.telefone)}${detailLine('E-mail',o.customer_email||customer.email)}</section>
<section class="order-card"><h3>Entrega</h3><p class="order-address">${esc(addressText(o))}</p>${customer.observacoes?`<div class="order-observation"><span>Observações</span>${esc(customer.observacoes)}</div>`:''}</section>
<section class="order-card"><h3>Pagamento</h3>${detailLine('Forma',payment.forma||payment.method||'Não definida')}${detailLine('Status',payment.status||'Aguardando')}${payment.externalId?detailLine('ID externo',payment.externalId):''}</section>
<section class="order-card"><h3>Frete</h3>${detailLine('Condição',freight.gratis?'Grátis':(freight.texto||freight.status||'A calcular'))}${detailLine('Transportadora',freight.carrier||'—')}${detailLine('Rastreio',freight.trackingCode||'—')}</section>
</div>
<section class="order-notes-card"><div class="order-notes-head"><div><span class="order-notes-kicker">USO INTERNO</span><h3>Observações internas</h3><p>Estas informações aparecem somente no painel administrativo e nunca são exibidas ao cliente.</p></div><span id="detail-notes-count" class="order-notes-count">${String(o.internal_notes||'').length}/5000</span></div><textarea id="detail-notes" maxlength="5000" placeholder="Ex.: Cliente pediu instalação após dia 20. Confirmar cor antes de iniciar a produção.">${esc(o.internal_notes||'')}</textarea><div class="order-notes-actions"><small>Salve informações importantes para produção, entrega ou atendimento.</small><button type="button" class="primary-btn" id="save-note">Salvar observação</button></div></section>
<section class="order-section"><div class="order-section-head"><h3>Itens do pedido</h3><strong>${brlCents(o.total_cents)}</strong></div><div class="order-items">${d.items.map(i=>`<article class="order-product"><div class="order-product-main">${i.image?`<img src="${esc(i.image)}" alt="">`:'<div class="order-product-placeholder">▧</div>'}<div><strong>${esc(i.name)}</strong><span>${esc(i.category_name||i.category||'')}</span><div class="order-item-details">${itemDetailText(i)}</div></div></div><div class="order-product-price"><span>${Number(i.quantity||1)}x ${brlCents(i.unit_price_cents)}</span><strong>${brlCents(i.total_cents)}</strong></div></article>`).join('')}</div><div class="order-totals">${detailLine('Subtotal',brlCents(o.subtotal_cents))}${o.freight_cents!==null?detailLine('Frete',brlCents(o.freight_cents)):detailLine('Frete',freight.gratis?'Grátis':'A calcular')}${Number(o.discount_cents||0)>0?detailLine('Desconto','- '+brlCents(o.discount_cents)):''}<div class="order-total-final"><span>Total</span><strong>${brlCents(o.total_cents)}</strong></div></div></section>
<section class="order-section"><div class="order-section-head"><h3>Nota fiscal e impressão</h3></div><div class="order-admin-tools"><label class="upload-btn">Anexar nota fiscal<input type="file" id="invoice-file" accept="application/pdf,application/xml,text/xml,image/jpeg,image/png,image/webp"></label><button type="button" class="ghost-btn" id="print-order-a4">Imprimir pedido A4</button><button type="button" class="ghost-btn" id="print-label">Imprimir etiqueta 108×150</button><button type="button" class="ghost-btn" id="download-zpl">Baixar ZPL Zebra</button></div><div id="invoice-list" class="invoice-list">${invoiceEvents(d).map(n=>`<button type="button" class="invoice-link" data-invoice-key="${esc(n.key)}" data-invoice-name="${esc(n.name||'nota-fiscal')}">▧ ${esc(n.name||'Nota fiscal')}</button>`).join('')||'<span class="field-hint">Nenhuma nota fiscal anexada.</span>'}</div><small id="invoice-status" class="upload-status"></small></section>
<section class="order-section"><h3>Andamento do pedido</h3><div class="order-status-flow">${statusOptions.slice(0,6).map(s=>`<button type="button" class="order-flow-step ${o.status===s?'current':''}" data-set-status="${s}"><span></span>${statusLabel(s)}</button>`).join('')}</div><div class="form-grid order-edit-grid"><div class="form-field"><label>Status</label><select id="detail-status">${statusOptions.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select></div><div class="form-field"><label>Transportadora</label><input id="detail-carrier" value="${esc(freight.carrier||'')}" placeholder="Ex.: Correios, Jadlog"></div><div class="form-field"><label>Código de rastreio</label><input id="detail-tracking" value="${esc(freight.trackingCode||'')}" placeholder="Código de rastreio"></div><div class="form-field"><label>Link de rastreio</label><input id="detail-tracking-url" value="${esc(freight.trackingUrl||'')}" placeholder="https://..."></div></div><div class="form-actions order-actions"><button type="button" class="ghost-btn" id="copy-order">Copiar resumo</button><button type="button" class="primary-btn" id="save-order">Salvar alterações</button></div></section>
<section class="order-section"><h3>Histórico</h3><div class="order-timeline">${d.events.map(e=>`<div class="timeline-item"><i></i><div><strong>${esc(eventLabel(e))}</strong><span>${dateTime(e.created_at)}</span>${e.from_status&&e.to_status&&e.from_status!==e.to_status?`<small>${statusLabel(e.from_status)} → ${statusLabel(e.to_status)}</small>`:''}</div></div>`).join('')||'<div class="empty">Sem eventos registrados.</div>'}</div></section>`);
const notes=$('#detail-notes');const notesCount=$('#detail-notes-count');const updateNotesCount=()=>{if(notesCount&&notes)notesCount.textContent=notes.value.length+'/5000'};if(notes){notes.addEventListener('input',updateNotesCount);updateNotesCount()}const saveNote=async()=>{const button=$('#save-note');if(button){button.disabled=true;button.textContent='Salvando…'}try{await api('orders/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({internalNotes:notes?notes.value:''})});toast('Observação interna salva');await openOrder(id)}catch(e){alert(e.message)}finally{if(button){button.disabled=false;button.textContent='Salvar observação'}}};if($('#save-note'))$('#save-note').onclick=saveNote;const save=async(statusOverride=null)=>{const status=statusOverride||$('#detail-status').value;await api('orders/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status,internalNotes:notes?notes.value:'',freight:{carrier:$('#detail-carrier').value,trackingCode:$('#detail-tracking').value,trackingUrl:$('#detail-tracking-url').value,status:status==='enviado'?'enviado':freight.status}})});toast('Pedido atualizado');closeModal();navigate(ADMIN.view,true)};$('#save-order').onclick=()=>save();$$('[data-set-status]',$('#admin-modal')).forEach(b=>b.onclick=async()=>{if(confirm('Alterar o pedido para "'+statusLabel(b.dataset.setStatus)+'"?'))await save(b.dataset.setStatus)});const invoiceFile=$('#invoice-file');if(invoiceFile)invoiceFile.onchange=async()=>{const file=invoiceFile.files?.[0];if(!file)return;const st=$('#invoice-status');try{st.textContent='Enviando nota fiscal...';const fd=new FormData();fd.append('file',file);const rr=await fetch('/admin/api/orders/'+encodeURIComponent(id)+'/invoice',{method:'POST',credentials:'same-origin',headers:{'x-csrf-token':ADMIN.csrf},body:fd});const dd=await rr.json();if(!rr.ok)throw new Error(dd.message||'Falha no upload');toast('Nota fiscal anexada');await openOrder(id)}catch(e){st.textContent=e.message;alert(e.message)}};$$('[data-invoice-key]',$('#admin-modal')).forEach(b=>b.onclick=()=>adminDownloadDocument(id,b.dataset.invoiceKey,b.dataset.invoiceName).catch(e=>alert(e.message)));if($('#print-order-a4'))$('#print-order-a4').onclick=()=>printHtml(orderPrintHtml(d,false));if($('#print-label'))$('#print-label').onclick=()=>printHtml(orderPrintHtml(d,true));if($('#download-zpl'))$('#download-zpl').onclick=()=>downloadText('etiqueta-'+o.order_number+'.zpl',zplForOrder(d),'text/plain');$('#copy-order').onclick=async()=>{const text=`Pedido ${o.order_number}\nCliente: ${o.customer_name||'—'}\nTelefone: ${o.customer_phone||'—'}\nTotal: ${brlCents(o.total_cents)}\nStatus: ${statusLabel(o.status)}\nEntrega: ${addressText(o)}`;try{await navigator.clipboard.writeText(text);toast('Resumo copiado')}catch{prompt('Copie o resumo:',text)}}}

function invoiceEvents(d){return (d.events||[]).filter(e=>e.event_type==='invoice_attached').map(e=>{let p=e.payload||{};return{...p,createdAt:e.created_at}})}
async function adminDownloadDocument(orderId,key,name){const r=await fetch('/admin/api/order-document?orderId='+encodeURIComponent(orderId)+'&key='+encodeURIComponent(key),{credentials:'same-origin'});if(!r.ok){let d={};try{d=await r.json()}catch{};throw new Error(d.message||'Erro ao baixar arquivo')}const blob=await r.blob(),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name||'nota-fiscal';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function orderPrintHtml(d,label=false){const o=d.order,customer=o.customer||{},delivery=o.delivery||{};const address=[delivery.endereco,delivery.numero,delivery.complemento,delivery.bairro,delivery.cidade,delivery.estado,delivery.cep].filter(Boolean).join(', ');if(label)return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:108mm 150mm;margin:6mm}body{font-family:Arial,sans-serif;font-size:13px}h1{font-size:18px;border-bottom:2px solid #000;padding-bottom:5px}.big{font-size:18px;font-weight:bold}.box{border:2px solid #000;padding:10px;margin:10px 0}.from{font-size:11px;margin-top:20px}</style></head><body><h1>SALVATEX — ENVIO</h1><div>Pedido <b>${esc(o.order_number)}</b></div><div class="box"><div class="big">${esc(o.customer_name||customer.nome||'')}</div><div>${esc(address)}</div><div>Telefone: ${esc(o.customer_phone||customer.telefone||'')}</div></div><div class="from">REMETENTE: Salvatex Cortinas</div></body></html>`;return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:28px;color:#111}h1{font-size:24px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:7px 0}.item{padding:10px 0;border-bottom:1px solid #ddd}</style></head><body><h1>Pedido ${esc(o.order_number)}</h1><p>${new Date(o.created_at).toLocaleString('pt-BR')}</p><h2>Cliente</h2><p>${esc(o.customer_name||customer.nome||'')}<br>${esc(o.customer_email||customer.email||'')}<br>${esc(o.customer_phone||customer.telefone||'')}<br>${esc(address)}</p><h2>Itens</h2>${d.items.map(i=>`<div class="item"><b>${esc(i.name)}</b> — ${i.quantity}x — ${brlCents(i.total_cents)}</div>`).join('')}<div class="row"><b>Total</b><b>${brlCents(o.total_cents)}</b></div></body></html>`}
function printHtml(html){const w=window.open('','_blank','width=900,height=800');w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),250)}
function zplForOrder(d){const o=d.order,delivery=o.delivery||{},customer=o.customer||{};const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,' ').replace(/[\^~]/g,' ').slice(0,90);const addr=clean([delivery.endereco,delivery.numero,delivery.complemento].filter(Boolean).join(', '));const city=clean([delivery.bairro,delivery.cidade,delivery.estado].filter(Boolean).join(' - '));return `^XA\n^CI28\n^PW832\n^LL1200\n^LH20,20\n^FO20,20^A0N,42,42^FDSALVATEX - ENVIO^FS\n^FO20,80^A0N,28,28^FDPedido: ${clean(o.order_number)}^FS\n^FO20,135^GB790,2,2^FS\n^FO20,175^A0N,42,42^FD${clean(o.customer_name||customer.nome)}^FS\n^FO20,240^A0N,30,30^FD${addr}^FS\n^FO20,290^A0N,30,30^FD${city}^FS\n^FO20,340^A0N,30,30^FDCEP: ${clean(delivery.cep||customer.cep)}^FS\n^FO20,390^A0N,28,28^FDTel: ${clean(o.customer_phone||customer.telefone)}^FS\n^FO20,455^GB790,2,2^FS\n^FO20,500^A0N,26,26^FDREMETENTE: Salvatex Cortinas^FS\n^FO20,555^BY3^BCN,120,Y,N,N^FD${clean(o.order_number)}^FS\n^XZ`}
function downloadText(name,text,type='text/plain'){const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}

async function renderProducts(){const [d,cats]=await Promise.all([api('catalog/products'),api('catalog/categories')]);ADMIN.cache.categories=cats.categories;const c=$('#view-content');c.innerHTML=`<div class="page-toolbar"><div class="filters"><input id="product-search" class="search" placeholder="Buscar produto"></div><button id="new-product" class="primary-btn">+ Novo produto</button></div><section class="panel"><div class="table-wrap"><table class="admin-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Tipo</th><th>Preço base</th><th>Estoque</th><th>Status</th><th></th></tr></thead><tbody>${d.products.map(p=>`<tr data-product='${encodeURIComponent(JSON.stringify(p))}'><td><div style="display:flex;gap:9px;align-items:center">${p.image_url?`<img class="mini-thumb" src="${esc(p.image_url)}">`:'<span class="mini-thumb"></span>'}<b>${esc(p.name)}</b></div></td><td>${esc(p.category_name||'—')}</td><td>${esc(p.sale_type)}</td><td>${brlCents(p.base_price_cents)}</td><td>${p.track_stock?p.stock??0:'—'}</td><td>${p.active?'Ativo':'Inativo'}</td><td><button class="ghost-btn edit-product">Editar</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">Cadastre seu primeiro produto.</td></tr>'}</tbody></table></div></section>`;$('#new-product').onclick=()=>productForm(null,cats.categories);$$('.edit-product').forEach(b=>b.onclick=()=>productForm(JSON.parse(decodeURIComponent(b.closest('tr').dataset.product)),cats.categories));$('#product-search').oninput=e=>{$$('tbody tr',c).forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(e.target.value.toLowerCase())?'':'none')}}
function productForm(p,cats){p=p||{};openModal(`<h2>${p.id?'Editar produto':'Novo produto'}</h2><form id="product-form"><div class="form-grid"><div class="form-field full"><label>Nome</label><input name="name" value="${esc(p.name||'')}" required></div><div class="form-field"><label>Categoria</label><select name="categoryId"><option value="">Sem categoria</option>${cats.map(c=>`<option value="${c.id}" ${p.category_id===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="form-field"><label>SKU</label><input name="sku" value="${esc(p.sku||'')}"></div><div class="form-field"><label>Tipo de venda</label><select name="saleType"><option value="sob_medida" ${p.sale_type==='sob_medida'?'selected':''}>Sob medida</option><option value="pronta_entrega" ${p.sale_type==='pronta_entrega'?'selected':''}>Pronta entrega</option><option value="acessorio" ${p.sale_type==='acessorio'?'selected':''}>Acessório</option></select></div><div class="form-field"><label>Configurador</label><select name="configurator"><option value="">Nenhum</option><option value="wave" ${p.configurator==='wave'?'selected':''}>Cortina Wave</option><option value="ilhos" ${p.configurator==='ilhos'?'selected':''}>Cortina Ilhós</option><option value="prega_macho" ${p.configurator==='prega_macho'?'selected':''}>Prega Macho</option><option value="persiana" ${p.configurator==='persiana'?'selected':''}>Persiana</option></select></div><div class="form-field"><label>Preço base (R$)</label><input name="basePrice" type="number" step="0.01" value="${Number(p.base_price_cents||0)/100}"></div><div class="form-field"><label>Estoque</label><input name="stock" type="number" value="${p.stock??''}"></div><div class="form-field full"><label>Imagem principal</label><input name="imageUrl" id="product-image-url" type="hidden" value="${esc(p.image_url||'')}"><div class="media-upload-box product-media-upload"><div class="media-preview" id="product-image-preview">${p.image_url?`<img src="${esc(p.image_url)}">`:'<span>Sem imagem</span>'}</div><label class="upload-btn">Enviar imagem do computador<input type="file" id="product-image-file" accept="image/jpeg,image/png,image/webp,image/gif"></label><small id="product-image-status" class="upload-status"></small></div></div><div class="form-field full"><label>Descrição</label><textarea name="description">${esc(p.description||'')}</textarea></div><div class="form-field"><label><input name="active" type="checkbox" ${p.active!==0?'checked':''}> Produto ativo</label></div><div class="form-field"><label><input name="trackStock" type="checkbox" ${p.track_stock?'checked':''}> Controlar estoque</label></div></div><div class="form-actions">${p.id?'<button type="button" class="danger-btn" id="delete-product">Excluir</button>':''}<button type="button" class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn">Salvar produto</button></div></form>`);const f=$('#product-form');
const productImageFile=$('#product-image-file');
if(productImageFile){
  productImageFile.onchange=async()=>{
    const file=productImageFile.files?.[0];
    if(!file)return;
    const st=$('#product-image-status');
    try{
      st.textContent='Enviando imagem...';
      const d=await uploadAdminMedia(file,{
        configurator:'produtos',
        tecido:p.id||p.slug||'novo-produto',
        cor:'principal',
        forro:'geral'
      });
      $('#product-image-url').value=d.url;
      $('#product-image-preview').innerHTML=`<img src="${esc(d.url)}">`;
      st.textContent='Imagem enviada.';
    }catch(err){
      st.textContent=err.message;
      alert(err.message);
    }
  };
}
f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),body={name:fd.get('name'),categoryId:fd.get('categoryId'),sku:fd.get('sku'),saleType:fd.get('saleType'),productType:fd.get('saleType'),configurator:fd.get('configurator'),basePrice:fd.get('basePrice'),stock:fd.get('stock'),imageUrl:fd.get('imageUrl'),description:fd.get('description'),active:fd.get('active')==='on',trackStock:fd.get('trackStock')==='on'};await api(p.id?'catalog/products/'+p.id:'catalog/products',{method:p.id?'PUT':'POST',body:JSON.stringify(body)});toast('Produto salvo');closeModal();navigate('products',true)};if(p.id)$('#delete-product').onclick=async()=>{if(confirm('Excluir este produto?')){await api('catalog/products/'+p.id,{method:'DELETE'});closeModal();navigate('products',true)}}}
async function renderCategories(){const d=await api('catalog/categories');const c=$('#view-content');c.innerHTML=`<div class="page-toolbar"><div></div><button id="new-cat" class="primary-btn">+ Nova categoria</button></div><section class="panel"><table class="admin-table"><thead><tr><th>Categoria</th><th>Slug</th><th>Produtos</th><th>Status</th><th></th></tr></thead><tbody>${d.categories.map(x=>`<tr data-cat='${encodeURIComponent(JSON.stringify(x))}'><td><b>${esc(x.name)}</b><br><small>${esc(x.description||'')}</small></td><td>${esc(x.slug)}</td><td>${x.product_count}</td><td>${x.active?'Ativa':'Inativa'}</td><td><button class="ghost-btn edit-cat">Editar</button></td></tr>`).join('')}</tbody></table></section>`;$('#new-cat').onclick=()=>categoryForm();$$('.edit-cat').forEach(b=>b.onclick=()=>categoryForm(JSON.parse(decodeURIComponent(b.closest('tr').dataset.cat))))}
function categoryForm(x={}){openModal(`<h2>${x.id?'Editar categoria':'Nova categoria'}</h2><form id="cat-form"><div class="form-grid"><div class="form-field full"><label>Nome</label><input name="name" value="${esc(x.name||'')}" required></div><div class="form-field full"><label>Descrição</label><textarea name="description">${esc(x.description||'')}</textarea></div><div class="form-field"><label>Ordem</label><input name="sortOrder" type="number" value="${x.sort_order||0}"></div><div class="form-field"><label><input name="active" type="checkbox" ${x.active!==0?'checked':''}> Ativa</label></div></div><div class="form-actions">${x.id?'<button id="delete-cat" type="button" class="danger-btn">Excluir</button>':''}<button class="primary-btn">Salvar</button></div></form>`);const f=$('#cat-form');f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),body={name:fd.get('name'),description:fd.get('description'),sortOrder:fd.get('sortOrder'),active:fd.get('active')==='on'};await api(x.id?'catalog/categories/'+x.id:'catalog/categories',{method:x.id?'PUT':'POST',body:JSON.stringify(body)});closeModal();navigate('categories',true)};if(x.id)$('#delete-cat').onclick=async()=>{if(confirm('Excluir categoria? Produtos ficarão sem categoria.')){await api('catalog/categories/'+x.id,{method:'DELETE'});closeModal();navigate('categories',true)}}}
async function renderCustomers(){const d=await api('customers');$('#view-content').innerHTML=`<section class="panel"><div class="table-wrap"><table class="admin-table"><thead><tr><th>Cliente</th><th>E-mail</th><th>Telefone</th><th>Cadastro</th><th>Pedidos</th><th>Total comprado</th><th>Último pedido</th></tr></thead><tbody>${d.customers.map(x=>`<tr><td><b>${esc(x.name||'—')}</b></td><td>${esc(x.email)}</td><td>${esc(x.phone||'—')}</td><td>${x.registered?'<span class="customer-origin">CONTA CRIADA</span>':'Compra sem conta'}</td><td>${x.orders}</td><td>${brlCents(x.spent)}</td><td>${x.last_order?dateTime(x.last_order):'Sem compras'}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Nenhum cliente.</td></tr>'}</tbody></table></div></section>`}
function messageStatus(value){return value==='responded'?'Respondida':value==='read'?'Lida':'Não respondida'}
async function renderMessages(){const c=$('#view-content');const load=async()=>{const q=encodeURIComponent($('#message-search')?.value||''),status=encodeURIComponent($('#message-status')?.value||''),d=await api(`messages?q=${q}&status=${status}`);$('#nav-message-count').textContent=d.unread||0;$('#message-list').innerHTML=d.messages.map(x=>`<article class="message-row ${esc(x.status)}"><div class="message-person"><strong>${esc(x.name)}</strong><span>${esc(x.email)}</span><small>${esc(x.phone||'Sem telefone')}</small></div><div class="message-text">${esc(x.message)}</div><div class="message-side"><div class="message-meta"><span class="message-status ${esc(x.status)}">${messageStatus(x.status)}</span><div class="message-date">${dateTime(x.created_at)}</div></div><div class="message-actions message-action-menu"><button type="button" class="message-more" data-message-menu="${esc(x.id)}" aria-label="Abrir ações" aria-expanded="false">⋮</button><div class="message-menu-popover" data-message-popover="${esc(x.id)}">${x.status!=='responded'?`<button type="button" data-message-done="${esc(x.id)}"><span>✓</span> Marcar como respondida</button>`:''}<a href="mailto:${encodeURIComponent(x.email)}?subject=${encodeURIComponent('Retorno Salvatex')}"><span>✉</span> Contatar por e-mail</a>${x.phone?`<a href="https://wa.me/${String(x.phone).replace(/\D/g,'')}" target="_blank" rel="noopener"><span>◉</span> Contatar por WhatsApp</a>`:''}</div></div></div></article>`).join('')||'<div class="empty">Nenhuma mensagem.</div>';$$('[data-message-done]',c).forEach(b=>b.onclick=async()=>{await api('messages/'+encodeURIComponent(b.dataset.messageDone),{method:'PATCH',body:JSON.stringify({status:'responded'})});toast('Mensagem marcada como respondida');await load()});$$('[data-message-menu]',c).forEach(b=>b.onclick=e=>{e.stopPropagation();const menu=$('[data-message-popover="'+b.dataset.messageMenu+'"]',c),open=!menu.classList.contains('open');$$('.message-menu-popover.open',c).forEach(x=>x.classList.remove('open'));$$('[data-message-menu]',c).forEach(x=>x.setAttribute('aria-expanded','false'));menu.classList.toggle('open',open);b.setAttribute('aria-expanded',String(open))});c.onclick=e=>{if(!e.target.closest('.message-action-menu')){$$('.message-menu-popover.open',c).forEach(x=>x.classList.remove('open'));$$('[data-message-menu]',c).forEach(x=>x.setAttribute('aria-expanded','false'))}}};c.innerHTML=`<div class="message-toolbar"><div class="message-filters"><input id="message-search" class="search" placeholder="Buscar nome, e-mail, telefone ou mensagem"><select id="message-status" class="select"><option value="">Todos os status</option><option value="unread">Não respondidas</option><option value="read">Lidas</option><option value="responded">Respondidas</option></select><button id="message-filter" class="ghost-btn">Filtrar</button></div></div><section class="panel"><div id="message-list" class="message-list"><div class="empty">Carregando…</div></div></section>`;$('#message-filter').onclick=load;$('#message-search').addEventListener('keydown',e=>{if(e.key==='Enter')load()});$('#message-status').onchange=load;await load()}
async function renderPages(){
  const [d,p]=await Promise.all([api('pages'),api('catalog/products')]);
  ADMIN.cache.pageProducts=p.products||[];
  const c=$('#view-content');
  c.innerHTML=`<div class="page-toolbar"><div><div class="orders-help">Crie páginas institucionais ou vitrines de produtos com nome e URL próprios.</div></div><button id="new-page" class="primary-btn">+ Nova página</button></div><section class="panel"><table class="admin-table"><thead><tr><th>Página</th><th>Tipo</th><th>URL</th><th>Produtos</th><th>Status</th><th>Atualizada</th><th></th></tr></thead><tbody>${d.pages.map(x=>{let ids=[];try{ids=JSON.parse(x.product_ids_json||'[]')}catch{}const url=x.page_type==='produtos'?`../pagina.html?slug=${encodeURIComponent(x.slug)}`:`../pagina.html?slug=${encodeURIComponent(x.slug)}`;return `<tr data-page='${encodeURIComponent(JSON.stringify(x))}'><td><b>${esc(x.title)}</b></td><td>${x.page_type==='produtos'?'Vitrine de produtos':'Conteúdo'}</td><td><a href="${url}" target="_blank">/${esc(x.slug)} ↗</a></td><td>${x.page_type==='produtos'?ids.length:'—'}</td><td>${x.active?'Publicada':'Rascunho'}</td><td>${dateTime(x.updated_at)}</td><td><button class="ghost-btn edit-page">Editar</button></td></tr>`}).join('')||'<tr><td colspan="7" class="empty">Nenhuma página criada.</td></tr>'}</tbody></table></section>`;
  $('#new-page').onclick=()=>pageForm({},ADMIN.cache.pageProducts);
  $$('.edit-page').forEach(b=>b.onclick=()=>pageForm(JSON.parse(decodeURIComponent(b.closest('tr').dataset.page)),ADMIN.cache.pageProducts));
}

function pageForm(x={},products=[]){
  let selected=[];try{selected=JSON.parse(x.product_ids_json||'[]')}catch{}
  let measures=[];try{measures=JSON.parse(x.measures_json||'[]')}catch{}
  const type=x.page_type||'conteudo';
  const productPicker=(name,selectedIds=[])=>products.map(p=>`<label class="page-product-option"><input type="checkbox" name="${name}" value="${esc(p.id)}" ${selectedIds.includes(p.id)?'checked':''}><span>${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:'<i></i>'}<b>${esc(p.name)}</b><small>${brlCents(p.base_price_cents)} · ${esc(p.category_name||p.sale_type||'')}</small></span></label>`).join('')||'<div class="empty">Cadastre produtos antes de montar uma vitrine.</div>';
  const picker=productPicker('productIds',selected);
  openModal(`<h2>${x.id?'Editar página':'Nova página'}</h2><form id="page-form"><div class="form-grid">
    <div class="form-field full"><label>Nome da página</label><input name="title" value="${esc(x.title||'')}" placeholder="Ex.: Cortina de Trilho Suíço" required><small class="field-hint">Este será o título exibido ao cliente.</small></div>
    <div class="form-field">
      <label>Tipo de página</label>
      <select name="pageType" id="page-type">
        <option value="produtos" ${type==='produtos'?'selected':''}>Vitrine de produtos</option>
        <option value="conteudo" ${type==='conteudo'?'selected':''}>Página de conteúdo</option>
        <option value="configurador_wave" ${type==='configurador_wave'?'selected':''}>Cortina Wave sob medida</option>
        <option value="configurador_prega_macho" ${type==='configurador_prega_macho'?'selected':''}>Cortina Prega Macho sob medida</option>
        <option value="configurador_ilhos" ${type==='configurador_ilhos'?'selected':''}>Cortina de Ilhós sob medida</option>
        <option value="configurador_persiana" ${type==='configurador_persiana'?'selected':''}>Persiana sob medida</option>
      </select>
      <small class="field-hint">Nos tipos sob medida, o link abre automaticamente o configurador correto.</small>
    </div>
    <div class="form-field"><label>Endereço / slug</label><input name="slug" value="${esc(x.slug||'')}" placeholder="cortina-de-trilho-suico"></div>

    <div class="form-field">
      <label>Exibir no menu do site</label>
      <select name="navGroup">
        <option value="oculto" ${(x.nav_group||'oculto')==='oculto'?'selected':''}>Não exibir no menu</option>
        <option value="cortinas_sob_medida" ${x.nav_group==='cortinas_sob_medida'?'selected':''}>Cortinas sob medida</option>
        <option value="persianas_sob_medida" ${x.nav_group==='persianas_sob_medida'?'selected':''}>Persianas sob medida</option>
        <option value="pronta_entrega" ${x.nav_group==='pronta_entrega'?'selected':''}>Pronta entrega</option>
      </select>
      <small class="field-hint">O nome exibido no menu será o mesmo “Nome da página” acima.</small>
    </div>

    <div class="form-field">
      <label>Ordem no menu</label>
      <input name="navOrder" type="number" step="1" value="${Number(x.nav_order??100)}">
      <small class="field-hint">Menor número aparece primeiro.</small>
    </div>

    <div class="form-field full"><label>Imagem de capa opcional</label><input name="heroImageUrl" value="${esc(x.hero_image_url||'')}" placeholder="https://..."></div>
    <div id="page-products-wrap" class="form-field full"><label>Produtos gerais desta página</label><div class="page-product-picker">${picker}</div><small class="field-hint">Esses produtos aparecem ao abrir a página antes de escolher uma medida.</small></div>
    <div id="page-measures-wrap" class="form-field full"><div class="measure-admin-head"><div><label>Medidas pré-definidas</label><small class="field-hint">Crie as medidas desta página e vincule os produtos corretos a cada uma.</small></div><button type="button" id="add-measure" class="ghost-btn">+ Adicionar medida</button></div><div id="measure-builder" class="measure-builder"></div><div class="form-field full custom-measure-field"><label>Destino para “Tenho uma medida específica”</label><input name="customMeasureUrl" value="${esc(x.custom_measure_url||'index.html#configurador')}" placeholder="index.html#configurador"><small class="field-hint">Pode apontar para o configurador sob medida.</small></div></div>
    <div id="page-content-wrap" class="form-field full"><label>Conteúdo HTML</label><textarea name="contentHtml" style="min-height:220px">${esc(x.content_html||'')}</textarea></div>
    <div class="form-field"><label>SEO título</label><input name="seoTitle" value="${esc(x.seo_title||'')}"></div>
    <div class="form-field"><label>SEO descrição</label><input name="seoDescription" value="${esc(x.seo_description||'')}"></div>
    <div class="form-field"><label><input name="active" type="checkbox" ${x.active!==0?'checked':''}> Publicada</label></div>
  </div><div class="form-actions">${x.id?'<button id="delete-page" type="button" class="danger-btn">Excluir</button>':''}<button type="button" class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn">Salvar página</button></div></form>`);
  const f=$('#page-form'),typeEl=$('#page-type'),productsWrap=$('#page-products-wrap'),contentWrap=$('#page-content-wrap'),measuresWrap=$('#page-measures-wrap'),builder=$('#measure-builder');
  let seq=0;
  function renderMeasure(m={}){
    seq++;
    const id=m.id||`medida-${Date.now()}-${seq}`;
    const productIds=Array.isArray(m.productIds)?m.productIds:[];
    const row=document.createElement('div');row.className='measure-admin-card';row.dataset.measureId=id;
    row.innerHTML=`<div class="measure-admin-row"><div class="form-field"><label>Texto exibido</label><input class="measure-label" value="${esc(m.label||'')}" placeholder="Para trilho de 2,00 metros"></div><div class="form-field"><label>Valor / referência</label><input class="measure-value" value="${esc(m.value||'')}" placeholder="2,00 m"></div><button type="button" class="measure-remove danger-link">Remover</button></div><div class="form-field full"><label>Produtos desta medida</label><div class="page-product-picker measure-products">${productPicker('ignore',productIds)}</div></div>`;
    $$('.measure-products input',row).forEach(i=>i.removeAttribute('name'));
    $('.measure-remove',row).onclick=()=>row.remove();builder.appendChild(row);
  }
  measures.forEach(renderMeasure);
  $('#add-measure').onclick=()=>renderMeasure({});
  const toggle=()=>{
    const productMode=typeEl.value==='produtos';
    const contentMode=typeEl.value==='conteudo';
    const configuratorMode=typeEl.value.startsWith('configurador_');

    productsWrap.style.display=productMode?'block':'none';
    measuresWrap.style.display=productMode?'block':'none';
    contentWrap.style.display=contentMode?'block':'none';

    let info=$('#page-configurator-info');
    if(!info){
      info=document.createElement('div');
      info.id='page-configurator-info';
      info.className='page-configurator-info';
      typeEl.closest('.form-grid').appendChild(info);
    }

    if(configuratorMode){
      const labels={
        configurador_wave:'Cortina Wave',
        configurador_prega_macho:'Cortina Prega Macho',
        configurador_ilhos:'Cortina de Ilhós',
        configurador_persiana:'Persiana sob medida'
      };

      info.style.display='block';
      info.innerHTML=`<b>Destino automático:</b> ao clicar nesta página no site, o cliente será levado diretamente ao configurador <strong>${esc(labels[typeEl.value]||'sob medida')}</strong>. Você continua usando Nome da página, imagem de capa e posição no menu normalmente.`;
    }else{
      info.style.display='none';
      info.innerHTML='';
    }
  };
  typeEl.onchange=toggle;
  toggle();
  f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f);const measurePayload=$$('.measure-admin-card',builder).map(row=>({id:row.dataset.measureId,label:$('.measure-label',row).value.trim(),value:$('.measure-value',row).value.trim(),productIds:$$('.measure-products input:checked',row).map(i=>i.value)})).filter(m=>m.label);const body={title:fd.get('title'),slug:fd.get('slug'),pageType:fd.get('pageType'),navGroup:fd.get('navGroup'),navOrder:Number(fd.get('navOrder')||100),heroImageUrl:fd.get('heroImageUrl'),productIds:fd.getAll('productIds'),measures:measurePayload,customMeasureUrl:fd.get('customMeasureUrl'),contentHtml:fd.get('contentHtml'),seoTitle:fd.get('seoTitle'),seoDescription:fd.get('seoDescription'),active:fd.get('active')==='on'};await api(x.id?'pages/'+x.id:'pages',{method:x.id?'PUT':'POST',body:JSON.stringify(body)});toast('Página salva');closeModal();navigate('pages',true)};
  if(x.id)$('#delete-page').onclick=async()=>{if(confirm('Excluir página?')){await api('pages/'+x.id,{method:'DELETE'});closeModal();navigate('pages',true)}}
}

async function renderMedia(){const p=await api('catalog/products');const imgs=p.products.filter(x=>x.image_url);$('#view-content').innerHTML=`<div class="entity-card"><div class="panel-head"><h2>Biblioteca de mídia</h2><span>As imagens abaixo vêm dos produtos cadastrados.</span></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px">${imgs.map(x=>`<div style="border:1px solid var(--line);border-radius:9px;overflow:hidden;background:#fff"><img src="${esc(x.image_url)}" style="width:100%;aspect-ratio:1;object-fit:cover"><div style="padding:9px;font-size:10px">${esc(x.name)}</div></div>`).join('')||'<div class="empty">Nenhuma imagem cadastrada. O upload direto será conectado ao armazenamento R2 em uma etapa futura.</div>'}</div></div>`}
async function renderCoupons(){const d=await api('coupons');const c=$('#view-content');c.innerHTML=`<div class="page-toolbar"><div></div><button id="new-coupon" class="primary-btn">+ Novo cupom</button></div><section class="panel"><table class="admin-table"><thead><tr><th>Código</th><th>Desconto</th><th>Mínimo</th><th>Usos</th><th>Status</th><th></th></tr></thead><tbody>${d.coupons.map(x=>`<tr data-coupon='${encodeURIComponent(JSON.stringify(x))}'><td><b>${esc(x.code)}</b></td><td>${x.discount_type==='percent'?x.discount_value+'%':brlCents(x.discount_value*100)}</td><td>${brlCents(x.minimum_cents)}</td><td>${x.used_count}${x.max_uses?'/'+x.max_uses:''}</td><td>${x.active?'Ativo':'Inativo'}</td><td><button class="ghost-btn edit-coupon">Editar</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhum cupom.</td></tr>'}</tbody></table></section>`;$('#new-coupon').onclick=()=>couponForm();$$('.edit-coupon').forEach(b=>b.onclick=()=>couponForm(JSON.parse(decodeURIComponent(b.closest('tr').dataset.coupon))))}
function couponForm(x={}){openModal(`<h2>${x.id?'Editar cupom':'Novo cupom'}</h2><form id="coupon-form"><div class="form-grid"><div class="form-field"><label>Código</label><input name="code" value="${esc(x.code||'')}" required></div><div class="form-field"><label>Tipo</label><select name="discountType"><option value="percent" ${x.discount_type!=='fixed'?'selected':''}>Percentual</option><option value="fixed" ${x.discount_type==='fixed'?'selected':''}>Valor fixo</option></select></div><div class="form-field"><label>Desconto</label><input name="discountValue" type="number" step="0.01" value="${x.discount_value||0}"></div><div class="form-field"><label>Pedido mínimo (R$)</label><input name="minimum" type="number" step="0.01" value="${Number(x.minimum_cents||0)/100}"></div><div class="form-field"><label>Máximo de usos</label><input name="maxUses" type="number" value="${x.max_uses||''}"></div><div class="form-field"><label><input name="active" type="checkbox" ${x.active!==0?'checked':''}> Ativo</label></div></div><div class="form-actions">${x.id?'<button id="delete-coupon" type="button" class="danger-btn">Excluir</button>':''}<button class="primary-btn">Salvar cupom</button></div></form>`);const f=$('#coupon-form');f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),body={code:fd.get('code'),discountType:fd.get('discountType'),discountValue:fd.get('discountValue'),minimum:fd.get('minimum'),maxUses:fd.get('maxUses'),active:fd.get('active')==='on'};await api(x.id?'coupons/'+x.id:'coupons',{method:x.id?'PUT':'POST',body:JSON.stringify(body)});closeModal();navigate('coupons',true)};if(x.id)$('#delete-coupon').onclick=async()=>{if(confirm('Excluir cupom?')){await api('coupons/'+x.id,{method:'DELETE'});closeModal();navigate('coupons',true)}}}
async function renderReports(){const d=await api('dashboard');$('#view-content').innerHTML=`<div class="stats-grid">${statCard('Faturamento mês',brlCents(d.stats.monthRevenue),'R$','green')}${statCard('Pedidos no mês','—','▣','blue')}${statCard('Ticket médio',brlCents(d.stats.averageTicket),'▤','yellow')}${statCard('Pedidos totais',d.stats.totalOrders,'#','purple')}</div><section class="panel" style="margin-top:16px"><div class="panel-head"><h2>Faturamento — últimos 30 dias</h2></div><div id="revenue-chart" class="chart"></div></section>`;drawRevenue(d.revenue)}


function colorStockHtml(cores=[],status={}){
  const mapa=
    status &&
    typeof status==='object' &&
    !Array.isArray(status)
      ? status
      : {};

  return (Array.isArray(cores)?cores:[]).map(cor=>{
    const ativo=
      mapa[cor] !== false;

    return `<label class="cfg-color-stock-item ${ativo?'':'is-out'}">
      <input
        type="checkbox"
        class="cfg-cor-estoque"
        data-cor="${esc(cor)}"
        ${ativo?'checked':''}
      >
      <span>${esc(cor)}</span>
      <small>${ativo?'Com estoque':'Sem estoque'}</small>
    </label>`;
  }).join('');
}

function bindColorStockToggles(root=document){
  $$('.cfg-cor-estoque',root).forEach(inp=>{
    inp.onchange=()=>{
      const item=
        inp.closest(
          '.cfg-color-stock-item'
        );

      if(!item)return;

      item.classList.toggle(
        'is-out',
        !inp.checked
      );

      const status=
        item.querySelector(
          'small'
        );

      if(status){
        status.textContent=
          inp.checked
            ? 'Com estoque'
            : 'Sem estoque';
      }
    };
  });
}

function collectColorStock(card,cores){
  const atuais={};

  $$('.cfg-cor-estoque',card).forEach(inp=>{
    const cor=
      String(
        inp.dataset.cor || ''
      ).trim();

    if(cor){
      atuais[cor]=
        Boolean(
          inp.checked
        );
    }
  });

  /*
    Cores novas digitadas no campo começam como "com estoque".
    Cores existentes preservam o status do checkbox.
  */
  (Array.isArray(cores)?cores:[]).forEach(cor=>{
    if(
      !Object.prototype.hasOwnProperty.call(
        atuais,
        cor
      )
    ){
      atuais[cor]=true;
    }
  });

  return atuais;
}

function waveTecidoCard(nome,t={}){
  const forros=Object.entries(t.forros||{});
  const cores=Array.isArray(t.cores)?t.cores:[];
  return `<div class="configurator-subcard wave-tecido-card"><div class="configurator-card-head"><div class="form-field"><label>Nome do tecido</label><input class="wave-tecido-nome" value="${esc(nome||'')}"></div><button type="button" class="danger-link remove-wave-tecido">Remover tecido</button></div><div class="form-field full"><label>Cores (separe por vírgula)</label><input class="wave-tecido-cores" value="${esc(cores.join(', '))}"></div><div class="color-stock-wrap"><div class="color-stock-title">Disponibilidade das cores</div><div class="cfg-color-stock-list">${colorStockHtml(cores,t.coresAtivas||{})||'<small>Salve o tecido após adicionar cores para gerenciar o estoque.</small>'}</div></div><div class="wave-forros">${forros.map(([f,p])=>waveForroRow(f,p)).join('')}</div><button type="button" class="ghost-btn add-wave-forro">+ Adicionar forro</button></div>`
}
function waveForroRow(nome='',preco=''){return `<div class="configurator-inline-row wave-forro-row"><input class="wave-forro-nome" placeholder="Nome do forro" value="${esc(nome)}"><input class="wave-forro-preco" type="number" step="0.01" placeholder="Preço por metro" value="${Number(preco||0)}"><button type="button" class="danger-link remove-wave-forro">×</button></div>`}
function waveTrilhoRow(nome='',x={}){return `<div class="configurator-inline-row wave-trilho-row"><input class="wave-trilho-nome" placeholder="Nome do trilho/varão" value="${esc(nome)}"><input class="wave-trilho-metro" type="number" step="0.01" placeholder="R$/metro" value="${Number(x.valorMetro||0)}"><input class="wave-trilho-minimo" type="number" step="0.01" placeholder="Mínimo" value="${Number(x.minimo||0)}"><button type="button" class="danger-link remove-wave-trilho">×</button></div>`}
function waveMidiaRow(m={}){return `<div class="configurator-subcard wave-midia-row"><div class="configurator-card-head"><strong>Combinação de mídia</strong><button type="button" class="danger-link remove-wave-midia">Remover</button></div><div class="form-grid"><div class="form-field"><label>Tecido</label><input class="wave-midia-tecido" value="${esc(m.tecido||'')}"></div><div class="form-field"><label>Cor</label><input class="wave-midia-cor" value="${esc(m.cor||'')}"></div><div class="form-field"><label>Forro</label><input class="wave-midia-forro" value="${esc(m.forro||'')}"></div><div class="form-field"><label>Imagem de capa (URL/caminho)</label><input class="wave-midia-capa" value="${esc(m.capa||'')}"></div><div class="form-field full"><label>Fotos da galeria — uma URL/caminho por linha</label><textarea class="wave-midia-imagens" rows="4">${esc((m.imagens||[]).join('\n'))}</textarea></div><div class="form-field full"><label>Vídeo (URL/caminho opcional)</label><input class="wave-midia-video" value="${esc(m.video||'')}"></div></div></div>`}
function bindWaveBuilder(){
  const tecidos=$('#wave-tecidos'),trilhos=$('#wave-trilhos'),midias=$('#wave-midias');
  $('#add-wave-tecido').onclick=()=>{tecidos.insertAdjacentHTML('beforeend',waveTecidoCard('',{cores:[],forros:{}}));bindWaveBuilderRows()};
  $('#add-wave-trilho').onclick=()=>{trilhos.insertAdjacentHTML('beforeend',waveTrilhoRow());bindWaveBuilderRows()};
  $('#add-wave-midia').onclick=()=>{midias.insertAdjacentHTML('beforeend',waveMidiaRow());bindWaveBuilderRows()};
  bindWaveBuilderRows();
}
function bindWaveBuilderRows(){
  bindColorStockToggles(document);
  $$('.remove-wave-tecido').forEach(b=>b.onclick=()=>b.closest('.wave-tecido-card').remove());
  $$('.add-wave-forro').forEach(b=>b.onclick=()=>{const box=b.closest('.wave-tecido-card').querySelector('.wave-forros');box.insertAdjacentHTML('beforeend',waveForroRow());bindWaveBuilderRows()});
  $$('.remove-wave-forro').forEach(b=>b.onclick=()=>b.closest('.wave-forro-row').remove());
  $$('.remove-wave-trilho').forEach(b=>b.onclick=()=>b.closest('.wave-trilho-row').remove());
  $$('.remove-wave-midia').forEach(b=>b.onclick=()=>b.closest('.wave-midia-row').remove());
}
function collectWave(form,wave){
  const fd=new FormData(form),tecidos={},trilhos={},midia=[];
  $$('.wave-tecido-card').forEach(card=>{const nome=$('.wave-tecido-nome',card).value.trim();if(!nome)return;const forros={};$$('.wave-forro-row',card).forEach(r=>{const f=$('.wave-forro-nome',r).value.trim();if(f)forros[f]=Number($('.wave-forro-preco',r).value||0)});const cores=$('.wave-tecido-cores',card).value.split(',').map(x=>x.trim()).filter(Boolean);tecidos[nome]={ativo:true,cores,coresAtivas:collectColorStock(card,cores),forros}});
  $$('.wave-trilho-row').forEach(r=>{const nome=$('.wave-trilho-nome',r).value.trim();if(nome)trilhos[nome]={valorMetro:Number($('.wave-trilho-metro',r).value||0),minimo:Number($('.wave-trilho-minimo',r).value||0)}});
  $$('.wave-midia-row').forEach(r=>{const tecido=$('.wave-midia-tecido',r).value.trim(),cor=$('.wave-midia-cor',r).value.trim(),forro=$('.wave-midia-forro',r).value.trim();if(!tecido||!cor||!forro)return;midia.push({tecido,modelo:'Wave',cor,forro,capa:$('.wave-midia-capa',r).value.trim(),imagens:$('.wave-midia-imagens',r).value.split('\n').map(x=>x.trim()).filter(Boolean),video:$('.wave-midia-video',r).value.trim()})});
  return {...wave,nome:fd.get('nome'),ativo:fd.get('ativo')==='on',medidas:{larguraMinima:Number(fd.get('larguraMinima')||0.5),larguraMaxima:Number(fd.get('larguraMaxima')||12),alturaMinima:Number(fd.get('alturaMinima')||0.5),alturaEntradaMaxima:Number(fd.get('alturaEntradaMaxima')||5),calculoMaximo:Number(fd.get('calculoMaximo')||3.2),inicioAcrescimo:Number(fd.get('inicioAcrescimo')||2.8),acrescimoPercentual:Number(fd.get('acrescimoPercentual')||0),acimaMaximo:{modo:'consulta',texto:fd.get('textoAcimaMaximo'),textoBotao:fd.get('textoBotaoAcimaMaximo'),permitirCarrinho:fd.get('permitirCarrinho')==='on'}},barra:{faixas:[{ate:Number(fd.get('faixa1Ate')),tamanho:Number(fd.get('faixa1Barra'))},{ate:Number(fd.get('faixa2Ate')),tamanho:Number(fd.get('faixa2Barra'))},{ate:Number(fd.get('faixa3Ate')),tamanho:Number(fd.get('faixa3Barra'))},{ate:Number(fd.get('faixa4Ate')),tamanho:Number(fd.get('faixa4Barra'))}],acimaInicio:Number(fd.get('barraAcimaInicio')||20)},franzimentos:wave.franzimentos||[],tecidos,trilhos,midia};
}
async function renderConfigurators(){
  const d=await api('configurators/wave'),w=d.wave||{},m=w.medidas||{},b=w.barra||{},faixas=b.faixas||[];
  $('#view-content').innerHTML=`<div class="page-toolbar"><div><span class="select">Configurador ativo na loja: Wave</span></div><button id="save-wave" class="primary-btn">Salvar configurador</button></div><form id="wave-form"><section class="panel configurator-section"><div class="panel-head"><div><h2>Configurador Wave</h2><p>Edite regras, preços, opções e mídia sem alterar código.</p></div></div><div class="form-grid"><div class="form-field"><label>Nome exibido</label><input name="nome" value="${esc(w.nome||'Cortina Wave')}"></div><div class="form-field"><label><input type="checkbox" name="ativo" ${w.ativo!==false?'checked':''}> Configurador ativo</label></div></div></section><section class="panel configurator-section"><div class="panel-head"><h2>Regras de medidas e altura</h2></div><div class="form-grid"><div class="form-field"><label>Largura mínima (m)</label><input name="larguraMinima" type="number" step="0.01" value="${m.larguraMinima??0.5}"></div><div class="form-field"><label>Largura máxima (m)</label><input name="larguraMaxima" type="number" step="0.01" value="${m.larguraMaxima??12}"></div><div class="form-field"><label>Altura mínima (m)</label><input name="alturaMinima" type="number" step="0.01" value="${m.alturaMinima??0.5}"></div><div class="form-field"><label>Altura máxima que cliente pode digitar (m)</label><input name="alturaEntradaMaxima" type="number" step="0.01" value="${m.alturaEntradaMaxima??5}"></div><div class="form-field"><label>Calcular automaticamente até (m)</label><input name="calculoMaximo" type="number" step="0.01" value="${m.calculoMaximo??3.2}"></div><div class="form-field"><label>Aplicar acréscimo acima de (m)</label><input name="inicioAcrescimo" type="number" step="0.01" value="${m.inicioAcrescimo??2.8}"></div><div class="form-field"><label>Acréscimo (%)</label><input name="acrescimoPercentual" type="number" step="0.01" value="${m.acrescimoPercentual??25}"></div><div class="form-field full"><label>Mensagem acima do limite automático</label><input name="textoAcimaMaximo" value="${esc(m.acimaMaximo?.texto||'Alturas acima de 3,20 m precisam de orçamento personalizado.')}"></div><div class="form-field"><label>Texto do botão</label><input name="textoBotaoAcimaMaximo" value="${esc(m.acimaMaximo?.textoBotao||'Solicitar orçamento')}"></div><div class="form-field"><label><input type="checkbox" name="permitirCarrinho" ${m.acimaMaximo?.permitirCarrinho?'checked':''}> Permitir carrinho acima do limite</label></div></div></section><section class="panel configurator-section"><div class="panel-head"><h2>Regras da barra</h2></div><div class="configurator-rules-grid">${[0,1,2,3].map((i)=>`<div class="configurator-rule"><span>Faixa ${i+1}</span><input name="faixa${i+1}Ate" type="number" step="0.01" value="${faixas[i]?.ate??''}" placeholder="Até (m)"><input name="faixa${i+1}Barra" type="number" step="1" value="${faixas[i]?.tamanho??''}" placeholder="Barra (cm)"></div>`).join('')}</div><div class="form-field" style="max-width:260px;margin-top:12px"><label>Barra acima do início do acréscimo (cm)</label><input name="barraAcimaInicio" type="number" value="${b.acimaInicio??20}"></div></section><section class="panel configurator-section"><div class="panel-head"><div><h2>Tecidos, cores, forros e preços</h2><p>O preço é informado por metro de tecido.</p></div><button type="button" id="add-wave-tecido" class="ghost-btn">+ Adicionar tecido</button></div><div id="wave-tecidos" class="configurator-stack">${Object.entries(w.tecidos||{}).map(([n,t])=>waveTecidoCard(n,t)).join('')}</div></section><section class="panel configurator-section"><div class="panel-head"><h2>Trilhos e varões</h2><button type="button" id="add-wave-trilho" class="ghost-btn">+ Adicionar</button></div><div id="wave-trilhos" class="configurator-stack">${Object.entries(w.trilhos||{}).map(([n,x])=>waveTrilhoRow(n,x)).join('')}</div></section><section class="panel configurator-section"><div class="panel-head"><div><h2>Fotos e vídeos do configurador</h2><p>Vincule mídia à combinação tecido + cor + forro. Pode usar caminhos existentes em /imagens ou URLs.</p></div><button type="button" id="add-wave-midia" class="ghost-btn">+ Adicionar mídia</button></div><div id="wave-midias" class="configurator-stack">${(w.midia||[]).map(waveMidiaRow).join('')}</div></section><div class="form-actions"><button class="primary-btn">Salvar configurador Wave</button></div></form>`;
  bindWaveBuilder();
  const salvarBotoes=()=>[
    $('#save-wave'),
    ...$$('#wave-form button.primary-btn')
  ].filter(Boolean);

  const save=async(evento)=>{
    if(evento&&typeof evento.preventDefault==='function')evento.preventDefault();

    const botoes=salvarBotoes();
    const textos=botoes.map(b=>b.textContent);

    try{
      botoes.forEach(b=>{
        b.disabled=true;
        b.textContent='Salvando...';
      });

      const wave=collectWave($('#wave-form'),w);

      if(!wave.nome||!String(wave.nome).trim()){
        throw new Error('Informe o nome do configurador.');
      }

      if(!wave.medidas||Number(wave.medidas.calculoMaximo)<=0){
        throw new Error('Informe a altura máxima calculada.');
      }

      const resposta=await api('configurators/wave',{
        method:'PUT',
        body:JSON.stringify({wave})
      });

      if(!resposta||resposta.ok!==true){
        throw new Error(resposta?.message||'Não foi possível salvar o configurador.');
      }

      toast('Configurador Wave salvo com sucesso');
      ADMIN.cache.configuratorWave=resposta.wave||wave;

    }catch(erro){
      console.error('Erro ao salvar configurador Wave:',erro);
      toast('Erro ao salvar: '+(erro?.message||'falha desconhecida'));
      alert('Não foi possível salvar o configurador Wave.\n\n'+(erro?.message||'Falha desconhecida.'));
    }finally{
      botoes.forEach((b,i)=>{
        b.disabled=false;
        b.textContent=textos[i]||'Salvar configurador';
      });
    }
  };

  $('#wave-form').onsubmit=save;

  const saveTopo=$('#save-wave');
  if(saveTopo){
    saveTopo.type='button';
    saveTopo.onclick=save;
  }
}

const DEFAULT_LAYOUT_CONFIG={
  header:{
    logoText:"SALVATEX",
    logoSubtext:"CORTINAS",
    curtainsLabel:"Cortinas sob medida",
    blindsLabel:"Persianas sob medida",
    contactLabel:"Contato",
    cartLabel:"Carrinho",
    showContact:true,
    showCart:true
  },

  home:{
    hero:{
      enabled:true,
      kicker:"Cortinas e persianas",
      title:"Sob medida para transformar seus ambientes.",
      subtitle:"Encontre cortinas, persianas e opções pronta entrega com acabamento pensado para cada espaço.",
      primaryText:"Conhecer opções",
      primaryTarget:"#colecoes-home",
      secondaryText:"Falar com a Salvatex",
      secondaryTarget:"#contato",
      backgroundImage:"/imagens/gazenatural100bck.jpeg"
    },

    sections:[
      {id:"hero",label:"Banner principal",enabled:true,order:10},
      {id:"collections",label:"Categorias sob medida",enabled:true,order:20},
      {id:"benefits",label:"Informações e diferenciais",enabled:true,order:30},
      {id:"configurator",label:"Configurador Wave",enabled:true,order:40}
    ],

    collections:{
      kicker:"SALVATEX CORTINAS",
      title:"Sob medida para transformar seus ambientes",
      subtitle:"Escolha o modelo e veja opções, medidas e produtos cadastrados diretamente pelo nosso catálogo."
    },

    benefits:[
      {title:"Feito sob medida",text:"Perfeito para o seu espaço"},
      {title:"Materiais selecionados",text:"Acabamento e qualidade"},
      {title:"Entrega para todo o Brasil",text:"Com segurança e agilidade"},
      {title:"Atendimento especializado",text:"Suporte antes e depois da compra"}
    ],

    configurator:{
      kicker:"CONFIGURADOR WAVE",
      title:"Configure sua cortina sob medida",
      subtitle:"Escolha medidas, tecido, forro, cor e acabamento para montar sua cortina."
    }
  },

  configuratorLabels:{formTitle:"Configure sua cortina",formSubtitle:"Escolha as características abaixo para calcular sua cortina sob medida.",mediaTitle:"Transforme seu ambiente!",summaryTitle:"Resumo do orçamento",step1:"Cortina Pronta",step2:"Tecido",step3:"Forro",step4:"Acabamento",step5:"Resumo"},

  colors:{primary:"#2f2116",accent:"#9a7547",background:"#fbfaf8",text:"#172033",muted:"#756f68",headerBackground:"#ffffff",cardBackground:"#ffffff",border:"#e9e2da",buttonText:"#ffffff"},

  footer:{
    brandText:"SALVATEX CORTINAS",
    description:"Cortinas e persianas sob medida.",
    whatsapp:"5544998793160",
    copyright:"SALVATEX CORTINAS · 2026"
  }
};

function cloneLayout(v){
  return JSON.parse(JSON.stringify(v));
}

function mergeLayout(target,source){
  if(!source||typeof source!=="object"||Array.isArray(source))return target;
  Object.entries(source).forEach(([k,v])=>{
    if(v&&typeof v==="object"&&!Array.isArray(v)){
      target[k]=mergeLayout(
        target[k]&&typeof target[k]==="object"&&!Array.isArray(target[k])
          ? target[k]
          : {},
        v
      );
    }else{
      target[k]=v;
    }
  });
  return target;
}

function layoutSectionRow(item){
  return `<div class="layout-section-row" draggable="true" data-layout-section="${esc(item.id)}">
    <span class="layout-drag" title="Arraste para reorganizar">⋮⋮</span>
    <div class="layout-section-name">
      <strong>${esc(item.label)}</strong>
      <small>${item.enabled!==false?'Visível na página':'Oculto na página'}</small>
    </div>
    <button type="button" class="layout-eye ${item.enabled!==false?'active':''}" title="${item.enabled!==false?'Ocultar seção':'Exibir seção'}">
      ${item.enabled!==false?'◉':'○'}
    </button>
  </div>`;
}

function bindLayoutSectionRows(container){
  let dragging=null;

  $$('.layout-section-row',container).forEach(row=>{
    row.addEventListener('dragstart',()=>{
      dragging=row;
      row.classList.add('dragging');
    });

    row.addEventListener('dragend',()=>{
      row.classList.remove('dragging');
      dragging=null;
    });

    row.addEventListener('dragover',e=>{
      e.preventDefault();
      if(!dragging||dragging===row)return;

      const rect=row.getBoundingClientRect();
      const before=e.clientY < rect.top + rect.height/2;

      if(before){
        container.insertBefore(dragging,row);
      }else{
        container.insertBefore(dragging,row.nextSibling);
      }
    });

    const eye=$('.layout-eye',row);
    eye.onclick=()=>{
      const enabled=!row.classList.contains('layout-disabled');
      row.classList.toggle('layout-disabled',enabled);
      eye.classList.toggle('active',!enabled);
      eye.textContent=!enabled?'◉':'○';

      const small=$('small',row);
      if(small)small.textContent=!enabled?'Visível na página':'Oculto na página';
    };
  });
}

async function renderLayout(){
  const d=await api('layout');
  const current=mergeLayout(
    cloneLayout(DEFAULT_LAYOUT_CONFIG),
    d.layout||{}
  );

  const sections=[...(current.home.sections||[])]
    .sort((a,b)=>Number(a.order||0)-Number(b.order||0));

  const benefits=Array.isArray(current.home.benefits)
    ? current.home.benefits
    : [];

  $('#view-content').innerHTML=`
    <div class="layout-editor-grid">

      <aside class="panel layout-editor-nav">
        <div class="panel-head">
          <div>
            <h2>Editar layout</h2>
            <p>Altere textos, imagens, cores e a ordem da página inicial.</p>
          </div>
        </div>

        <button type="button" class="layout-editor-tab active" data-layout-tab="header">Cabeçalho</button>
        <button type="button" class="layout-editor-tab" data-layout-tab="home">Página inicial</button>
        <button type="button" class="layout-editor-tab" data-layout-tab="labels">Textos do configurador</button>
        <button type="button" class="layout-editor-tab" data-layout-tab="colors">Cores da marca</button>
        <button type="button" class="layout-editor-tab" data-layout-tab="footer">Rodapé</button>

        <a href="../index.html" target="_blank" class="layout-preview-link">Abrir loja ↗</a>
      </aside>

      <form id="layout-editor-form">

        <section class="panel layout-editor-page active" data-layout-page="header">
          <div class="panel-head">
            <div>
              <h2>Cabeçalho</h2>
              <p>Textos que aparecem no menu principal do site.</p>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label>Nome da marca</label>
              <input name="headerLogoText" value="${esc(current.header.logoText)}">
            </div>

            <div class="form-field">
              <label>Texto abaixo da marca</label>
              <input name="headerLogoSubtext" value="${esc(current.header.logoSubtext)}">
            </div>

            <div class="form-field">
              <label>Menu — Cortinas</label>
              <input name="headerCurtainsLabel" value="${esc(current.header.curtainsLabel)}">
            </div>

            <div class="form-field">
              <label>Menu — Persianas</label>
              <input name="headerBlindsLabel" value="${esc(current.header.blindsLabel)}">
            </div>

            <div class="form-field">
              <label>Menu — Contato</label>
              <input name="headerContactLabel" value="${esc(current.header.contactLabel)}">
            </div>

            <div class="form-field">
              <label>Texto do carrinho</label>
              <input name="headerCartLabel" value="${esc(current.header.cartLabel)}">
            </div>

            <div class="form-field">
              <label><input type="checkbox" name="headerShowContact" ${current.header.showContact!==false?'checked':''}> Exibir Contato</label>
            </div>

            <div class="form-field">
              <label><input type="checkbox" name="headerShowCart" ${current.header.showCart!==false?'checked':''}> Exibir Carrinho</label>
            </div>
          </div>
        </section>

        <section class="panel layout-editor-page" data-layout-page="home">
          <div class="panel-head">
            <div>
              <h2>Página inicial</h2>
              <p>Arraste as seções para mudar a ordem e use o botão ao lado para mostrar ou ocultar.</p>
            </div>
          </div>

          <div id="layout-sections-list" class="layout-sections-list">
            ${sections.map(layoutSectionRow).join('')}
          </div>

          <div class="layout-editor-divider"></div>

          <h3 class="layout-editor-subtitle">Banner principal</h3>

          <div class="form-grid">
            <div class="form-field full">
              <label>Texto pequeno</label>
              <input name="heroKicker" value="${esc(current.home.hero.kicker)}">
            </div>

            <div class="form-field full">
              <label>Título principal</label>
              <textarea name="heroTitle" rows="2">${esc(current.home.hero.title)}</textarea>
            </div>

            <div class="form-field full">
              <label>Subtítulo</label>
              <textarea name="heroSubtitle" rows="3">${esc(current.home.hero.subtitle)}</textarea>
            </div>

            <div class="form-field">
              <label>Texto do botão principal</label>
              <input name="heroPrimaryText" value="${esc(current.home.hero.primaryText)}">
            </div>

            <div class="form-field">
              <label>Destino do botão principal</label>
              <input name="heroPrimaryTarget" value="${esc(current.home.hero.primaryTarget)}">
            </div>

            <div class="form-field">
              <label>Texto do botão secundário</label>
              <input name="heroSecondaryText" value="${esc(current.home.hero.secondaryText)}">
            </div>

            <div class="form-field">
              <label>Destino do botão secundário</label>
              <input name="heroSecondaryTarget" value="${esc(current.home.hero.secondaryTarget)}">
            </div>

            <div class="form-field full">
              <label>Imagem de fundo</label>
              <input type="hidden" name="heroBackgroundImage" id="layout-hero-image-url" value="${esc(current.home.hero.backgroundImage||'')}">

              <div class="layout-image-upload">
                <div id="layout-hero-preview" class="layout-image-preview">
                  ${current.home.hero.backgroundImage
                    ? `<img src="${esc(current.home.hero.backgroundImage)}">`
                    : '<span>Sem imagem</span>'}
                </div>

                <label class="upload-btn">
                  Enviar imagem do computador
                  <input type="file" id="layout-hero-file" accept="image/jpeg,image/png,image/webp,image/gif">
                </label>

                <small id="layout-hero-status" class="upload-status"></small>
              </div>
            </div>
          </div>

          <div class="layout-editor-divider"></div>

          <h3 class="layout-editor-subtitle">Categorias sob medida</h3>

          <div class="form-grid">
            <div class="form-field">
              <label>Texto pequeno</label>
              <input name="collectionsKicker" value="${esc(current.home.collections.kicker)}">
            </div>

            <div class="form-field">
              <label>Título</label>
              <input name="collectionsTitle" value="${esc(current.home.collections.title)}">
            </div>

            <div class="form-field full">
              <label>Subtítulo</label>
              <textarea name="collectionsSubtitle" rows="2">${esc(current.home.collections.subtitle)}</textarea>
            </div>
          </div>

          <div class="layout-editor-divider"></div>

          <h3 class="layout-editor-subtitle">Diferenciais</h3>

          <div class="layout-benefits-editor">
            ${[0,1,2,3].map(i=>{
              const item=benefits[i]||{title:'',text:''};
              return `<div class="layout-benefit-edit">
                <div class="form-field">
                  <label>Título ${i+1}</label>
                  <input name="benefitTitle${i}" value="${esc(item.title)}">
                </div>
                <div class="form-field">
                  <label>Texto ${i+1}</label>
                  <input name="benefitText${i}" value="${esc(item.text)}">
                </div>
              </div>`;
            }).join('')}
          </div>

          <div class="layout-editor-divider"></div>

          <h3 class="layout-editor-subtitle">Configurador da home</h3>

          <div class="form-grid">
            <div class="form-field">
              <label>Texto pequeno</label>
              <input name="configKicker" value="${esc(current.home.configurator.kicker)}">
            </div>

            <div class="form-field">
              <label>Título</label>
              <input name="configTitle" value="${esc(current.home.configurator.title)}">
            </div>

            <div class="form-field full">
              <label>Subtítulo</label>
              <textarea name="configSubtitle" rows="2">${esc(current.home.configurator.subtitle)}</textarea>
            </div>
          </div>
        </section>

        <section class="panel layout-editor-page" data-layout-page="labels"><div class="panel-head"><div><h2>Textos do configurador</h2><p>Edite os textos fixos usados por Wave, Prega Macho e Ilhós.</p></div></div><div class="form-grid"><div class="form-field"><label>Título do formulário</label><input name="labelFormTitle" value="${esc(current.configuratorLabels?.formTitle||'Configure sua cortina')}"></div><div class="form-field"><label>Título da galeria</label><input name="labelMediaTitle" value="${esc(current.configuratorLabels?.mediaTitle||'Transforme seu ambiente!')}"></div><div class="form-field full"><label>Subtítulo do formulário</label><input name="labelFormSubtitle" value="${esc(current.configuratorLabels?.formSubtitle||'')}"></div><div class="form-field"><label>Título do resumo</label><input name="labelSummaryTitle" value="${esc(current.configuratorLabels?.summaryTitle||'Resumo do orçamento')}"></div><div class="form-field"><label>Etapa 1</label><input name="labelStep1" value="${esc(current.configuratorLabels?.step1||'Cortina Pronta')}"></div><div class="form-field"><label>Etapa 2</label><input name="labelStep2" value="${esc(current.configuratorLabels?.step2||'Tecido')}"></div><div class="form-field"><label>Etapa 3</label><input name="labelStep3" value="${esc(current.configuratorLabels?.step3||'Forro')}"></div><div class="form-field"><label>Etapa 4</label><input name="labelStep4" value="${esc(current.configuratorLabels?.step4||'Acabamento')}"></div><div class="form-field"><label>Etapa 5</label><input name="labelStep5" value="${esc(current.configuratorLabels?.step5||'Resumo')}"></div></div></section>

        <section class="panel layout-editor-page" data-layout-page="colors">
          <div class="panel-head">
            <div>
              <h2>Cores da marca</h2>
              <p>Altere as principais cores utilizadas no novo layout.</p>
            </div>
          </div>

          <div class="layout-color-grid">
            <label>Cor principal<input type="color" name="colorPrimary" value="${esc(current.colors.primary)}"></label>
            <label>Cor de destaque<input type="color" name="colorAccent" value="${esc(current.colors.accent)}"></label>
            <label>Fundo<input type="color" name="colorBackground" value="${esc(current.colors.background)}"></label>
            <label>Texto<input type="color" name="colorText" value="${esc(current.colors.text)}"></label>
            <label>Texto secundário<input type="color" name="colorMuted" value="${esc(current.colors.muted||'#756f68')}"></label>
            <label>Fundo do cabeçalho<input type="color" name="colorHeaderBackground" value="${esc(current.colors.headerBackground||'#ffffff')}"></label>
            <label>Fundo dos cards<input type="color" name="colorCardBackground" value="${esc(current.colors.cardBackground||'#ffffff')}"></label>
            <label>Bordas<input type="color" name="colorBorder" value="${esc(current.colors.border||'#e9e2da')}"></label>
            <label>Texto dos botões<input type="color" name="colorButtonText" value="${esc(current.colors.buttonText||'#ffffff')}"></label>
          </div>
        </section>

        <section class="panel layout-editor-page" data-layout-page="footer">
          <div class="panel-head">
            <div>
              <h2>Rodapé</h2>
              <p>Informações gerais exibidas no final das páginas.</p>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label>Nome da marca</label>
              <input name="footerBrandText" value="${esc(current.footer.brandText)}">
            </div>

            <div class="form-field">
              <label>WhatsApp</label>
              <input name="footerWhatsapp" value="${esc(current.footer.whatsapp)}">
            </div>

            <div class="form-field full">
              <label>Descrição</label>
              <textarea name="footerDescription" rows="2">${esc(current.footer.description)}</textarea>
            </div>

            <div class="form-field full">
              <label>Copyright</label>
              <input name="footerCopyright" value="${esc(current.footer.copyright)}">
            </div>
          </div>
        </section>

        <div class="layout-editor-savebar">
          <span>As alterações são aplicadas ao site após salvar.</span>
          <button type="submit" class="primary-btn">Publicar alterações</button>
        </div>
      </form>
    </div>
  `;

  const form=$('#layout-editor-form');

  $$('.layout-editor-tab').forEach(btn=>{
    btn.onclick=()=>{
      $$('.layout-editor-tab').forEach(x=>x.classList.toggle('active',x===btn));
      $$('.layout-editor-page').forEach(page=>{
        page.classList.toggle('active',page.dataset.layoutPage===btn.dataset.layoutTab);
      });
    };
  });

  bindLayoutSectionRows($('#layout-sections-list'));

  const heroFile=$('#layout-hero-file');

  if(heroFile){
    heroFile.onchange=async()=>{
      const file=heroFile.files?.[0];
      if(!file)return;

      const status=$('#layout-hero-status');

      try{
        status.textContent='Enviando imagem...';

        const d=await uploadAdminMedia(
          file,
          {
            configurator:'layout',
            tecido:'home',
            cor:'hero',
            forro:'geral'
          }
        );

        $('#layout-hero-image-url').value=d.url;
        $('#layout-hero-preview').innerHTML=`<img src="${esc(d.url)}">`;
        status.textContent='Imagem enviada.';
      }catch(err){
        status.textContent=err.message;
        alert(err.message);
      }
    };
  }

  form.onsubmit=async e=>{
    e.preventDefault();

    const fd=new FormData(form);

    const sectionRows=$$('.layout-section-row',$('#layout-sections-list'));

    const newSections=sectionRows.map((row,index)=>({
      id:row.dataset.layoutSection,
      label:$('strong',row)?.textContent||row.dataset.layoutSection,
      enabled:!row.classList.contains('layout-disabled'),
      order:(index+1)*10
    }));

    const benefits=[0,1,2,3].map(i=>({
      title:fd.get(`benefitTitle${i}`)||'',
      text:fd.get(`benefitText${i}`)||''
    }));

    const layout={
      header:{
        logoText:fd.get('headerLogoText')||'SALVATEX',
        logoSubtext:fd.get('headerLogoSubtext')||'CORTINAS',
        curtainsLabel:fd.get('headerCurtainsLabel')||'Cortinas sob medida',
        blindsLabel:fd.get('headerBlindsLabel')||'Persianas sob medida',
        contactLabel:fd.get('headerContactLabel')||'Contato',
        cartLabel:fd.get('headerCartLabel')||'Carrinho',
        showContact:fd.get('headerShowContact')==='on',
        showCart:fd.get('headerShowCart')==='on'
      },

      home:{
        hero:{
          enabled:true,
          kicker:fd.get('heroKicker')||'',
          title:fd.get('heroTitle')||'',
          subtitle:fd.get('heroSubtitle')||'',
          primaryText:fd.get('heroPrimaryText')||'',
          primaryTarget:fd.get('heroPrimaryTarget')||'#colecoes-home',
          secondaryText:fd.get('heroSecondaryText')||'',
          secondaryTarget:fd.get('heroSecondaryTarget')||'#contato',
          backgroundImage:fd.get('heroBackgroundImage')||''
        },

        sections:newSections,

        collections:{
          kicker:fd.get('collectionsKicker')||'',
          title:fd.get('collectionsTitle')||'',
          subtitle:fd.get('collectionsSubtitle')||''
        },

        benefits,

        configurator:{
          kicker:fd.get('configKicker')||'',
          title:fd.get('configTitle')||'',
          subtitle:fd.get('configSubtitle')||''
        }
      },

      configuratorLabels:{formTitle:fd.get('labelFormTitle')||'',formSubtitle:fd.get('labelFormSubtitle')||'',mediaTitle:fd.get('labelMediaTitle')||'',summaryTitle:fd.get('labelSummaryTitle')||'',step1:fd.get('labelStep1')||'',step2:fd.get('labelStep2')||'',step3:fd.get('labelStep3')||'',step4:fd.get('labelStep4')||'',step5:fd.get('labelStep5')||''},

      colors:{primary:fd.get('colorPrimary')||'#2f2116',accent:fd.get('colorAccent')||'#9a7547',background:fd.get('colorBackground')||'#fbfaf8',text:fd.get('colorText')||'#172033',muted:fd.get('colorMuted')||'#756f68',headerBackground:fd.get('colorHeaderBackground')||'#ffffff',cardBackground:fd.get('colorCardBackground')||'#ffffff',border:fd.get('colorBorder')||'#e9e2da',buttonText:fd.get('colorButtonText')||'#ffffff'},

      footer:{
        brandText:fd.get('footerBrandText')||'SALVATEX CORTINAS',
        description:fd.get('footerDescription')||'',
        whatsapp:fd.get('footerWhatsapp')||'',
        copyright:fd.get('footerCopyright')||''
      }
    };

    const btn=form.querySelector('.layout-editor-savebar .primary-btn');
    const old=btn.textContent;

    try{
      btn.disabled=true;
      btn.textContent='Publicando...';

      const saved=
        await api('layout',{
          method:'PUT',
          body:JSON.stringify({
            layout
          })
        });

      if(
        !saved?.ok ||
        !saved?.layout
      ){
        throw new Error(
          saved?.message ||
          'O servidor não confirmou o salvamento do layout.'
        );
      }

      toast('Layout publicado com sucesso');

      /*
        Recarrega o layout salvo no D1 para confirmar
        que a alteração realmente persistiu.
      */
      const check=
        await api(
          'layout?ts=' +
          Date.now()
        );

      if(
        !check?.ok ||
        !check?.layout
      ){
        throw new Error(
          'O layout foi enviado, mas não foi possível confirmar a gravação no D1.'
        );
      }

      /*
        Confirma visualmente de onde o layout foi lido.
        Se houver qualquer problema futuro, o painel não diz
        "salvo" sem antes receber a mesma configuração do D1.
      */
      console.info(
        'Layout confirmado no D1:',
        check.source ||
        'layout_config',
        check.updatedAt ||
        ''
      );
    }catch(err){
      alert(err.message);
    }finally{
      btn.disabled=false;
      btn.textContent=old;
    }
  };
}

async function renderSettings(){
  const d=await api('config'),cfg=d.config||{};
  $('#view-content').innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Configurações gerais</h2><p style="color:var(--muted);font-size:10px">Dados comerciais da loja. As regras dos produtos sob medida ficam em Configuradores.</p></div></div><form id="settings-form"><div class="form-grid"><div class="form-field"><label>WhatsApp</label><input name="whatsapp" value="${esc(cfg.whatsapp||'')}"></div><div class="form-field"><label>Parcelas sem juros</label><input type="number" min="1" name="parcelas" value="${Number(cfg.parcelas||10)}"></div><div class="form-field"><label>Frete grátis mínimo (R$)</label><input type="number" step="0.01" name="frete" value="${Number(cfg.freteGratisMinimo||500)}"></div><div class="form-field"><label>Prazo de produção</label><input name="producao" value="${esc(cfg.producao||'5 a 10 dias úteis')}"></div><div class="form-field full"><label>Prazo de entrega</label><input name="entrega" value="${esc(cfg.entrega||'6 a 12 dias úteis após o envio')}"></div></div><div class="form-actions"><button class="primary-btn">Salvar configurações</button></div></form></section>`;
  $('#settings-form').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await api('config',{method:'PUT',body:JSON.stringify({config:{whatsapp:fd.get('whatsapp'),parcelas:Number(fd.get('parcelas')||10),freteGratisMinimo:Number(fd.get('frete')||0),producao:fd.get('producao'),entrega:fd.get('entrega')}})});toast('Configurações gerais salvas')}
}
async function renderIntegrations(){
  let health='Conectado',r2='A configurar';try{const x=await fetch('/api/health').then(r=>r.json());health=x.database?'Conectado':'Falha'}catch{health='Falha'}try{const x=await api('media/upload');r2=x.configured?'Conectado':'A configurar'}catch{}
  const d=await api('marketing');const c=d.config||{},meta=c.meta||{},g=c.google||{},ev=c.events||{},conn=c.connections||{},env=d.environment||{};
  $('#view-content').innerHTML=`<div class="integration-grid"><div class="integration-card"><h3>Cloudflare D1</h3><p>Banco de dados da loja.</p><span class="integration-status">${health}</span></div><div class="integration-card"><h3>Cloudflare R2</h3><p>Imagens, vídeos e notas fiscais.</p><span class="integration-status">${r2}</span></div><div class="integration-card"><h3>Meta — Facebook e Instagram</h3><p>Pixel + conexão OAuth da conta.</p><span class="integration-status">${conn.meta?.connected?'Conectado: '+esc(conn.meta.name||conn.meta.id):'Não conectado'}</span><button id="connect-meta" class="ghost-btn" style="margin-top:10px">Conectar conta Meta</button></div><div class="integration-card"><h3>Google Ads</h3><p>Google Tag, Ads e conexão OAuth.</p><span class="integration-status">${conn.googleAds?.connected?'Conectado: '+esc(conn.googleAds.email||conn.googleAds.name):'Não conectado'}</span><button id="connect-google" class="ghost-btn" style="margin-top:10px">Conectar conta Google Ads</button></div></div>
  <form id="marketing-form" class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>Marketing e rastreamento</h2><p>Configure tags e conversões sem editar o código.</p></div><button class="primary-btn">Salvar integrações</button></div><div class="form-grid">
  <div class="form-field"><label><input type="checkbox" name="metaEnabled" ${meta.enabled?'checked':''}> Ativar Meta Pixel</label></div><div class="form-field"><label>Meta Pixel ID</label><input name="pixelId" value="${esc(meta.pixelId||'')}"></div><div class="form-field"><label><input type="checkbox" name="capiEnabled" ${meta.capiEnabled?'checked':''}> Ativar Conversions API</label><small class="field-hint">Token seguro: META_CAPI_ACCESS_TOKEN no Cloudflare.</small></div><div class="form-field"><label>Meta Graph version</label><input name="graphVersion" value="${esc(meta.graphVersion||'v24.0')}"></div><div class="form-field"><label>Test Event Code</label><input name="testEventCode" value="${esc(meta.testEventCode||'')}"></div>
  <div class="form-field"><label><input type="checkbox" name="googleEnabled" ${g.enabled?'checked':''}> Ativar Google</label></div><div class="form-field"><label>Google Tag ID (GT-/G-/AW-)</label><input name="tagId" value="${esc(g.tagId||'')}"></div><div class="form-field"><label>GA4 ID</label><input name="ga4Id" value="${esc(g.ga4Id||'')}"></div><div class="form-field"><label>Google Ads ID</label><input name="adsId" value="${esc(g.adsId||'')}"></div><div class="form-field"><label>Conversion Label</label><input name="adsConversionLabel" value="${esc(g.adsConversionLabel||'')}"></div><div class="form-field"><label>Google Tag Manager</label><input name="gtmId" value="${esc(g.gtmId||'')}"></div><div class="form-field"><label>Merchant Center ID</label><input name="merchantCenterId" value="${esc(g.merchantCenterId||'')}"></div><div class="form-field"><label>Feed Google Shopping</label><input value="${location.origin}/api/merchant-feed.xml" readonly><small class="field-hint">Use esta URL como fonte de dados no Merchant Center.</small></div><div class="form-field full"><label>Google OAuth Client ID — login dos clientes</label><input name="clientId" value="${esc(g.clientId||'')}"><small class="field-hint">No servidor, configure também GOOGLE_OAUTH_CLIENT_ID e CUSTOMER_SESSION_SECRET.</small></div>
  <div class="form-field full"><label>Eventos automáticos</label><div class="cfg-color-stock-list">${[['pageView','PageView'],['viewContent','Visualização'],['addToCart','Adicionar ao carrinho'],['beginCheckout','Iniciar checkout'],['purchase','Compra'],['whatsappLead','Cotação WhatsApp']].map(([k,l])=>`<label class="cfg-color-stock-item"><input type="checkbox" name="event_${k}" ${ev[k]!==false?'checked':''}><span>${l}</span></label>`).join('')}</div></div></div><div class="integration-env"><b>Ambiente:</b> Meta App ${env.metaAppConfigured?'✓':'—'} · Google OAuth ${env.googleOAuthConfigured?'✓':'—'} · Meta CAPI token ${env.metaCapiSecretConfigured?'✓':'—'} · Sessão cliente ${env.customerSessionConfigured?'✓':'—'}</div></form>`;
  const f=$('#marketing-form');f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f);const body={config:{meta:{enabled:fd.get('metaEnabled')==='on',pixelId:fd.get('pixelId'),capiEnabled:fd.get('capiEnabled')==='on',graphVersion:fd.get('graphVersion'),testEventCode:fd.get('testEventCode')},google:{enabled:fd.get('googleEnabled')==='on',tagId:fd.get('tagId'),ga4Id:fd.get('ga4Id'),adsId:fd.get('adsId'),adsConversionLabel:fd.get('adsConversionLabel'),gtmId:fd.get('gtmId'),merchantCenterId:fd.get('merchantCenterId'),clientId:fd.get('clientId')},events:Object.fromEntries(['pageView','viewContent','addToCart','beginCheckout','purchase','whatsappLead'].map(k=>[k,fd.get('event_'+k)==='on']))}};await api('marketing',{method:'PUT',body:JSON.stringify(body)});toast('Integrações salvas');navigate('integrations',true)};
  $('#connect-meta').onclick=async()=>{try{const d=await api('oauth/meta/start');location.href=d.url}catch(e){alert(e.message)}};$('#connect-google').onclick=async()=>{try{const d=await api('oauth/google/start');location.href=d.url}catch(e){alert(e.message)}};
}
async function renderBilling(){const d=await api('billing');$('#view-content').innerHTML=`<div class="billing-hero"><section class="panel"><small>Faturamento considerado · ${esc(d.referenceMonth)}</small><div class="billing-big">${brlCents(d.grossSalesCents)}</div><p style="color:var(--muted);font-size:11px">Vendas não canceladas registradas no site.</p></section><section class="panel"><small>Mensalidade da plataforma</small><div class="billing-big">${brlCents(d.amountDueCents)}</div><p style="color:var(--muted);font-size:11px">Maior entre ${(d.feePercent*100).toFixed(2).replace('.',',')}% do faturamento (${brlCents(d.calculatedFeeCents)}) e mínimo de ${brlCents(d.minimumFeeCents)}.</p></section></div><section class="panel" style="margin-top:16px"><div class="panel-head"><h2>Cobrança</h2></div><p style="font-size:12px">A estrutura está pronta para gerar cobrança mensal por <b>PIX ou boleto</b> quando o gateway da plataforma for conectado.</p></section>`}
async function renderLogs(){const d=await api('logs');$('#view-content').innerHTML=`<section class="panel"><table class="admin-table"><thead><tr><th>Data</th><th>Ação</th><th>Entidade</th><th>ID</th></tr></thead><tbody>${d.logs.map(x=>`<tr><td>${dateTime(x.created_at)}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type||'—')}</td><td>${esc(x.entity_id||'—')}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Nenhum log administrativo.</td></tr>'}</tbody></table></section>`}
function openModal(html){$('#modal-content').innerHTML=html;$('#admin-modal').hidden=false;$$('[data-close-modal]',$('#admin-modal')).forEach(x=>x.onclick=closeModal)}function closeModal(){$('#admin-modal').hidden=true;$('#modal-content').innerHTML=''}
if(ADMIN.csrf){api('session').then(()=>{$('#admin-login').style.display='none';$('#admin-app').hidden=false;navigate(location.hash.slice(1)||'dashboard')}).catch(()=>{})}


/* ==========================================================
   CONFIGURADORES V2 — WAVE, PREGA MACHO, VARÃO E PERSIANA
   Mídia pronta para Cloudflare R2 (binding MEDIA)
   ========================================================== */
const CONFIGURATOR_TYPES=[
  {id:'wave',nome:'Cortina Wave',icon:'〰',tipo:'cortina'},
  {id:'prega-macho',nome:'Cortina Prega Macho',icon:'▥',tipo:'cortina'},
  {id:'cortina-varao',nome:'Cortina de Ilhós',icon:'━',tipo:'cortina'},
  {id:'persiana',nome:'Persiana sob medida',icon:'▤',tipo:'persiana'}
];
let ACTIVE_CONFIGURATOR_ID='wave';

function cfgEndpoint(id){return 'configurators/'+id}
function normalizeConfiguratorResponse(d,id){return d?.configurator||d?.wave||{id,nome:CONFIGURATOR_TYPES.find(x=>x.id===id)?.nome||id,ativo:false,tecidos:{},trilhos:{},midia:[]}}
function cfgForroRow(nome='',preco='',descricao=''){return `<div class="configurator-inline-row cfg-forro-row"><input class="cfg-forro-nome" placeholder="Nome do forro/opção" value="${esc(nome)}"><input class="cfg-forro-preco" type="number" step="0.01" placeholder="Preço" value="${Number(preco||0)}"><input class="cfg-forro-desc" placeholder="Descrição exibida no site" value="${esc(descricao||'')}"><button type="button" class="danger-link remove-cfg-forro">×</button></div>`}
function cfgTecidoCard(nome,t={},modo='metro_tecido'){
  const descr=t.forroDescricoes||{};
  const cores=Array.isArray(t.cores)?t.cores:[];
  return `<div class="configurator-subcard cfg-tecido-card"><div class="configurator-card-head"><div class="form-field"><label>Nome do tecido/material</label><input class="cfg-tecido-nome" value="${esc(nome)}"></div><button type="button" class="danger-link remove-cfg-tecido">Remover</button></div><div class="form-grid"><div class="form-field full"><label>Descrição do tecido</label><input class="cfg-tecido-desc" value="${esc(t.descricao||'')}" placeholder="Ex.: leve, moderno e com trama aparente"></div><div class="form-field full"><label>Cores (separe por vírgula)</label><input class="cfg-tecido-cores" value="${esc(cores.join(', '))}"></div>${modo==='area'?`<div class="form-field"><label>Preço base por m² (R$)</label><input class="cfg-tecido-base" type="number" step="0.01" value="${Number(t.precoBase||0)}"></div>`:''}</div><div class="color-stock-wrap"><div class="color-stock-title">Disponibilidade das cores</div><div class="cfg-color-stock-list">${colorStockHtml(cores,t.coresAtivas||{})||'<small>Salve após adicionar cores para gerenciar a disponibilidade.</small>'}</div></div>${modo==='area'?'<p class="field-hint">Para persianas, o preço base é por m². Use as opções abaixo apenas se houver complementos/acabamentos.</p>':'<p class="field-hint">Preços abaixo são por metro de tecido, mantendo a regra atual das cortinas.</p>'}<div class="cfg-forros">${Object.entries(t.forros||{}).map(([f,p])=>cfgForroRow(f,p,descr[f]||'')).join('')}</div><button type="button" class="ghost-btn add-cfg-forro">+ Adicionar forro/opção</button></div>`
}
function cfgTrilhoRow(nome='',x={}){return `<div class="configurator-subcard cfg-trilho-row"><div class="configurator-card-head"><strong>Trilho / varão / acabamento</strong><button type="button" class="danger-link remove-cfg-trilho">Remover</button></div><div class="form-grid"><div class="form-field"><label>Nome</label><input class="cfg-trilho-nome" value="${esc(nome)}"></div><div class="form-field"><label>R$/metro</label><input class="cfg-trilho-metro" type="number" step="0.01" value="${Number(x.valorMetro||0)}"></div><div class="form-field"><label>Valor mínimo</label><input class="cfg-trilho-minimo" type="number" step="0.01" value="${Number(x.minimo||0)}"></div><div class="form-field full"><label>Descrição</label><input class="cfg-trilho-desc" value="${esc(x.descricao||'')}" placeholder="Descrição exibida no site"></div></div></div>`}
function cfgMidiaRow(m={}){const imgs=Array.isArray(m.imagens)?m.imagens:[];return `<div class="configurator-subcard cfg-midia-row"><div class="configurator-card-head"><strong>Galeria por combinação</strong><button type="button" class="danger-link remove-cfg-midia">Remover</button></div><div class="form-grid"><div class="form-field"><label>Tecido/material</label><input class="cfg-midia-tecido" value="${esc(m.tecido||'')}"></div><div class="form-field"><label>Cor</label><input class="cfg-midia-cor" value="${esc(m.cor||'')}"></div><div class="form-field"><label>Forro/opção</label><input class="cfg-midia-forro" value="${esc(m.forro||'')}"></div></div><div class="media-upload-grid"><div class="media-upload-box"><strong>Imagem de capa</strong><input class="cfg-midia-capa" type="hidden" value="${esc(m.capa||'')}"><div class="media-preview cfg-capa-preview">${m.capa?`<img src="${esc(m.capa)}">`:'<span>Sem capa</span>'}</div><label class="upload-btn">Enviar imagem<input type="file" class="cfg-upload-capa" accept="image/*"></label></div><div class="media-upload-box"><strong>Fotos da galeria</strong><input class="cfg-midia-imagens" type="hidden" value="${esc(imgs.join('\n'))}"><div class="media-thumbs cfg-galeria-preview">${imgs.map(u=>`<img src="${esc(u)}">`).join('')||'<span>Sem fotos</span>'}</div><label class="upload-btn">Adicionar fotos<input type="file" class="cfg-upload-galeria" accept="image/*" multiple></label></div><div class="media-upload-box"><strong>Vídeo</strong><input class="cfg-midia-video" type="hidden" value="${esc(m.video||'')}"><div class="media-preview cfg-video-preview">${m.video?`<video src="${esc(m.video)}" controls muted></video>`:'<span>Sem vídeo</span>'}</div><label class="upload-btn">Enviar vídeo<input type="file" class="cfg-upload-video" accept="video/*"></label></div></div><small class="upload-status"></small></div>`}

async function uploadAdminMedia(file,meta={}){
  const fd=
    new FormData();

  fd.append(
    'file',
    file
  );

  fd.append(
    'configurator',
    meta.configurator ||
    ACTIVE_CONFIGURATOR_ID ||
    'geral'
  );

  fd.append(
    'tecido',
    meta.tecido ||
    ''
  );

  fd.append(
    'cor',
    meta.cor ||
    ''
  );

  fd.append(
    'forro',
    meta.forro ||
    ''
  );

  const r=
    await fetch(
      '/admin/api/media/upload',
      {
        method:
          'POST',

        credentials:'same-origin',
        headers:{'x-csrf-token':ADMIN.csrf},

        body:
          fd
      }
    );

  let d={};

  try{
    d=await r.json();
  }catch{}

  if(!r.ok){
    throw new Error(
      d.message ||
      'Falha no upload'
    );
  }

  return d;
}
function bindCfgRows(){
  bindColorStockToggles(document);
  $$('.remove-cfg-tecido').forEach(b=>b.onclick=()=>b.closest('.cfg-tecido-card').remove());
  $$('.add-cfg-forro').forEach(b=>b.onclick=()=>{const box=b.closest('.cfg-tecido-card').querySelector('.cfg-forros');box.insertAdjacentHTML('beforeend',cfgForroRow());bindCfgRows()});
  $$('.remove-cfg-forro').forEach(b=>b.onclick=()=>b.closest('.cfg-forro-row').remove());
  $$('.remove-cfg-trilho').forEach(b=>b.onclick=()=>b.closest('.cfg-trilho-row').remove());
  $$('.remove-cfg-midia').forEach(b=>b.onclick=()=>b.closest('.cfg-midia-row').remove());
  $$('.cfg-upload-capa').forEach(inp=>inp.onchange=async()=>{if(!inp.files?.[0])return;const row=inp.closest('.cfg-midia-row'),st=$('.upload-status',row);try{st.textContent='Enviando capa...';const d=await uploadAdminMedia(inp.files[0],{
      configurator:ACTIVE_CONFIGURATOR_ID,
      tecido:$('.cfg-midia-tecido',row).value.trim(),
      cor:$('.cfg-midia-cor',row).value.trim(),
      forro:$('.cfg-midia-forro',row).value.trim()
    });$('.cfg-midia-capa',row).value=d.url;$('.cfg-capa-preview',row).innerHTML=`<img src="${esc(d.url)}">`;st.textContent='Capa enviada.'}catch(e){st.textContent=e.message;alert(e.message)}});
  $$('.cfg-upload-galeria').forEach(inp=>inp.onchange=async()=>{if(!inp.files?.length)return;const row=inp.closest('.cfg-midia-row'),st=$('.upload-status',row),hidden=$('.cfg-midia-imagens',row);let urls=hidden.value.split('\n').map(x=>x.trim()).filter(Boolean);try{for(const f of inp.files){st.textContent=`Enviando ${f.name}...`;const d=await uploadAdminMedia(f,{
      configurator:ACTIVE_CONFIGURATOR_ID,
      tecido:$('.cfg-midia-tecido',row).value.trim(),
      cor:$('.cfg-midia-cor',row).value.trim(),
      forro:$('.cfg-midia-forro',row).value.trim()
    });urls.push(d.url)}hidden.value=urls.join('\n');$('.cfg-galeria-preview',row).innerHTML=urls.map(u=>`<img src="${esc(u)}">`).join('');st.textContent='Galeria atualizada.'}catch(e){st.textContent=e.message;alert(e.message)}});
  $$('.cfg-upload-video').forEach(inp=>inp.onchange=async()=>{if(!inp.files?.[0])return;const row=inp.closest('.cfg-midia-row'),st=$('.upload-status',row);try{st.textContent='Enviando vídeo...';const d=await uploadAdminMedia(inp.files[0],{
      configurator:ACTIVE_CONFIGURATOR_ID,
      tecido:$('.cfg-midia-tecido',row).value.trim(),
      cor:$('.cfg-midia-cor',row).value.trim(),
      forro:$('.cfg-midia-forro',row).value.trim()
    });$('.cfg-midia-video',row).value=d.url;$('.cfg-video-preview',row).innerHTML=`<video src="${esc(d.url)}" controls muted></video>`;st.textContent='Vídeo enviado.'}catch(e){st.textContent=e.message;alert(e.message)}});
}
function collectConfigurator(form,base,id){
  const fd=new FormData(form),modo=fd.get('modoCalculo')||'metro_tecido',tecidos={},trilhos={},midia=[];
  $$('.cfg-tecido-card',form).forEach(card=>{const nome=$('.cfg-tecido-nome',card).value.trim();if(!nome)return;const forros={},forroDescricoes={};$$('.cfg-forro-row',card).forEach(r=>{const f=$('.cfg-forro-nome',r).value.trim();if(f){forros[f]=Number($('.cfg-forro-preco',r).value||0);forroDescricoes[f]=$('.cfg-forro-desc',r).value.trim()}});const cores=$('.cfg-tecido-cores',card).value.split(',').map(x=>x.trim()).filter(Boolean);tecidos[nome]={ativo:true,descricao:$('.cfg-tecido-desc',card).value.trim(),cores,coresAtivas:collectColorStock(card,cores),forros,forroDescricoes,precoBase:Number($('.cfg-tecido-base',card)?.value||0)}});
  $$('.cfg-trilho-row',form).forEach(r=>{const nome=$('.cfg-trilho-nome',r).value.trim();if(nome)trilhos[nome]={valorMetro:Number($('.cfg-trilho-metro',r).value||0),minimo:Number($('.cfg-trilho-minimo',r).value||0),descricao:$('.cfg-trilho-desc',r).value.trim()}});
  cfgSyncMediaStateFromDom();
  CONFIG_MEDIA_STATE.forEach(item=>{
    const x=cfgCloneMediaItem(item);
    if(x.tecido||x.cor||x.forro||x.capa||x.video||x.imagens.length){
      x.modelo=fd.get('modelo')||base.modelo||x.modelo||'';
      midia.push(x);
    }
  });
  const faixas=[0,1,2,3].map(i=>({ate:Number(fd.get(`faixa${i+1}Ate`)||0),tamanho:Number(fd.get(`faixa${i+1}Barra`)||0)})).filter(x=>x.ate>0&&x.tamanho>0);
  const persiana={...(base.persiana||{}),areaMinima:Number(fd.get('areaMinima')||base.persiana?.areaMinima||0.6),ladosComando:String(fd.get('ladosComando')||'').split(',').map(x=>x.trim()).filter(Boolean),voltagens:String(fd.get('voltagens')||'').split(',').map(x=>x.trim()).filter(Boolean),acionamentos:String(fd.get('acionamentos')||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const [nome,adicional,descricao]=l.split('|').map(x=>x.trim());return {nome,adicional:Number(adicional||0),descricao:descricao||''}})};
  return {...base,id,nome:fd.get('nome'),modelo:fd.get('modelo'),descricao:fd.get('descricao'),ativo:fd.get('ativo')==='on',tipo:id==='persiana'?'persiana':'cortina',modoCalculo:modo,medidas:{larguraMinima:Number(fd.get('larguraMinima')||.5),larguraMaxima:Number(fd.get('larguraMaxima')||12),alturaMinima:Number(fd.get('alturaMinima')||.5),alturaEntradaMaxima:Number(fd.get('alturaEntradaMaxima')||5),calculoMaximo:Number(fd.get('calculoMaximo')||3.2),inicioAcrescimo:Number(fd.get('inicioAcrescimo')||999),acrescimoPercentual:Number(fd.get('acrescimoPercentual')||0),acimaMaximo:{modo:'consulta',texto:fd.get('textoAcimaMaximo'),textoBotao:fd.get('textoBotaoAcimaMaximo'),permitirCarrinho:fd.get('permitirCarrinho')==='on'}},barra:{faixas,acimaInicio:Number(fd.get('barraAcimaInicio')||20)},franzimentos:base.franzimentos||[],tecidos,trilhos,persiana,midia};
}

let CONFIG_MEDIA_STATE=[];
let CONFIG_CURRENT_DATA=null;

function cfgMediaKey(tecido,cor,forro){
  return [
    String(tecido||'').trim(),
    String(cor||'').trim(),
    String(forro||'').trim()
  ].join('|||');
}

function cfgCloneMediaItem(item={}){
  return {
    tecido:String(item.tecido||''),
    modelo:String(item.modelo||''),
    cor:String(item.cor||''),
    forro:String(item.forro||''),
    capa:String(item.capa||''),
    imagens:Array.isArray(item.imagens)?[...item.imagens]:[],
    video:String(item.video||'')
  };
}

function cfgInitMediaState(cfg){
  CONFIG_MEDIA_STATE=
    (Array.isArray(cfg?.midia)?cfg.midia:[])
      .map(cfgCloneMediaItem);
}

function cfgFindMedia(tecido,cor,forro,modelo=''){
  const key=cfgMediaKey(tecido,cor,forro);
  let item=CONFIG_MEDIA_STATE.find(x=>cfgMediaKey(x.tecido,x.cor,x.forro)===key);

  if(!item){
    item={
      tecido,
      modelo,
      cor,
      forro,
      capa:'',
      imagens:[],
      video:''
    };
    CONFIG_MEDIA_STATE.push(item);
  }

  return item;
}

function cfgSyncMediaStateFromDom(){
  $$('.cfg-option-media-card').forEach(card=>{
    const item=cfgFindMedia(
      card.dataset.tecido||'',
      card.dataset.cor||'',
      card.dataset.forro||'',
      card.dataset.modelo||''
    );

    item.capa=
      $('.cfg-tab-capa',card)?.value.trim()||'';

    item.imagens=
      String($('.cfg-tab-imagens',card)?.value||'')
        .split('\n')
        .map(x=>x.trim())
        .filter(Boolean);

    item.video=
      $('.cfg-tab-video',card)?.value.trim()||'';
  });
}

function cfgForroOptionsFromForm(form){
  const names=new Set();

  $$('.cfg-tecido-card',form).forEach(card=>{
    $$('.cfg-forro-nome',card).forEach(inp=>{
      const nome=inp.value.trim();
      if(nome)names.add(nome);
    });
  });

  return [...names];
}

function cfgCurrentTissuesFromForm(form){
  const list=[];

  $$('.cfg-tecido-card',form).forEach(card=>{
    const nome=$('.cfg-tecido-nome',card)?.value.trim();
    if(!nome)return;

    const cores=
      String($('.cfg-tecido-cores',card)?.value||'')
        .split(',')
        .map(x=>x.trim())
        .filter(Boolean);

    const forros=
      $$('.cfg-forro-nome',card)
        .map(x=>x.value.trim())
        .filter(Boolean);

    const estoque={};
    $$('.cfg-cor-estoque',card).forEach(inp=>{
      estoque[String(inp.dataset.cor||'').trim()]=Boolean(inp.checked);
    });

    cores.forEach(cor=>{
      if(!(cor in estoque))estoque[cor]=true;
    });

    list.push({
      nome,
      cores,
      forros,
      estoque,
      card
    });
  });

  return list;
}

function cfgOptionCardHtml(tecido,cor,forro,modelo,media,comEstoque){
  const imgs=Array.isArray(media.imagens)?media.imagens:[];

  return `<div class="cfg-option-media-card" data-tecido="${esc(tecido)}" data-cor="${esc(cor)}" data-forro="${esc(forro)}" data-modelo="${esc(modelo||'')}">
    <div class="cfg-option-card-head">
      <div>
        <strong>${esc(tecido)} · ${esc(cor)}</strong>
        <small>${esc(forro)}</small>
      </div>

      <label class="cfg-option-stock ${comEstoque?'':'is-out'}">
        <input type="checkbox" class="cfg-tab-stock" ${comEstoque?'checked':''}>
        <span>${comEstoque?'Com estoque':'Sem estoque'}</span>
      </label>
    </div>

    <div class="cfg-option-media-grid">
      <div class="media-upload-box">
        <strong>Imagem de capa do card</strong>
        <p class="cfg-media-help">Usada somente no card da cor. Não entra no carrossel.</p>
        <input type="hidden" class="cfg-tab-capa" value="${esc(media.capa||'')}">
        <div class="media-preview cfg-tab-capa-preview">
          ${media.capa?`<img src="${esc(media.capa)}">`:'<span>Sem capa</span>'}
        </div>
        <label class="upload-btn">Enviar capa
          <input type="file" class="cfg-tab-upload-capa" accept="image/jpeg,image/png,image/webp,image/gif">
        </label>
      </div>

      <div class="media-upload-box">
        <strong>Fotos da galeria</strong>
        <p class="cfg-media-help">Estas fotos aparecem no carrossel do produto.</p>
        <textarea class="cfg-tab-imagens" hidden>${esc(imgs.join('\n'))}</textarea>
        <div class="media-thumbs cfg-tab-galeria-preview">
          ${imgs.map(u=>`<img src="${esc(u)}">`).join('')||'<span>Sem fotos</span>'}
        </div>
        <label class="upload-btn">Adicionar fotos
          <input type="file" class="cfg-tab-upload-galeria" accept="image/jpeg,image/png,image/webp,image/gif" multiple>
        </label>
      </div>

      <div class="media-upload-box">
        <strong>Vídeo</strong>
        <p class="cfg-media-help">Vídeo opcional desta combinação.</p>
        <input type="hidden" class="cfg-tab-video" value="${esc(media.video||'')}">
        <div class="media-preview cfg-tab-video-preview">
          ${media.video?`<video src="${esc(media.video)}" controls muted></video>`:'<span>Sem vídeo</span>'}
        </div>
        <label class="upload-btn">Enviar vídeo
          <input type="file" class="cfg-tab-upload-video" accept="video/mp4,video/webm,video/quicktime">
        </label>
      </div>
    </div>

    <small class="upload-status"></small>
  </div>`;
}

function cfgBuildOptionPages(form,cfg,activeTab='geral'){
  cfgSyncMediaStateFromDom();

  const nav=$('#cfg-option-nav');
  const pages=$('#cfg-option-pages');

  if(!nav||!pages)return;

  const options=cfgForroOptionsFromForm(form);
  const tissues=cfgCurrentTissuesFromForm(form);
  const modelo=String(form.elements.modelo?.value||cfg.modelo||cfg.nome||'');

  const temTrilhos=
    Boolean(
      $('#cfg-trilhos-section',form)
    );

  const validTabs=
    new Set([
      'geral',
      ...(temTrilhos?['trilhos-varoes']:[]),
      ...options
    ]);

  if(!validTabs.has(activeTab))activeTab='geral';

  nav.innerHTML=`
    <button type="button" class="cfg-option-tab ${activeTab==='geral'?'active':''}" data-option-tab="geral">
      <span>Geral</span>
    </button>

    ${
      temTrilhos
        ? `<button type="button"
                   class="cfg-option-tab ${activeTab==='trilhos-varoes'?'active':''}"
                   data-option-tab="trilhos-varoes">
             <span>Trilhos e varões</span>
           </button>`
        : ''
    }

    ${options.map(op=>`
      <div class="cfg-option-tab-row ${activeTab===op?'active':''}" data-option-row="${esc(op)}">
        <button type="button"
                class="cfg-option-tab ${activeTab===op?'active':''}"
                data-option-tab="${esc(op)}">
          <span>${esc(op)}</span>
        </button>

        <button type="button"
                class="cfg-option-delete"
                data-delete-option="${esc(op)}"
                title="Excluir esta página/opção">
          ×
        </button>
      </div>
    `).join('')}
  `;

  pages.innerHTML=`
    <div class="cfg-option-page ${activeTab==='geral'?'active':''}" data-option-page="geral">
      <div id="cfg-general-host"></div>
    </div>

    ${
      temTrilhos
        ? `<div class="cfg-option-page ${activeTab==='trilhos-varoes'?'active':''}" data-option-page="trilhos-varoes">
             <section class="panel cfg-option-panel">
               <div class="panel-head">
                 <div>
                   <h2>Trilhos e varões</h2>
                   <p>Todos os trilhos, varões, valores e acabamentos deste configurador.</p>
                 </div>
               </div>
               <div id="cfg-trilhos-host"></div>
             </section>
           </div>`
        : ''
    }

    ${options.map(op=>{
      const cards=[];

      tissues.forEach(t=>{
        if(!t.forros.includes(op))return;

        t.cores.forEach(cor=>{
          const media=cfgFindMedia(t.nome,cor,op,modelo);
          cards.push(
            cfgOptionCardHtml(
              t.nome,
              cor,
              op,
              modelo,
              media,
              t.estoque[cor]!==false
            )
          );
        });
      });

      return `<div class="cfg-option-page ${activeTab===op?'active':''}" data-option-page="${esc(op)}">
        <section class="panel cfg-option-panel">
          <div class="panel-head">
            <div>
              <h2>${esc(op)}</h2>
              <p>Cores, estoque, capa, galeria e vídeo desta opção.</p>
            </div>
          </div>
          <div class="cfg-option-cards">
            ${cards.join('')||'<div class="empty">Nenhuma cor cadastrada para esta opção.</div>'}
          </div>
        </section>
      </div>`;
    }).join('')}
  `;

  bindCfgOptionTabs(form,cfg);
  bindCfgOptionMedia(form,cfg);
}

function cfgMoveGeneralContent(form){
  const host=$('#cfg-general-host');
  const source=$('#cfg-general-source');

  if(host&&source){
    host.appendChild(source);
  }

  const trilhosSection=
    $('#cfg-trilhos-section',form);

  const trilhosHost=
    $('#cfg-trilhos-host',form);

  if(
    trilhosSection &&
    trilhosHost
  ){
    trilhosHost.appendChild(
      trilhosSection
    );
  }
}

function bindCfgOptionTabs(form,cfg){
  $$('.cfg-option-tab',form).forEach(btn=>{
    btn.onclick=()=>{
      cfgSyncMediaStateFromDom();

      const tab=btn.dataset.optionTab||'geral';

      $$('.cfg-option-tab',form).forEach(x=>
        x.classList.toggle('active',x===btn)
      );

      $$('.cfg-option-tab-row',form).forEach(row=>
        row.classList.toggle(
          'active',
          row.dataset.optionRow===tab
        )
      );

      $$('.cfg-option-page',form).forEach(page=>
        page.classList.toggle(
          'active',
          page.dataset.optionPage===tab
        )
      );
    };
  });

  $$('.cfg-option-delete',form).forEach(btn=>{
    btn.onclick=async e=>{
      e.stopPropagation();

      const opcao=
        String(
          btn.dataset.deleteOption||''
        ).trim();

      if(!opcao)return;

      const ok=
        confirm(
          `Excluir a página "${opcao}"?\n\n` +
          `Isso removerá esta opção de todos os tecidos do configurador.\n` +
          `As mídias vinculadas a esta opção também deixarão de fazer parte do configurador.`
        );

      if(!ok)return;

      cfgDeleteOptionGlobally(
        form,
        opcao
      );

      cfgRefreshOptionPages(
        form,
        cfg,
        false
      );

      try{
        await cfgSaveCurrent(
          form,
          cfg,
          ACTIVE_CONFIGURATOR_ID,
          false
        );

        toast(
          `Opção "${opcao}" excluída`
        );
      }catch(err){
        alert(
          'A opção foi removida da tela, mas não foi possível salvar.\n\n' +
          err.message
        );
      }
    };
  });
}


function cfgRenameOptionGlobally(form,oldName,newName,originInput=null){
  oldName=
    String(
      oldName||''
    ).trim();

  newName=
    String(
      newName||''
    ).trim();

  if(
    !oldName ||
    !newName ||
    oldName===newName
  ){
    return;
  }

  /*
    A página de forro/opção é GLOBAL no configurador.
    Alterar o nome em um tecido altera a mesma opção
    nos demais tecidos que ainda usam o nome antigo.
  */
  $$('.cfg-forro-nome',form).forEach(inp=>{
    if(
      inp!==originInput &&
      inp.value.trim()===oldName
    ){
      inp.value=newName;
      inp.dataset.originalOption=newName;
    }
  });

  CONFIG_MEDIA_STATE.forEach(item=>{
    if(
      String(
        item.forro||''
      ).trim()===oldName
    ){
      item.forro=newName;
    }
  });

  if(originInput){
    originInput.dataset.originalOption=newName;
  }
}

function cfgDeleteOptionGlobally(form,optionName){
  optionName=
    String(
      optionName||''
    ).trim();

  if(!optionName)return;

  $$('.cfg-forro-row',form).forEach(row=>{
    const inp=
      $('.cfg-forro-nome',row);

    if(
      inp &&
      inp.value.trim()===optionName
    ){
      row.remove();
    }
  });

  /*
    Removemos do configurador as referências de mídia
    desta opção. Os arquivos físicos continuam no R2;
    portanto não há exclusão destrutiva do arquivo.
  */
  CONFIG_MEDIA_STATE=
    CONFIG_MEDIA_STATE.filter(
      item=>
        String(
          item.forro||''
        ).trim()!==optionName
    );
}

function cfgPrepareOptionInputs(form){
  $$('.cfg-forro-nome',form).forEach(inp=>{
    if(
      !inp.dataset.originalOption
    ){
      inp.dataset.originalOption=
        inp.value.trim();
    }
  });
}

function cfgFindUnderlyingStock(form,tecido,cor){
  const card=
    $$('.cfg-tecido-card',form)
      .find(c=>
        $('.cfg-tecido-nome',c)?.value.trim()===tecido
      );

  if(!card)return null;

  return $$('.cfg-cor-estoque',card)
    .find(inp=>
      String(inp.dataset.cor||'').trim()===cor
    ) || null;
}

async function cfgSaveCurrent(form,cfg,id,showToast=false){
  cfgSyncMediaStateFromDom();

  const data=
    collectConfigurator(
      form,
      cfg,
      id
    );

  data.midia=
    CONFIG_MEDIA_STATE
      .filter(item=>
        item.tecido ||
        item.cor ||
        item.forro ||
        item.capa ||
        item.video ||
        item.imagens?.length
      )
      .map(cfgCloneMediaItem);

  const payload=
    id==='wave'
      ? {wave:data}
      : {configurator:data};

  const res=
    await api(
      cfgEndpoint(id),
      {
        method:'PUT',
        body:JSON.stringify(payload)
      }
    );

  CONFIG_CURRENT_DATA=
    res.configurator ||
    res.wave ||
    data;

  if(showToast){
    toast('Configurador salvo com sucesso');
  }

  return res;
}

function bindCfgOptionMedia(form,cfg){
  $$('.cfg-option-media-card',form).forEach(card=>{
    const tecido=card.dataset.tecido||'';
    const cor=card.dataset.cor||'';
    const forro=card.dataset.forro||'';
    const status=$('.upload-status',card);

    const stock=$('.cfg-tab-stock',card);

    if(stock){
      stock.onchange=async()=>{
        const label=stock.closest('.cfg-option-stock');
        label?.classList.toggle('is-out',!stock.checked);
        const span=label?.querySelector('span');
        if(span)span.textContent=stock.checked?'Com estoque':'Sem estoque';

        const underlying=
          cfgFindUnderlyingStock(
            form,
            tecido,
            cor
          );

        if(underlying){
          underlying.checked=stock.checked;
          underlying.dispatchEvent(new Event('change'));
        }

        try{
          status.textContent='Salvando disponibilidade...';
          await cfgSaveCurrent(form,cfg,ACTIVE_CONFIGURATOR_ID,false);
          status.textContent='Disponibilidade salva.';
        }catch(e){
          status.textContent=e.message;
          alert(e.message);
        }
      };
    }

    const capa=$('.cfg-tab-upload-capa',card);

    if(capa){
      capa.onchange=async()=>{
        const file=capa.files?.[0];
        if(!file)return;

        try{
          status.textContent='Enviando capa...';

          const d=
            await uploadAdminMedia(
              file,
              {
                configurator:ACTIVE_CONFIGURATOR_ID,
                tecido,
                cor,
                forro
              }
            );

          $('.cfg-tab-capa',card).value=d.url;
          $('.cfg-tab-capa-preview',card).innerHTML=`<img src="${esc(d.url)}">`;

          cfgSyncMediaStateFromDom();

          await cfgSaveCurrent(form,cfg,ACTIVE_CONFIGURATOR_ID,false);

          status.textContent='Capa enviada e salva.';
        }catch(e){
          status.textContent=e.message;
          alert(e.message);
        }
      };
    }

    const galeria=$('.cfg-tab-upload-galeria',card);

    if(galeria){
      galeria.onchange=async()=>{
        const files=[...(galeria.files||[])];
        if(!files.length)return;

        const hidden=$('.cfg-tab-imagens',card);

        const urls=
          String(hidden.value||'')
            .split('\n')
            .map(x=>x.trim())
            .filter(Boolean);

        try{
          for(const file of files){
            status.textContent=`Enviando ${file.name}...`;

            const d=
              await uploadAdminMedia(
                file,
                {
                  configurator:ACTIVE_CONFIGURATOR_ID,
                  tecido,
                  cor,
                  forro
                }
              );

            urls.push(d.url);
          }

          hidden.value=urls.join('\n');

          $('.cfg-tab-galeria-preview',card).innerHTML=
            urls.map(u=>`<img src="${esc(u)}">`).join('');

          cfgSyncMediaStateFromDom();

          await cfgSaveCurrent(form,cfg,ACTIVE_CONFIGURATOR_ID,false);

          status.textContent='Galeria enviada e salva.';
        }catch(e){
          status.textContent=e.message;
          alert(e.message);
        }
      };
    }

    const video=$('.cfg-tab-upload-video',card);

    if(video){
      video.onchange=async()=>{
        const file=video.files?.[0];
        if(!file)return;

        try{
          status.textContent='Enviando vídeo...';

          const d=
            await uploadAdminMedia(
              file,
              {
                configurator:ACTIVE_CONFIGURATOR_ID,
                tecido,
                cor,
                forro
              }
            );

          $('.cfg-tab-video',card).value=d.url;

          $('.cfg-tab-video-preview',card).innerHTML=
            `<video src="${esc(d.url)}" controls muted></video>`;

          cfgSyncMediaStateFromDom();

          await cfgSaveCurrent(form,cfg,ACTIVE_CONFIGURATOR_ID,false);

          status.textContent='Vídeo enviado e salvo.';
        }catch(e){
          status.textContent=e.message;
          alert(e.message);
        }
      };
    }
  });
}

function cfgRefreshOptionPages(form,cfg,keepTab=true){
  const active=
    keepTab
      ? $('.cfg-option-tab.active',form)?.dataset.optionTab||'geral'
      : 'geral';

  const general=$('#cfg-general-source');

  cfgBuildOptionPages(
    form,
    cfg,
    active
  );

  if(general){
    $('#cfg-general-host')?.appendChild(general);
  }

  const trilhosSection=
    $('#cfg-trilhos-section',form);

  const trilhosHost=
    $('#cfg-trilhos-host',form);

  if(
    trilhosSection &&
    trilhosHost
  ){
    trilhosHost.appendChild(
      trilhosSection
    );
  }
}

async function renderConfiguratorEditor(id){
  ACTIVE_CONFIGURATOR_ID=id;

  let d;

  try{
    d=await api(cfgEndpoint(id));
  }catch(e){
    if(id==='wave')throw e;

    d={
      configurator:{
        id,
        nome:
          CONFIGURATOR_TYPES.find(
            x=>x.id===id
          )?.nome||id,
        ativo:false,
        tecidos:{},
        trilhos:{},
        midia:[]
      }
    };
  }

  const w=
    normalizeConfiguratorResponse(
      d,
      id
    );

  CONFIG_CURRENT_DATA=w;
  cfgInitMediaState(w);

  const m=w.medidas||{};
  const b=w.barra||{};
  const faixas=b.faixas||[];
  const isPersiana=id==='persiana';

  $('#configurator-editor').innerHTML=`
    <form id="cfg-form">
      <div class="cfg-editor-shell">
        <aside id="cfg-option-nav" class="cfg-option-nav"></aside>

        <div id="cfg-option-pages" class="cfg-option-pages">
          <div class="cfg-option-page active" data-option-page="geral">
            <div id="cfg-general-host"></div>
          </div>
        </div>
      </div>

      <div id="cfg-general-source">
        <section class="panel configurator-section">
          <div class="panel-head">
            <div>
              <h2>${esc(w.nome||'Configurador')}</h2>
              <p>Configurações gerais, cálculo, tecidos, cores, preços e estrutura.</p>
            </div>
            <button class="primary-btn">Salvar</button>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label>Nome exibido</label>
              <input name="nome" value="${esc(w.nome||'')}">
            </div>

            <div class="form-field">
              <label>Modelo</label>
              <input name="modelo" value="${esc(w.modelo||'')}">
            </div>

            <div class="form-field full">
              <label>Descrição exibida no site</label>
              <textarea name="descricao" rows="3" placeholder="Descreva este produto sob medida">${esc(w.descricao||'')}</textarea>
            </div>

            <div class="form-field">
              <label>Modo de cálculo</label>
              <select name="modoCalculo">
                <option value="metro_tecido" ${!isPersiana?'selected':''}>Metro de tecido</option>
                <option value="area" ${isPersiana?'selected':''}>Área (m²)</option>
              </select>
            </div>

            <div class="form-field">
              <label>
                <input type="checkbox" name="ativo" ${w.ativo!==false?'checked':''}>
                Publicado / ativo
              </label>
            </div>
          </div>
        </section>

        <section class="panel configurator-section">
          <div class="panel-head">
            <h2>Medidas e limites</h2>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label>Largura mínima (m)</label>
              <input name="larguraMinima" type="number" step="0.01" value="${m.larguraMinima??.5}">
            </div>

            <div class="form-field">
              <label>Largura máxima (m)</label>
              <input name="larguraMaxima" type="number" step="0.01" value="${m.larguraMaxima??12}">
            </div>

            <div class="form-field">
              <label>Altura mínima (m)</label>
              <input name="alturaMinima" type="number" step="0.01" value="${m.alturaMinima??.5}">
            </div>

            <div class="form-field">
              <label>Altura máxima digitável (m)</label>
              <input name="alturaEntradaMaxima" type="number" step="0.01" value="${m.alturaEntradaMaxima??5}">
            </div>

            <div class="form-field">
              <label>Calcular automaticamente até (m)</label>
              <input name="calculoMaximo" type="number" step="0.01" value="${m.calculoMaximo??3.2}">
            </div>

            <div class="form-field">
              <label>Acréscimo acima de (m)</label>
              <input name="inicioAcrescimo" type="number" step="0.01" value="${m.inicioAcrescimo??2.8}">
            </div>

            <div class="form-field">
              <label>Acréscimo (%)</label>
              <input name="acrescimoPercentual" type="number" step="0.01" value="${m.acrescimoPercentual??25}">
            </div>

            <div class="form-field full">
              <label>Mensagem fora do cálculo automático</label>
              <input name="textoAcimaMaximo" value="${esc(m.acimaMaximo?.texto||'Medida sob consulta.')}">
            </div>

            <div class="form-field">
              <label>Texto do botão</label>
              <input name="textoBotaoAcimaMaximo" value="${esc(m.acimaMaximo?.textoBotao||'Solicitar orçamento')}">
            </div>

            <div class="form-field">
              <label>
                <input name="permitirCarrinho" type="checkbox" ${m.acimaMaximo?.permitirCarrinho?'checked':''}>
                Permitir carrinho fora do limite
              </label>
            </div>
          </div>
        </section>

        ${
          !isPersiana
            ? `<section class="panel configurator-section">
                <div class="panel-head">
                  <h2>Barra da cortina</h2>
                </div>

                <div class="configurator-rules-grid">
                  ${[0,1,2,3].map(i=>`
                    <div class="configurator-rule">
                      <span>Faixa ${i+1}</span>
                      <input name="faixa${i+1}Ate" type="number" step="0.01" value="${faixas[i]?.ate??''}" placeholder="Até (m)">
                      <input name="faixa${i+1}Barra" type="number" value="${faixas[i]?.tamanho??''}" placeholder="Barra (cm)">
                    </div>
                  `).join('')}
                </div>

                <div class="form-field" style="max-width:280px;margin-top:12px">
                  <label>Barra acima do início (cm)</label>
                  <input name="barraAcimaInicio" type="number" value="${b.acimaInicio??20}">
                </div>
              </section>`
            : `<section class="panel configurator-section">
                <div class="panel-head">
                  <h2>Regras da persiana</h2>
                </div>

                <div class="form-grid">
                  <div class="form-field">
                    <label>Área mínima cobrada (m²)</label>
                    <input name="areaMinima" type="number" step="0.01" value="${Number(w.persiana?.areaMinima||.6)}">
                  </div>

                  <div class="form-field">
                    <label>Lados do comando</label>
                    <input name="ladosComando" value="${esc((w.persiana?.ladosComando||['Direito','Esquerdo']).join(', '))}">
                  </div>

                  <div class="form-field">
                    <label>Voltagens</label>
                    <input name="voltagens" value="${esc((w.persiana?.voltagens||['110V','220V','Bivolt']).join(', '))}">
                  </div>

                  <div class="form-field full">
                    <label>Acionamentos — nome | adicional R$ | descrição (um por linha)</label>
                    <textarea name="acionamentos" rows="4">${esc((w.persiana?.acionamentos||[]).map(x=>`${x.nome||''} | ${Number(x.adicional||0)} | ${x.descricao||''}`).join('\n'))}</textarea>
                  </div>
                </div>
              </section>`
        }

        <section class="panel configurator-section">
          <div class="panel-head">
            <div>
              <h2>Tecidos, cores e preços</h2>
              <p>
                ${
                  isPersiana
                    ? 'Preço base por m² e opcionais.'
                    : 'Preço por metro de tecido e descrições.'
                }
              </p>
            </div>

            <button type="button" id="add-cfg-tecido" class="ghost-btn">+ Adicionar tecido</button>
          </div>

          <div id="cfg-tecidos" class="configurator-stack">
            ${Object.entries(w.tecidos||{}).map(([n,t])=>
              cfgTecidoCard(
                n,
                t,
                w.modoCalculo||
                (
                  isPersiana
                    ? 'area'
                    : 'metro_tecido'
                )
              )
            ).join('')}
          </div>

          <p class="field-hint cfg-auto-page-hint">
            As páginas de mídia acima são criadas automaticamente conforme os forros/opções cadastrados aqui.
          </p>
        </section>

        ${
          !isPersiana
            ? `<section id="cfg-trilhos-section" class="configurator-section cfg-trilhos-page-section">
                <div class="panel-head">
                  <h2>Cadastro de trilhos e varões</h2>
                  <button type="button" id="add-cfg-trilho" class="ghost-btn">+ Adicionar</button>
                </div>

                <div id="cfg-trilhos" class="configurator-stack">
                  ${Object.entries(w.trilhos||{}).map(([n,x])=>cfgTrilhoRow(n,x)).join('')}
                </div>
              </section>`
            : ''
        }

        <div class="form-actions">
          <button class="primary-btn">Salvar configurador</button>
        </div>
      </div>
    </form>
  `;

  const form=$('#cfg-form');

  cfgBuildOptionPages(
    form,
    w,
    'geral'
  );

  cfgMoveGeneralContent(form);

  const refreshPages=()=>{
    cfgRefreshOptionPages(
      form,
      w,
      true
    );
  };

  $('#add-cfg-tecido').onclick=()=>{
    $('#cfg-tecidos').insertAdjacentHTML(
      'beforeend',
      cfgTecidoCard(
        '',
        {
          cores:[],
          coresAtivas:{},
          forros:{}
        },
        isPersiana
          ? 'area'
          : 'metro_tecido'
      )
    );

    bindCfgRows();
    refreshPages();
  };

  if($('#add-cfg-trilho')){
    $('#add-cfg-trilho').onclick=()=>{
      $('#cfg-trilhos').insertAdjacentHTML(
        'beforeend',
        cfgTrilhoRow()
      );

      bindCfgRows();
    };
  }

  bindCfgRows();
  cfgPrepareOptionInputs(form);

  /*
    Quando o usuário cria/renomeia/remove um forro ou altera
    as cores, as páginas internas são reconstruídas.
  */
  form.addEventListener(
    'change',
    e=>{
      if(
        e.target.matches(
          '.cfg-forro-nome'
        )
      ){
        const oldName=
          String(
            e.target.dataset.originalOption||''
          ).trim();

        const newName=
          e.target.value.trim();

        if(
          oldName &&
          newName &&
          oldName!==newName
        ){
          cfgRenameOptionGlobally(
            form,
            oldName,
            newName,
            e.target
          );
        }

        if(newName){
          e.target.dataset.originalOption=
            newName;
        }

        refreshPages();
        cfgPrepareOptionInputs(form);
        return;
      }

      if(
        e.target.matches(
          '.cfg-tecido-cores, .cfg-tecido-nome'
        )
      ){
        refreshPages();
        cfgPrepareOptionInputs(form);
      }
    }
  );

  form.addEventListener(
    'click',
    e=>{
      if(
        e.target.closest(
          '.add-cfg-forro, .remove-cfg-forro, .remove-cfg-tecido'
        )
      ){
        setTimeout(
          ()=>{
            refreshPages();
            cfgPrepareOptionInputs(form);
          },
          0
        );
      }
    }
  );

  form.onsubmit=async e=>{
    e.preventDefault();

    const btn=
      e.currentTarget.querySelector(
        '.form-actions .primary-btn'
      ) ||
      e.currentTarget.querySelector(
        '.primary-btn'
      );

    const old=
      btn?.textContent;

    try{
      if(btn){
        btn.disabled=true;
        btn.textContent='Salvando...';
      }

      const res=
        await cfgSaveCurrent(
          e.currentTarget,
          w,
          id,
          true
        );

      if(id!=='wave'){
        ADMIN.cache[
          'configurator_'+id
        ]=
          res.configurator||
          CONFIG_CURRENT_DATA;
      }

      /*
        Depois de salvar, reconstruímos para criar/remover
        imediatamente as páginas correspondentes aos forros.
      */
      cfgRefreshOptionPages(
        form,
        CONFIG_CURRENT_DATA||w,
        true
      );

    }catch(err){
      alert(err.message);
    }finally{
      if(btn){
        btn.disabled=false;
        btn.textContent=
          old||
          'Salvar';
      }
    }
  };
}
async function renderConfigurators(){
  $('#view-content').innerHTML=`<div class="configurator-layout"><aside class="panel configurator-list"><div class="panel-head"><div><h2>Produtos sob medida</h2><p>Escolha o configurador para editar.</p></div></div><div id="configurator-switcher">${CONFIGURATOR_TYPES.map(x=>`<button type="button" class="configurator-switch ${x.id==='wave'?'active':''}" data-configurator="${x.id}"><span>${x.icon}</span><div><strong>${x.nome}</strong><small>${x.tipo==='persiana'?'Cálculo por área':'Cortina sob medida'}</small></div></button>`).join('')}</div><div class="r2-status" id="r2-status">Verificando armazenamento de mídia...</div></aside><div id="configurator-editor"><div class="empty">Carregando configurador...</div></div></div>`;
  try{const s=await api('media/upload');$('#r2-status').innerHTML=s.configured?'<b>R2 conectado</b><small>Uploads de imagem e vídeo ativos.</small>':'<b>R2 aguardando configuração</b><small>Binding esperado: MEDIA. A interface já está pronta.</small>'}catch{$('#r2-status').textContent='R2 ainda não configurado.'}
  $$('.configurator-switch').forEach(b=>b.onclick=async()=>{$$('.configurator-switch').forEach(x=>x.classList.toggle('active',x===b));await renderConfiguratorEditor(b.dataset.configurator)}); await renderConfiguratorEditor('wave');
}
async function renderMedia(){
  let status={configured:false};try{status=await api('media/upload')}catch{}
  const p=await api('catalog/products');const imgs=(p.products||[]).filter(x=>x.image_url);
  $('#view-content').innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Biblioteca de mídia</h2><p style="color:var(--muted);font-size:10px">Uploads do computador para produtos e configuradores.</p></div><span class="integration-status">${status.configured?'R2 conectado':'R2 a configurar'}</span></div>${status.configured?'<div class="media-ready">R2 conectado. Imagens e vídeos podem ser enviados diretamente do computador em Produtos e Configuradores.</div>':'<div class="media-warning"><b>Interface pronta.</b> Amanhã crie o bucket R2 e vincule ao Cloudflare Pages com o binding <code>MEDIA</code>. Não será necessário alterar o código.</div>'}<div class="media-library-grid">${imgs.map(x=>`<div class="media-library-card"><img src="${esc(x.image_url)}"><div>${esc(x.name)}</div></div>`).join('')||'<div class="empty">Nenhuma imagem de produto cadastrada ainda.</div>'}</div></section>`;
}

async function renderIntegrations(){let health='Conectado',r2='A configurar';try{const r=await fetch('/api/health');const d=await r.json();health=d.database?'Conectado':'Falha'}catch{health='Falha'}try{const s=await api('media/upload');r2=s.configured?'Conectado':'A configurar'}catch{}$('#view-content').innerHTML=`<div class="integration-grid"><div class="integration-card"><h3>Cloudflare D1</h3><p>Banco de dados de pedidos e administração.</p><span class="integration-status">${health}</span></div><div class="integration-card"><h3>Cloudflare R2</h3><p>Imagens e vídeos enviados pelo computador no painel. Binding esperado: <b>MEDIA</b>.</p><span class="integration-status">${r2}</span></div><div class="integration-card"><h3>Gateway de pagamento</h3><p>PIX e cartão. Estrutura do checkout pronta para conexão futura.</p><span class="integration-status">A configurar</span></div><div class="integration-card"><h3>ClearSale</h3><p>Antifraude após a integração do pagamento.</p><span class="integration-status">Planejado</span></div><div class="integration-card"><h3>E-mail transacional</h3><p>Confirmação de pedido e rastreio automático.</p><span class="integration-status">A configurar</span></div><div class="integration-card"><h3>WhatsApp oficial</h3><p>Rastreio e notificações automáticas em etapa futura.</p><span class="integration-status">A configurar</span></div></div>`}
