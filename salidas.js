import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY='sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

let user=null;
let shipments=[];
let customers=[];
let orders=[];
let vehicles=[];
let drivers=[];
let products=[];

const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const today=()=>new Date().toISOString().slice(0,10);
const DOCUMENT_TYPES=['Guía de Remisión','Factura','Boleta','Nota de Crédito','Nota de Débito','Otro'];

async function getUser(){const {data,error}=await supabase.auth.getUser();if(error)throw error;user=data?.user||null;return user;}

async function load(){
  if(!user)await getUser();
  if(!user)return;
  const [s,c,o,v,d,p]=await Promise.all([
    supabase.from('qf_shipments').select('id,guide_number,guide_date,guide_time,document_type,reason,customer_id,purchase_order_id,origin,destination,gross_weight_kg,vehicle_id,driver_id,status,observations').eq('owner_id',user.id).order('guide_date',{ascending:false}).order('guide_time',{ascending:false}),
    supabase.from('qf_customers').select('id,business_name,ruc').eq('owner_id',user.id).eq('active',true).order('business_name'),
    supabase.from('qf_purchase_orders').select('id,oc_number,operating_unit,status,customer_id').eq('owner_id',user.id).order('oc_number'),
    supabase.from('qf_vehicles').select('id,plate').eq('owner_id',user.id).eq('active',true).order('plate'),
    supabase.from('qf_drivers').select('id,full_name,license_number').eq('owner_id',user.id).eq('active',true).order('full_name'),
    supabase.from('qf_products').select('id,internal_code,name,base_unit,active').eq('owner_id',user.id).eq('active',true).order('name')
  ]);
  for(const x of [s,c,o,v,d,p])if(x.error)throw x.error;
  shipments=s.data||[];customers=c.data||[];orders=o.data||[];vehicles=v.data||[];drivers=d.data||[];products=p.data||[];
  if(shipments.length){
    const {data:items,error}=await supabase.from('qf_shipment_items').select('*').in('shipment_id',shipments.map(x=>x.id)).order('line_no');
    if(error)throw error;
    const map=new Map();
    for(const item of items||[]){const list=map.get(item.shipment_id)||[];list.push(item);map.set(item.shipment_id,list);}
    shipments.forEach(x=>x.items=map.get(x.id)||[]);
  }
}

function splitGuide(value=''){const s=String(value).trim();const i=s.indexOf('-');return i>0?{series:s.slice(0,i),number:s.slice(i+1)}:{series:'',number:s};}
function documentOptions(selected=''){return DOCUMENT_TYPES.map(v=>`<option value="${esc(v)}" ${String(selected||'Guía de Remisión')===v?'selected':''}>${esc(v)}</option>`).join('');}
function orderOptions(selected=''){
  if(!orders.length)return '<option value="">— No hay OC registradas —</option>';
  return `<option value="">— Seleccionar OC —</option>${orders.map(o=>`<option value="${esc(o.id)}" ${String(selected)===String(o.id)?'selected':''}>${esc(o.oc_number)}${o.operating_unit?' · '+esc(o.operating_unit):''}${o.status?' · '+esc(o.status):''}</option>`).join('')}`;
}
function productOptions(selected=''){return `<option value="">— Producto —</option>${products.map(p=>`<option value="${esc(p.id)}" ${String(selected)===String(p.id)?'selected':''}>${esc(p.name)}${p.internal_code?' · '+esc(p.internal_code):''}</option>`).join('')}`;}

