import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY='sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

let currentUser=null;
let shipments=[];
let customers=[];
let products=[];
let vehicles=[];
let drivers=[];
let orders=[];
let enhancing=false;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=v=>Number(v||0);
const today=()=>new Date().toISOString().slice(0,10);

async function getUser(){
  const {data,error}=await supabase.auth.getUser();
  if(error) throw error;
  currentUser=data?.user||null;
  return currentUser;
}

async function load(){
  if(!currentUser) await getUser();
  if(!currentUser) return;

  const [s,c,p,v,d,o]=await Promise.all([
    supabase.from('qf_shipments').select('*').eq('owner_id',currentUser.id).order('guide_date',{ascending:false}).order('guide_time',{ascending:false}),
    supabase.from('qf_customers').select('id,business_name,ruc').eq('owner_id',currentUser.id).eq('active',true).order('business_name'),
    supabase.from('qf_products').select('id,internal_code,name,base_unit,active').eq('owner_id',currentUser.id).eq('active',true).order('name'),
    supabase.from('qf_vehicles').select('id,plate').eq('owner_id',currentUser.id).eq('active',true).order('plate'),
    supabase.from('qf_drivers').select('id,full_name,license_number').eq('owner_id',currentUser.id).eq('active',true).order('full_name'),
    supabase.from('qf_purchase_orders').select('id,oc_number,operating_unit,status,customer_id').eq('owner_id',currentUser.id).order('oc_number')
  ]);
  for(const x of [s,c,p,v,d,o]) if(x.error) throw x.error;
  shipments=s.data||[]; customers=c.data||[]; products=p.data||[]; vehicles=v.data||[]; drivers=d.data||[]; orders=o.data||[];

  if(!shipments.length) return;
  const ids=shipments.map(x=>x.id);
  const {data:items,error}=await supabase.from('qf_shipment_items').select('*').in('shipment_id',ids).order('line_no');
  if(error) throw error;
  const byShipment=new Map();
  for(const item of items||[]){
    const list=byShipment.get(item.shipment_id)||[];
    list.push(item);
    byShipment.set(item.shipment_id,list);
  }
  shipments.forEach(x=>{x.items=byShipment.get(x.id)||[];});
}

function parseGuide(value=''){
  const parts=String(value).split('-');
  if(parts.length>1) return {series:parts.shift(),number:parts.join('-')};
  return {series:'',number:String(value)};
}

function productOptions(selected=''){
  return `<option value="">— Producto —</option>${products.map(p=>`<option value="${esc(p.id)}" ${String(selected)===String(p.id)?'selected':''}>${esc(p.name)}${p.internal_code?' · '+esc(p.internal_code):''}</option>`).join('')}`;
}

function renderItems(items){
  const list=items?.length?items:[{}];
  return list.map(item=>`<div class="qf-rec-line">
    <label>Producto<select class="lp">${productOptions(item.product_id)}</select></label>
    <label>Cant. guía<input class="lg" type="number" min="0" step="0.001" value="${esc(item.quantity??'')}"></label>
    <label>Cant. salida<input class="lr" type="number" min="0" step="0.001" value="${esc(item.quantity??'')}"></label>
    <label>Peso kg<input class="lw" type="number" min="0" step="0.001" value="${esc(item.quantity??'')}"></label>
    <label>Lote<input class="ll" value="${esc(item.lot||'')}"></label>
    <label>Estado<select class="lc"><option ${!item.status||item.status==='Conforme'?'selected':''}>Conforme</option><option ${item.status==='Pendiente'?'selected':''}>Pendiente</option><option ${item.status==='Rechazado'?'selected':''}>Rechazado</option></select></label>
    <button type="button" class="qf-line-remove">×</button>
  </div>`).join('');
}

