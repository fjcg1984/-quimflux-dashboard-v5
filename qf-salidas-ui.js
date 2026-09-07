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
let opening=false;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const today=()=>new Date().toISOString().slice(0,10);

async function getUser(){
  const {data,error}=await supabase.auth.getUser();
  if(error)throw error;
  user=data?.user||null;
  return user;
}

async function loadData(){
  if(!user)await getUser();
  if(!user)return;
  const [s,c,o,v,d,p]=await Promise.all([
    supabase.from('qf_shipments').select('id,guide_number,guide_date,guide_time,reason,customer_id,purchase_order_id,origin,destination,gross_weight_kg,vehicle_id,driver_id,status,observations').eq('owner_id',user.id).order('guide_date',{ascending:false}).order('guide_time',{ascending:false}),
    supabase.from('qf_customers').select('id,business_name,ruc').eq('owner_id',user.id).eq('active',true).order('business_name'),
    supabase.from('qf_purchase_orders').select('id,oc_number,operating_unit,status,customer_id').eq('owner_id',user.id).order('oc_number'),
    supabase.from('qf_vehicles').select('id,plate').eq('owner_id',user.id).eq('active',true).order('plate'),
    supabase.from('qf_drivers').select('id,full_name,license_number').eq('owner_id',user.id).eq('active',true).order('full_name'),
    supabase.from('qf_products').select('id,internal_code,name,base_unit').eq('owner_id',user.id).eq('active',true).order('name')
  ]);
  for(const x of [s,c,o,v,d,p])if(x.error)throw x.error;
  shipments=s.data||[];customers=c.data||[];orders=o.data||[];vehicles=v.data||[];drivers=d.data||[];
  products=p.data||[];
  if(shipments.length){
    const {data:items,error}=await supabase.from('qf_shipment_items').select('*').in('shipment_id',shipments.map(x=>x.id)).order('line_no');
    if(error)throw error;
    const map=new Map();
    for(const item of items||[]){const list=map.get(item.shipment_id)||[];list.push(item);map.set(item.shipment_id,list);}
    shipments.forEach(x=>x.items=map.get(x.id)||[]);
  }
}

function splitGuide(value=''){
  const s=String(value).trim();
  const i=s.indexOf('-');
  return i>0?{series:s.slice(0,i),number:s.slice(i+1)}:{series:'',number:s};
}

function render(){
  const target=document.querySelector('#content');
  if(!target)return;
  const weight=shipments.reduce((a,x)=>a+num(x.gross_weight_kg),0);
  const customerCount=new Set(shipments.map(x=>x.customer_id).filter(Boolean)).size;
  const pending=shipments.filter(x=>['registrado','preparando'].includes(String(x.status||'').toLowerCase())).length;
  const lines=shipments.reduce((a,x)=>a+(x.items?.length||0),0);
  target.innerHTML=`
    <main class="qf-rec-page">
      <div class="qf-rec-titlebar">
        <div><h1>Salidas</h1><p>Despacho de productos, guías de remisión y control de transporte.</p></div>
        <button class="primary qf-rec-new" type="button">+ Nueva salida</button>
      </div>
      <section class="qf-rec-kpis">
        <div class="qf-rec-card"><span>Salidas</span><strong>${shipments.length}</strong></div>
        <div class="qf-rec-card"><span>Peso bruto</span><strong>${weight.toLocaleString('es-PE')} kg</strong></div>
        <div class="qf-rec-card"><span>Clientes</span><strong>${customerCount}</strong></div>
        <div class="qf-rec-card"><span>Líneas de productos</span><strong>${lines}</strong></div>
      </section>
      <section class="qf-rec-panel">
        <div class="qf-rec-panel-head"><h2>Salidas registradas</h2><span>${shipments.length} registro(s)</span></div>
        ${shipments.length?`<div class="qf-rec-table-wrap"><table class="qf-rec-table"><thead><tr><th>Fecha</th><th>Guía</th><th>Cliente</th><th>Destino</th><th>Peso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
          ${shipments.map(x=>{const c=customers.find(y=>y.id===x.customer_id);return `<tr><td>${esc(x.guide_date)}</td><td><b>${esc(x.guide_number||'Sin guía')}</b></td><td>${esc(c?.business_name||'')}</td><td>${esc(x.destination||'—')}</td><td>${num(x.gross_weight_kg).toLocaleString('es-PE')} kg</td><td><span class="qf-rec-status">${esc(x.status||'')}</span></td><td><button class="secondary qf-rec-edit" type="button" data-id="${esc(x.id)}">Ver / editar</button> <button class="secondary qf-rec-del" type="button" data-id="${esc(x.id)}">Eliminar</button></td></tr>`;}).join('')}
        </tbody></table></div>`:`<div class="qf-rec-empty"><div class="qf-rec-empty-icon">📤</div><h3>Aún no hay salidas</h3><p>Registra aquí las guías con las que los productos salen de la planta.</p><button class="primary qf-rec-first" type="button">+ Registrar primera salida</button></div>`}
      </section>
    </main>`;
  target.querySelector('.qf-rec-new')?.addEventListener('click',()=>openForm());
  target.querySelector('.qf-rec-first')?.addEventListener('click',()=>openForm());
  target.querySelectorAll('.qf-rec-edit').forEach(b=>b.addEventListener('click',()=>openForm(b.dataset.id)));
  target.querySelectorAll('.qf-rec-del').forEach(b=>b.addEventListener('click',()=>removeShipment(b.dataset.id)));
}