function render(){
  const target=document.querySelector('#content');if(!target)return;
  const weight=shipments.reduce((a,x)=>a+num(x.gross_weight_kg),0);
  const customerCount=new Set(shipments.map(x=>x.customer_id).filter(Boolean)).size;
  const lines=shipments.reduce((a,x)=>a+(x.items?.length||0),0);
  target.innerHTML=`<main class="qf-rec-page"><div class="qf-rec-titlebar"><div><h1>Salidas</h1><p>Despacho de productos, documentos y control de transporte.</p></div><button class="primary qf-rec-new" type="button">+ Nueva salida</button></div>
    <section class="qf-rec-kpis"><div class="qf-rec-card"><span>Salidas</span><strong>${shipments.length}</strong></div><div class="qf-rec-card"><span>Peso bruto</span><strong>${weight.toLocaleString('es-PE')} kg</strong></div><div class="qf-rec-card"><span>Clientes</span><strong>${customerCount}</strong></div><div class="qf-rec-card"><span>Líneas de productos</span><strong>${lines}</strong></div></section>
    <section class="qf-rec-panel"><div class="qf-rec-panel-head"><h2>Salidas registradas</h2><span>${shipments.length} registro(s)</span></div>
    ${shipments.length?`<div class="qf-rec-table-wrap"><table class="qf-rec-table"><thead><tr><th>Fecha</th><th>Documento</th><th>Cliente</th><th>Destino</th><th>Peso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${shipments.map(x=>{const c=customers.find(y=>y.id===x.customer_id);return `<tr><td>${esc(x.guide_date)}</td><td><b>${esc(x.document_type||'Guía de Remisión')}</b><br>${esc(x.guide_number||'Sin número')}</td><td>${esc(c?.business_name||'')}</td><td>${esc(x.destination||'—')}</td><td>${num(x.gross_weight_kg).toLocaleString('es-PE')} kg</td><td><span class="qf-rec-status">${esc(x.status||'')}</span></td><td><button class="secondary qf-rec-edit" type="button" data-id="${esc(x.id)}">Ver / editar</button> <button class="secondary qf-rec-del" type="button" data-id="${esc(x.id)}">Eliminar</button></td></tr>`;}).join('')}</tbody></table></div>`:`<div class="qf-rec-empty"><div class="qf-rec-empty-icon">📤</div><h3>Aún no hay salidas</h3><p>Registra aquí los documentos con los que los productos salen de la planta.</p><button class="primary qf-rec-first" type="button">+ Registrar primera salida</button></div>`}
    </section></main>`;
  target.querySelector('.qf-rec-new')?.addEventListener('click',()=>openForm());
  target.querySelector('.qf-rec-first')?.addEventListener('click',()=>openForm());
  target.querySelectorAll('.qf-rec-edit').forEach(b=>b.addEventListener('click',()=>openForm(b.dataset.id)));
  target.querySelectorAll('.qf-rec-del').forEach(b=>b.addEventListener('click',()=>remove(b.dataset.id)));
}