function openForm(id=null){
  const r=id?shipments.find(x=>x.id===id):null;
  const guide=parseGuide(r?.guide_number||'');
  const customer=customers.find(x=>x.id===r?.customer_id);
  const modal=document.createElement('div');
  modal.className='qf-rec-modal';
  modal.innerHTML=`
    <div class="qf-rec-modal-card">
      <div class="qf-rec-modal-head"><div><h2>${r?'Editar salida':'Nueva salida'}</h2><p>Registra el documento, transporte y materiales despachados.</p></div><button type="button" class="qf-rec-close">×</button></div>
      <form id="qfShipForm">
        <div class="qf-rec-section"><h3>Documento y cliente</h3><div class="qf-rec-grid">
          <label>Fecha<input name="guide_date" type="date" required value="${esc(r?.guide_date||today())}"></label>
          <label>Hora<input name="guide_time" type="time" value="${esc((r?.guide_time||'').slice(0,5))}"></label>
          <label>Tipo<select name="document_type"><option selected>Guía de Remisión</option><option>Factura</option><option>Otro</option></select></label>
          <label>Serie<input name="guide_series" placeholder="E001" value="${esc(guide.series)}"></label>
          <label>Número<input name="guide_number" placeholder="00001234" required value="${esc(guide.number)}"></label>
          <label>Orden de compra<select name="purchase_order_id"><option value="">— Seleccionar OC —</option>${orders.map(o=>`<option value="${esc(o.id)}" ${r?.purchase_order_id===o.id?'selected':''}>${esc(o.oc_number)}${o.operating_unit?' · '+esc(o.operating_unit):''}</option>`).join('')}</select></label>
          <label class="wide">Cliente<select name="customer_id" id="qfCustomer"><option value="">— Seleccionar cliente —</option>${customers.map(c=>`<option value="${esc(c.id)}" ${r?.customer_id===c.id?'selected':''}>${esc(c.business_name)}${c.ruc?' · RUC '+esc(c.ruc):''}</option>`).join('')}</select></label>
          <label>Nombre cliente<input name="customer_name" id="qfCustomerName" required value="${esc(customer?.business_name||'')}"></label>
          <label>RUC<input name="customer_ruc" id="qfCustomerRuc" value="${esc(customer?.ruc||'')}"></label>
        </div></div>
        <div class="qf-rec-section"><h3>Transporte</h3><div class="qf-rec-grid">
          <label>Placa<select name="vehicle_id"><option value="">— Seleccionar vehículo —</option>${vehicles.map(v=>`<option value="${esc(v.id)}" ${r?.vehicle_id===v.id?'selected':''}>${esc(v.plate)}</option>`).join('')}</select></label>
          <label>Conductor<select name="driver_id"><option value="">— Seleccionar conductor —</option>${drivers.map(d=>`<option value="${esc(d.id)}" ${r?.driver_id===d.id?'selected':''}>${esc(d.full_name)}${d.license_number?' · '+esc(d.license_number):''}</option>`).join('')}</select></label>
          <label>Licencia<input name="driver_license" value="${esc((drivers.find(d=>d.id===r?.driver_id)?.license_number)||'')}"></label>
          <label>Origen<input name="origin" value="${esc(r?.origin||'')}"></label>
          <label>Destino<input name="destination" value="${esc(r?.destination||'')}"></label>
        </div></div>
        <div class="qf-rec-section"><div class="qf-rec-lines-head"><h3>Materiales despachados</h3><button type="button" class="secondary" id="qfAddShipLine">+ Agregar material</button></div><div id="qfShipLines">${renderItems(r?.items)}</div></div>
        <div class="qf-rec-section"><div class="qf-rec-grid">
          <label>Motivo<select name="reason">${['Venta','Traslado','Devolución','Otro'].map(v=>`<option ${r?.reason===v?'selected':''}>${v}</option>`).join('')}</select></label>
          <label>Peso bruto (kg)<input name="gross_weight_kg" type="number" min="0" step="0.001" value="${esc(r?.gross_weight_kg??'')}"></label>
          <label>Estado<select name="status">${['registrado','preparando','despachado','entregado','anulado'].map(v=>`<option ${r?.status===v?'selected':''}>${v}</option>`).join('')}</select></label>
          <label class="wide">Observaciones<textarea name="observations" rows="3">${esc(r?.observations||'')}</textarea></label>
        </div></div>
        <div class="qf-rec-form-actions"><button type="button" class="secondary qf-rec-cancel">Cancelar</button><button class="primary" type="submit">${r?'Guardar cambios':'Guardar salida'}</button></div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelector('.qf-rec-close').onclick=close;
  modal.querySelector('.qf-rec-cancel').onclick=close;
  const customerSelect=modal.querySelector('#qfCustomer');
  customerSelect.onchange=()=>{const c=customers.find(x=>x.id===customerSelect.value);if(c){modal.querySelector('#qfCustomerName').value=c.business_name||'';modal.querySelector('#qfCustomerRuc').value=c.ruc||'';}};
  const lines=modal.querySelector('#qfShipLines');
  modal.querySelectorAll('.qf-line-remove').forEach(btn=>btn.onclick=()=>{if(lines.querySelectorAll('.qf-rec-line').length<=1){alert('La salida debe tener al menos un material.');return;}btn.closest('.qf-rec-line')?.remove();});
  modal.querySelector('#qfAddShipLine').onclick=()=>{
    const d=document.createElement('div');
    d.className='qf-rec-line';
    d.innerHTML=`<label>Producto<select class="lp">${productOptions()}</select></label><label>Cant. guía<input class="lg" type="number" min="0" step="0.001"></label><label>Cant. salida<input class="lr" type="number" min="0" step="0.001"></label><label>Peso kg<input class="lw" type="number" min="0" step="0.001"></label><label>Lote<input class="ll"></label><label>Estado<select class="lc"><option selected>Conforme</option><option>Pendiente</option><option>Rechazado</option></select></label><button type="button" class="qf-line-remove">×</button>`;
    lines.appendChild(d);
    d.querySelector('.qf-line-remove').onclick=()=>{if(lines.querySelectorAll('.qf-rec-line').length<=1){alert('La salida debe tener al menos un material.');return;}d.remove();};
  };
  modal.querySelector('#qfShipForm').onsubmit=async e=>save(e,id,modal,lines);
}

async function save(event,id,modal,lines){
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  if(!currentUser) await getUser();
  if(!currentUser){alert('La sesión no está disponible.');return;}

  const series=String(form.get('guide_series')||'').trim();
  const number=String(form.get('guide_number')||'').trim();
  const items=[...lines.querySelectorAll('.qf-rec-line')].map(d=>{
    const product=products.find(p=>p.id===d.querySelector('.lp').value);
    const quantity=num(d.querySelector('.lr').value||d.querySelector('.lg').value);
    return {product_id:product?.id||null,source_product_code:product?.internal_code||null,description_source:product?.name||'Material',quantity,unit:product?.base_unit||'kg',lot:d.querySelector('.ll').value.trim()||null,status:d.querySelector('.lc').value};
  }).filter(x=>x.product_id||x.quantity>0);

  if(!number){alert('Ingresa el número de guía.');return;}
  if(!String(form.get('customer_name')||'').trim()){alert('Ingresa el cliente.');return;}
  if(!items.length){alert('Agrega al menos un material.');return;}
  if(items.some(x=>x.quantity<=0)){alert('Cada material debe tener una cantidad mayor que cero.');return;}

  const payload={
    owner_id:currentUser.id,
    guide_number:series?`${series}-${number}`:number,
    guide_date:form.get('guide_date'),
    guide_time:form.get('guide_time')||null,
    reason:form.get('reason'),
    customer_id:form.get('customer_id')||null,
    purchase_order_id:form.get('purchase_order_id')||null,
    origin:String(form.get('origin')||'').trim()||null,
    destination:String(form.get('destination')||'').trim()||null,
    gross_weight_kg:form.get('gross_weight_kg')===''?null:num(form.get('gross_weight_kg')),
    vehicle_id:form.get('vehicle_id')||null,
    driver_id:form.get('driver_id')||null,
    status:form.get('status'),
    observations:String(form.get('observations')||'').trim()||null
  };

  let shipmentId=id;
  if(id){
    const {count,error:checkError}=await supabase.from('qf_inventory_movements').select('id',{count:'exact',head:true}).eq('shipment_id',id).eq('owner_id',currentUser.id);
    if(checkError){alert('No se pudo verificar Inventario: '+checkError.message);return;}
    if((count||0)>0){alert('Esta salida ya está vinculada a Inventario y no se puede editar.');return;}
    const {error}=await supabase.from('qf_shipments').update(payload).eq('id',id).eq('owner_id',currentUser.id);
    if(error){alert('No se pudo guardar: '+error.message);return;}
    const {error:itemError}=await supabase.from('qf_shipment_items').delete().eq('shipment_id',id).eq('owner_id',currentUser.id);
    if(itemError){alert('No se pudieron actualizar los materiales: '+itemError.message);return;}
  }else{
    const {data,error}=await supabase.from('qf_shipments').insert(payload).select('id').single();
    if(error){alert('No se pudo guardar: '+error.message);return;}
    shipmentId=data.id;
  }

  const insertItems=items.map((x,i)=>({...x,shipment_id:shipmentId,owner_id:currentUser.id,line_no:i+1}));
  const {error:itemError}=await supabase.from('qf_shipment_items').insert(insertItems);
  if(itemError){alert('La salida se guardó, pero hubo un error con los materiales: '+itemError.message);return;}
  modal.remove();
  await load();
  enhance();
}

async function remove(id){
  if(!currentUser) await getUser();
  if(!currentUser)return;
  const {count,error}=await supabase.from('qf_inventory_movements').select('id',{count:'exact',head:true}).eq('shipment_id',id).eq('owner_id',currentUser.id);
  if(error){alert('No se pudo verificar Inventario: '+error.message);return;}
  if((count||0)>0){alert('Esta salida ya tiene movimientos de Inventario. No se elimina para proteger la trazabilidad.');return;}
  const r=shipments.find(x=>x.id===id);
  if(!confirm(`¿Eliminar la salida ${r?.guide_number||''}?\n\nEsta acción no se puede deshacer.`))return;
  const {error:delError}=await supabase.from('qf_shipments').delete().eq('id',id).eq('owner_id',currentUser.id);
  if(delError){alert('No se pudo eliminar: '+delError.message);return;}
  await load();
  enhance();
}

function enhance(){
  if(enhancing)return;
  const main=document.querySelector('#content main');
  if(!main)return;
  const h1=[...main.querySelectorAll('h1')].find(x=>x.textContent.trim()==='Despachos');
  if(!h1)return;
  enhancing=true;
  try{
    h1.textContent='Salidas';
    const titleRow=h1.closest('.titleRow');
    if(titleRow){
      const old=titleRow.querySelector('button');
      if(old && /Cargar las 5 guías reales/i.test(old.textContent)){
        old.remove();
      }
      let action=titleRow.querySelector('.qf-salidas-new');
      if(!action){
        action=document.createElement('button');
        action.className='primary qf-salidas-new';
        action.type='button';
        action.textContent='+ Nueva salida';
        titleRow.appendChild(action);
        action.onclick=()=>openForm();
      }
    }

    const table=main.querySelector('.qf-table');
    if(table){
      const head=table.querySelector('thead tr');
      if(head && !head.querySelector('.qf-salidas-actions-head')){
        const th=document.createElement('th'); th.className='qf-salidas-actions-head'; th.textContent='Acciones'; head.appendChild(th);
      }
      const body=table.querySelector('tbody');
      if(body){
        [...body.querySelectorAll('tr')].forEach((tr,i)=>{
          if(tr.querySelector('.qf-salidas-actions'))return;
          const td=document.createElement('td'); td.className='qf-salidas-actions';
          const item=shipments[i];
          if(item){
            td.innerHTML=`<button type="button" class="secondary qf-salidas-edit">Ver / editar</button> <button type="button" class="secondary qf-salidas-del">Eliminar</button>`;
            td.querySelector('.qf-salidas-edit').onclick=()=>openForm(item.id);
            td.querySelector('.qf-salidas-del').onclick=()=>remove(item.id);
          }
          tr.appendChild(td);
        });
      }
    }
  }finally{enhancing=false;}
}

async function refresh(){
  try{await getUser();if(currentUser){await load();enhance();}}catch(error){console.error('Salidas:',error);}
}

document.addEventListener('click',event=>{
  const nav=event.target.closest('nav button[data-tab="despachos"]');
  if(nav) setTimeout(refresh,0);
});

window.addEventListener('load',()=>setTimeout(refresh,0));
supabase.auth.onAuthStateChange(()=>setTimeout(refresh,0));