function openForm(id=null){
  if(opening)return;
  opening=true;
  const x=id?shipments.find(y=>y.id===id):null;
  const parts=splitGuide(x?.guide_number||'');
  const modal=document.createElement('div');modal.className='qf-rec-modal';
  modal.innerHTML=`<div class="qf-rec-modal-card">
    <div class="qf-rec-modal-head"><div><h2>${x?'Editar salida':'Nueva salida'}</h2><p>Registra el documento, transporte y productos despachados.</p></div><button type="button" class="qf-rec-close">×</button></div>
    <form id="qfShipForm">
      <div class="qf-rec-section"><h3>Documento y cliente</h3><div class="qf-rec-grid">
        <label>Fecha<input name="guide_date" type="date" required value="${esc(x?.guide_date||today())}"></label>
        <label>Hora<input name="guide_time" type="time" value="${esc((x?.guide_time||'').slice(0,5))}"></label>
        <label>Tipo<select name="document_type"><option>Guía de Remisión</option><option>Factura</option><option>Otro</option></select></label>
        <label>Serie<input name="guide_series" placeholder="E001" value="${esc(parts.series)}"></label>
        <label>Número<input name="guide_number" required placeholder="00001234" value="${esc(parts.number)}"></label>
        <label>Orden de compra<select name="purchase_order_id"><option value="">— Seleccionar OC —</option>${orders.map(o=>`<option value="${o.id}" ${x?.purchase_order_id===o.id?'selected':''}>${esc(o.oc_number)}${o.operating_unit?' · '+esc(o.operating_unit):''}</option>`).join('')}</select></label>
        <label class="wide">Cliente<select name="customer_id" id="qfShipCustomer"><option value="">— Seleccionar cliente —</option>${customers.map(c=>`<option value="${c.id}" ${x?.customer_id===c.id?'selected':''}>${esc(c.business_name)}${c.ruc?' · RUC '+esc(c.ruc):''}</option>`).join('')}</select></label>
        <label>RUC<input id="qfShipRuc" readonly value="${esc(customers.find(c=>c.id===x?.customer_id)?.ruc||'')}"></label>
      </div></div>
      <div class="qf-rec-section"><h3>Transporte</h3><div class="qf-rec-grid">
        <label>Placa<select name="vehicle_id" id="qfShipVehicle"><option value="">— Seleccionar vehículo —</option>${vehicles.map(v=>`<option value="${v.id}" ${x?.vehicle_id===v.id?'selected':''}>${esc(v.plate)}</option>`).join('')}</select></label>
        <label>Conductor<select name="driver_id" id="qfShipDriver"><option value="">— Seleccionar conductor —</option>${drivers.map(d=>`<option value="${d.id}" ${x?.driver_id===d.id?'selected':''}>${esc(d.full_name)}</option>`).join('')}</select></label>
        <label>Licencia<input id="qfShipLicense" readonly value="${esc(drivers.find(d=>d.id===x?.driver_id)?.license_number||'')}"></label>
        <label>Origen<input name="origin" value="${esc(x?.origin||'')}"></label>
        <label>Destino<input name="destination" value="${esc(x?.destination||'')}"></label>
      </div></div>
      <div class="qf-rec-section"><div class="qf-rec-lines-head"><h3>Materiales despachados</h3><button type="button" class="secondary" id="qfAddShipLine">+ Agregar material</button></div><div id="qfShipLines"></div></div>
      <div class="qf-rec-section"><div class="qf-rec-grid"><label>Peso bruto (kg)<input name="gross_weight_kg" type="number" min="0" step="0.001" value="${esc(x?.gross_weight_kg??'')}"></label><label>Motivo<select name="reason"><option ${!x||x.reason==='Venta'?'selected':''}>Venta</option><option ${x?.reason==='Traslado'?'selected':''}>Traslado</option><option ${x?.reason==='Devolución'?'selected':''}>Devolución</option><option ${x?.reason==='Otro'?'selected':''}>Otro</option></select></label><label>Estado<select name="status">${['registrado','preparando','despachado','entregado','anulado'].map(v=>`<option ${x?.status===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="wide">Observaciones<textarea name="observations" rows="3">${esc(x?.observations||'')}</textarea></label></div></div>
      <div class="qf-rec-form-actions"><button type="button" class="secondary qf-rec-cancel">Cancelar</button><button class="primary" type="submit">${x?'Guardar cambios':'Guardar salida'}</button></div>
    </form></div>`;
  document.body.appendChild(modal);opening=false;
  const close=()=>modal.remove();modal.querySelector('.qf-rec-close').onclick=close;modal.querySelector('.qf-rec-cancel').onclick=close;
  const customer=modal.querySelector('#qfShipCustomer');customer.onchange=()=>{const c=customers.find(v=>v.id===customer.value);modal.querySelector('#qfShipRuc').value=c?.ruc||'';};
  const driver=modal.querySelector('#qfShipDriver');driver.onchange=()=>{const d=drivers.find(v=>v.id===driver.value);modal.querySelector('#qfShipLicense').value=d?.license_number||'';};
  const lines=modal.querySelector('#qfShipLines');
  const add=item=>{const d=document.createElement('div');d.className='qf-rec-line';d.innerHTML=`<label>Producto<select class="sp"><option value="">— Producto —</option>${products.map(p=>`<option value="${p.id}" ${item?.product_id===p.id?'selected':''}>${esc(p.name)} (${esc(p.internal_code||'')})</option>`).join('')}</select></label><label>Código fuente<input class="sc" value="${esc(item?.source_product_code||'')}"></label><label>Descripción<input class="sd" required value="${esc(item?.description_source||item?.material||'')}"></label><label>Cantidad<input class="sq" type="number" min="0" step="0.001" required value="${esc(item?.quantity??'')}"></label><label>Unidad<select class="su">${['kg','unidades','cajas','sacos','baldes','otros'].map(u=>`<option ${String(item?.unit||'kg')===u?'selected':''}>${u}</option>`).join('')}</select></label><label>Tipo envase<input class="st" value="${esc(item?.package_type||'')}"></label><label>N.º envases<input class="sn" type="number" min="0" step="0.001" value="${esc(item?.package_count??'')}"></label><label>Kg/envase<input class="sw" type="number" min="0" step="0.001" value="${esc(item?.weight_per_package_kg??'')}"></label><label>Lote<input class="sl" value="${esc(item?.lot||'')}"></label><label>Estado<select class="ss"><option ${!item||item.condition==='Conforme'?'selected':''}>Conforme</option><option ${item?.condition==='Con diferencia'?'selected':''}>Con diferencia</option><option ${item?.condition==='Rechazado'?'selected':''}>Rechazado</option></select></label><button type="button" class="qf-line-remove">×</button>`;lines.appendChild(d);d.querySelector('.qf-line-remove').onclick=()=>{if(lines.children.length>1)d.remove();else alert('La salida debe tener al menos un material.');};};
  (x?.items?.length?x.items:[{}]).forEach(add);modal.querySelector('#qfAddShipLine').onclick=()=>add({});
  modal.querySelector('#qfShipForm').onsubmit=e=>saveForm(e,id,modal,lines);
}

async function saveForm(event,id,modal,lines){
  event.preventDefault();
  if(!user)await getUser();
  if(!user){alert('La sesión no está disponible.');return;}
  const form=new FormData(event.currentTarget);
  const series=String(form.get('guide_series')||'').trim();const number=String(form.get('guide_number')||'').trim();
  const guide=series?`${series}-${number}`:number;
  const items=[...lines.querySelectorAll('.qf-rec-line')].map(d=>{const p=products.find(v=>v.id===d.querySelector('.sp').value);return {owner_id:user.id,product_id:p?.id||null,source_product_code:d.querySelector('.sc').value.trim()||null,description_source:d.querySelector('.sd').value.trim(),quantity:num(d.querySelector('.sq').value),unit:d.querySelector('.su').value,package_type:d.querySelector('.st').value.trim()||null,package_count:d.querySelector('.sn').value===''?null:num(d.querySelector('.sn').value),weight_per_package_kg:d.querySelector('.sw').value===''?null:num(d.querySelector('.sw').value),lot:d.querySelector('.sl').value.trim()||null,condition:d.querySelector('.ss').value};}).filter(v=>v.description_source||v.quantity);
  if(!number){alert('Ingresa el número de guía.');return;}if(!items.length||items.some(v=>!v.description_source||v.quantity<=0)){alert('Cada material necesita descripción y cantidad mayor que cero.');return;}
  const payload={owner_id:user.id,guide_number:guide,guide_date:form.get('guide_date'),guide_time:form.get('guide_time')||null,reason:form.get('reason'),customer_id:form.get('customer_id')||null,purchase_order_id:form.get('purchase_order_id')||null,origin:String(form.get('origin')||'').trim()||null,destination:String(form.get('destination')||'').trim()||null,gross_weight_kg:form.get('gross_weight_kg')===''?null:num(form.get('gross_weight_kg')),vehicle_id:form.get('vehicle_id')||null,driver_id:form.get('driver_id')||null,status:form.get('status'),observations:String(form.get('observations')||'').trim()||null};
  const result=id?await supabase.from('qf_shipments').update(payload).eq('id',id).eq('owner_id',user.id).select('id').single():await supabase.from('qf_shipments').insert(payload).select('id').single();
  if(result.error){alert('No se pudo guardar la salida: '+result.error.message);return;}
  const shipmentId=result.data.id;
  if(id){const del=await supabase.from('qf_shipment_items').delete().eq('shipment_id',id).eq('owner_id',user.id);if(del.error){alert('No se pudieron actualizar los materiales: '+del.error.message);return;}}
  const ins=await supabase.from('qf_shipment_items').insert(items.map((v,i)=>({...v,shipment_id:shipmentId,line_no:i+1})));
  if(ins.error){alert('La salida se guardó, pero hubo un error con los materiales: '+ins.error.message);return;}
  modal.remove();await loadData();render();
}

async function removeShipment(id){
  if(!user)await getUser();if(!user)return;
  const {count,error}=await supabase.from('qf_inventory_movements').select('id',{count:'exact',head:true}).eq('shipment_id',id).eq('owner_id',user.id);
  if(error){alert('No se pudo verificar Inventario: '+error.message);return;}if((count||0)>0){alert('Esta salida ya está vinculada a Inventario y no se puede eliminar.');return;}
  if(!confirm('¿Eliminar esta salida y sus materiales?'))return;
  const {error:del}=await supabase.from('qf_shipments').delete().eq('id',id).eq('owner_id',user.id);if(del){alert('No se pudo eliminar: '+del.message);return;}await loadData();render();
}

async function openSalidas(){try{await getUser();if(!user){alert('Inicia sesión para acceder a Salidas.');return;}await loadData();render();}catch(e){console.error('Salidas:',e);alert('No se pudo cargar Salidas: '+(e?.message||e));}}

window.qfOpenSalidas=openSalidas;

document.addEventListener('click',event=>{const b=event.target.closest?.('nav button[data-tab="despachos"]');if(b)setTimeout(openSalidas,0);});