function openForm(id=null){
  const x=id?shipments.find(y=>y.id===id):null;const parts=splitGuide(x?.guide_number||'');const customer=customers.find(y=>y.id===x?.customer_id);const driver=drivers.find(y=>y.id===x?.driver_id);
  const modal=document.createElement('div');modal.className='qf-rec-modal';
  modal.innerHTML=`<div class="qf-rec-modal-card"><div class="qf-rec-modal-head"><div><h2>${x?'Editar salida':'Nueva salida'}</h2><p>Registra el documento, transporte y materiales despachados.</p></div><button type="button" class="qf-rec-close">×</button></div>
  <form id="qfShipForm"><div class="qf-rec-section"><h3>Documento y cliente</h3><div class="qf-rec-grid">
    <label>Fecha<input name="guide_date" type="date" required value="${esc(x?.guide_date||today())}"></label><label>Hora<input name="guide_time" type="time" value="${esc((x?.guide_time||'').slice(0,5))}"></label><label>Tipo de documento<select name="document_type">${documentOptions(x?.document_type)}</select></label>
    <label>Serie<input name="guide_series" placeholder="E001" value="${esc(parts.series)}"></label><label>Número<input name="guide_number" required placeholder="00001234" value="${esc(parts.number)}"></label><label>Orden de compra<select name="purchase_order_id" ${orders.length?'':'title="No hay órdenes de compra registradas"'}>${orderOptions(x?.purchase_order_id)}</select></label>
    <label class="wide">Cliente<select name="customer_id" id="qfCustomer"><option value="">— Seleccionar cliente —</option>${customers.map(c=>`<option value="${esc(c.id)}" ${x?.customer_id===c.id?'selected':''}>${esc(c.business_name)}${c.ruc?' · RUC '+esc(c.ruc):''}</option>`).join('')}</select></label><label>Nombre cliente<input name="customer_name" id="qfCustomerName" required value="${esc(customer?.business_name||'')}"></label><label>RUC<input id="qfCustomerRuc" readonly value="${esc(customer?.ruc||'')}"></label>
  </div></div>
  <div class="qf-rec-section"><h3>Transporte</h3><div class="qf-rec-grid"><label>Placa<select name="vehicle_id"><option value="">— Seleccionar vehículo —</option>${vehicles.map(v=>`<option value="${esc(v.id)}" ${x?.vehicle_id===v.id?'selected':''}>${esc(v.plate)}</option>`).join('')}</select></label><label>Conductor<select name="driver_id" id="qfDriver"><option value="">— Seleccionar conductor —</option>${drivers.map(d=>`<option value="${esc(d.id)}" ${x?.driver_id===d.id?'selected':''}>${esc(d.full_name)}</option>`).join('')}</select></label><label>Licencia<input id="qfDriverLicense" readonly value="${esc(driver?.license_number||'')}"></label><label>Origen<input name="origin" value="${esc(x?.origin||'')}"></label><label>Destino<input name="destination" value="${esc(x?.destination||'')}"></label></div></div>
  <div class="qf-rec-section"><div class="qf-rec-lines-head"><h3>Materiales despachados</h3><button type="button" class="secondary" id="qfAddShipLine">+ Agregar material</button></div><div id="qfShipLines"></div></div>
  <div class="qf-rec-section"><div class="qf-rec-grid"><label>Motivo<select name="reason">${['Venta','Traslado','Devolución','Otro'].map(v=>`<option ${x?.reason===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Peso bruto (kg)<input name="gross_weight_kg" type="number" min="0" step="0.001" value="${esc(x?.gross_weight_kg??'')}"></label><label>Estado<select name="status">${['registrado','preparando','despachado','entregado','anulado'].map(v=>`<option ${x?.status===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="wide">Observaciones<textarea name="observations" rows="3">${esc(x?.observations||'')}</textarea></label></div></div>
  <div class="qf-rec-form-actions"><button type="button" class="secondary qf-rec-cancel">Cancelar</button><button class="primary" type="submit">${x?'Guardar cambios':'Guardar salida'}</button></div></form></div>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();modal.querySelector('.qf-rec-close').onclick=close;modal.querySelector('.qf-rec-cancel').onclick=close;
  const cs=modal.querySelector('#qfCustomer');cs.onchange=()=>{const c=customers.find(y=>y.id===cs.value);modal.querySelector('#qfCustomerName').value=c?.business_name||'';modal.querySelector('#qfCustomerRuc').value=c?.ruc||'';};
  const ds=modal.querySelector('#qfDriver');ds.onchange=()=>{const d=drivers.find(y=>y.id===ds.value);modal.querySelector('#qfDriverLicense').value=d?.license_number||'';};
  const lines=modal.querySelector('#qfShipLines');
  const add=item=>{const d=document.createElement('div');d.className='qf-rec-line';d.innerHTML=`<label>Producto<select class="lp">${productOptions(item?.product_id)}</select></label><label>Cant. guía<input class="lg" type="number" min="0" step="0.001" value="${esc(item?.quantity??'')}"></label><label>Cant. salida<input class="lr" type="number" min="0" step="0.001" value="${esc(item?.quantity??'')}"></label><label>Peso kg<input class="lw" type="number" min="0" step="0.001" value="${esc(item?.weight_kg??'')}"></label><label>Lote<input class="ll" value="${esc(item?.lot||'')}"></label><label>Estado<select class="lc"><option ${!item?.condition||item.condition==='Conforme'?'selected':''}>Conforme</option><option ${item?.condition==='Con diferencia'?'selected':''}>Con diferencia</option><option ${item?.condition==='Rechazado'?'selected':''}>Rechazado</option></select></label><button type="button" class="qf-line-remove">×</button>`;lines.appendChild(d);d.querySelector('.qf-line-remove').onclick=()=>{if(lines.children.length<=1){alert('La salida debe tener al menos un material.');return;}d.remove();};};
  (x?.items?.length?x.items:[{}]).forEach(add);
  modal.querySelector('#qfAddShipLine').onclick=()=>add({});
  modal.querySelector('#qfShipForm').onsubmit=e=>save(e,id,modal,lines);
}

async function save(event,id,modal,lines){
  event.preventDefault();if(!user)await getUser();if(!user){alert('La sesión no está disponible.');return;}
  const form=new FormData(event.currentTarget);const series=String(form.get('guide_series')||'').trim();const number=String(form.get('guide_number')||'').trim();
  const items=[...lines.querySelectorAll('.qf-rec-line')].map(d=>{const p=products.find(v=>v.id===d.querySelector('.lp').value);const quantity=num(d.querySelector('.lr').value||d.querySelector('.lg').value);return {product_id:p?.id||null,source_product_code:p?.internal_code||null,description_source:p?.name||'Material',quantity,unit:p?.base_unit||'kg',package_type:null,package_count:null,weight_per_package_kg:null,lot:d.querySelector('.ll').value.trim()||null,condition:d.querySelector('.lc').value};}).filter(v=>v.product_id||v.quantity>0);
  if(!number){alert('Ingresa el número de documento.');return;}if(!String(form.get('customer_name')||'').trim()){alert('Ingresa el cliente.');return;}if(!items.length||items.some(v=>v.quantity<=0)){alert('Cada material debe tener una cantidad mayor que cero.');return;}
  const payload={owner_id:user.id,guide_number:series?`${series}-${number}`:number,guide_date:form.get('guide_date'),guide_time:form.get('guide_time')||null,document_type:form.get('document_type')||'Guía de Remisión',reason:form.get('reason'),customer_id:form.get('customer_id')||null,purchase_order_id:form.get('purchase_order_id')||null,origin:String(form.get('origin')||'').trim()||null,destination:String(form.get('destination')||'').trim()||null,gross_weight_kg:form.get('gross_weight_kg')===''?null:num(form.get('gross_weight_kg')),vehicle_id:form.get('vehicle_id')||null,driver_id:form.get('driver_id')||null,status:form.get('status'),observations:String(form.get('observations')||'').trim()||null};
  let shipmentId=id;
  if(id){const {count,error:check}=await supabase.from('qf_inventory_movements').select('id',{count:'exact',head:true}).eq('shipment_id',id).eq('owner_id',user.id);if(check){alert('No se pudo verificar Inventario: '+check.message);return;}if((count||0)>0){alert('Esta salida ya está vinculada a Inventario y no se puede editar.');return;}const {error}=await supabase.from('qf_shipments').update(payload).eq('id',id).eq('owner_id',user.id);if(error){alert('No se pudo guardar: '+error.message);return;}const {error:itemError}=await supabase.from('qf_shipment_items').delete().eq('shipment_id',id).eq('owner_id',user.id);if(itemError){alert('No se pudieron actualizar los materiales: '+itemError.message);return;}}
  else {const {data,error}=await supabase.from('qf_shipments').insert(payload).select('id').single();if(error){alert('No se pudo guardar: '+error.message);return;}shipmentId=data.id;}
  const {error:itemError}=await supabase.from('qf_shipment_items').insert(items.map((v,i)=>({...v,shipment_id:shipmentId,owner_id:user.id,line_no:i+1})));if(itemError){alert('La salida se guardó, pero hubo un error con los materiales: '+itemError.message);return;}
  modal.remove();await load();render();
}

async function remove(id){
  if(!user)await getUser();if(!user)return;
  const {count,error}=await supabase.from('qf_inventory_movements').select('id',{count:'exact',head:true}).eq('shipment_id',id).eq('owner_id',user.id);if(error){alert('No se pudo verificar Inventario: '+error.message);return;}if((count||0)>0){alert('Esta salida ya está vinculada a Inventario y no se puede eliminar.');return;}
  if(!confirm('¿Eliminar esta salida y sus materiales?'))return;
  const {error:del}=await supabase.from('qf_shipments').delete().eq('id',id).eq('owner_id',user.id);if(del){alert('No se pudo eliminar: '+del.message);return;}await load();render();
}

async function openSalidas(){try{await getUser();if(!user){alert('Inicia sesión para acceder a Salidas.');return;}await load();render();}catch(e){console.error('Salidas:',e);alert('No se pudo cargar Salidas: '+(e?.message||e));}}
window.qfOpenSalidas=openSalidas;
document.addEventListener('click',event=>{const b=event.target.closest?.('nav button[data-tab="despachos"]');if(b)setTimeout(openSalidas,0);});
