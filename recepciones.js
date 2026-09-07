import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY='sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

let currentUser=null;
let receipts=[];
let suppliers=[];
let products=[];

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
  const [r,s,p]=await Promise.all([
    supabase.from('qf_receipts').select('*').eq('owner_id',currentUser.id).order('receipt_date',{ascending:false}).order('receipt_time',{ascending:false}),
    supabase.from('qf_suppliers').select('*').eq('owner_id',currentUser.id).order('name'),
    supabase.from('qf_products').select('id,internal_code,name,base_unit,active').eq('owner_id',currentUser.id).eq('active',true).order('name')
  ]);
  if(r.error) throw r.error;
  if(s.error) throw s.error;
  if(p.error) throw p.error;
  receipts=r.data||[];
  suppliers=s.data||[];
  products=p.data||[];
  if(!receipts.length) return;
  const ids=receipts.map(x=>x.id);
  const {data:items,error}=await supabase.from('qf_receipt_items').select('*').in('receipt_id',ids).order('created_at');
  if(error) throw error;
  const byReceipt=new Map();
  for(const item of items||[]){
    const list=byReceipt.get(item.receipt_id)||[];
    list.push(item);
    byReceipt.set(item.receipt_id,list);
  }
  receipts.forEach(x=>{x.items=byReceipt.get(x.id)||[];});
}

function getContent(){ return document.querySelector('#content'); }

function render(){
  const target=getContent();
  if(!target) return;
  const weight=receipts.reduce((a,r)=>a+num(r.total_weight_kg),0);
  const pending=receipts.filter(r=>r.status==='Pendiente de revisión').length;
  const providerCount=new Set(receipts.map(r=>r.supplier_name).filter(Boolean)).size;

  target.innerHTML=`
    <main class="qf-rec-page">
      <div class="qf-rec-titlebar">
        <div><h1>Entradas</h1><p>Ingreso de materiales, guías de remisión y control de proveedores.</p></div>
        <button class="primary qf-rec-new" type="button">+ Nueva entrada</button>
      </div>
      <section class="qf-rec-kpis">
        <div class="qf-rec-card"><span>Entradas</span><strong>${receipts.length}</strong></div>
        <div class="qf-rec-card"><span>Peso recibido</span><strong>${weight.toLocaleString('es-PE')} kg</strong></div>
        <div class="qf-rec-card"><span>Proveedores</span><strong>${providerCount}</strong></div>
        <div class="qf-rec-card"><span>Pendientes de revisión</span><strong>${pending}</strong></div>
      </section>
      <section class="qf-rec-panel">
        <div class="qf-rec-panel-head"><h2>Entradas de materiales</h2><span>${receipts.length} registro(s)</span></div>
        ${receipts.length?`<div class="qf-rec-table-wrap"><table class="qf-rec-table"><thead><tr><th>Fecha</th><th>Guía</th><th>Proveedor</th><th>OC</th><th>Peso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
          ${receipts.map(r=>`<tr><td>${esc(r.receipt_date)}</td><td><b>${esc([r.guide_series,r.guide_number].filter(Boolean).join('-')||'Sin guía')}</b></td><td>${esc(r.supplier_name||'')}</td><td>${esc(r.purchase_order||'—')}</td><td>${num(r.total_weight_kg).toLocaleString('es-PE')} kg</td><td><span class="qf-rec-status">${esc(r.status||'')}</span></td><td><button class="secondary qf-rec-edit" type="button" data-id="${esc(r.id)}">Ver / editar</button> <button class="secondary qf-rec-del" type="button" data-id="${esc(r.id)}">Eliminar</button></td></tr>`).join('')}
        </tbody></table></div>`:`<div class="qf-rec-empty"><div class="qf-rec-empty-icon">📥</div><h3>Aún no hay entradas</h3><p>Registra aquí las guías con las que los proveedores ingresan materiales a la planta.</p><button class="primary qf-rec-first" type="button">+ Registrar primera entrada</button></div>`}
      </section>
    </main>`;

  target.querySelector('.qf-rec-new')?.addEventListener('click',()=>openForm());
  target.querySelector('.qf-rec-first')?.addEventListener('click',()=>openForm());
  target.querySelectorAll('.qf-rec-edit').forEach(b=>b.onclick=()=>openForm(b.dataset.id));
  target.querySelectorAll('.qf-rec-del').forEach(b=>b.onclick=()=>removeReceipt(b.dataset.id));
}

function openForm(id=null){
  const r=id?receipts.find(x=>x.id===id):null;
  const modal=document.createElement('div');
  modal.className='qf-rec-modal';
  modal.innerHTML=`
    <div class="qf-rec-modal-card">
      <div class="qf-rec-modal-head"><div><h2>${r?'Editar entrada':'Nueva entrada'}</h2><p>Registra el documento, transporte y materiales recibidos.</p></div><button type="button" class="qf-rec-close">×</button></div>
      <form id="qfRecForm">
        <div class="qf-rec-section"><h3>Documento y proveedor</h3><div class="qf-rec-grid">
          <label>Fecha<input name="receipt_date" type="date" required value="${esc(r?.receipt_date||today())}"></label>
          <label>Hora<input name="receipt_time" type="time" value="${esc(r?.receipt_time||'')}"></label>
          <label>Tipo<select name="document_type"><option ${!r||r?.document_type==='Guía de Remisión'?'selected':''}>Guía de Remisión</option><option ${r?.document_type==='Factura'?'selected':''}>Factura</option><option ${r?.document_type==='Otro'?'selected':''}>Otro</option></select></label>
          <label>Serie<input name="guide_series" placeholder="E001" value="${esc(r?.guide_series||'')}"></label>
          <label>Número<input name="guide_number" placeholder="00001234" value="${esc(r?.guide_number||'')}"></label>
          <label>Orden de compra<input name="purchase_order" value="${esc(r?.purchase_order||'')}"></label>
          <label class="wide">Proveedor<select name="supplier_id" id="qfSupplier"><option value="">— Seleccionar proveedor —</option>${suppliers.map(s=>`<option value="${s.id}" ${r?.supplier_id===s.id?'selected':''}>${esc(s.name)}${s.ruc?' · RUC '+esc(s.ruc):''}</option>`).join('')}</select></label>
          <label>Nombre proveedor<input name="supplier_name" id="qfSupplierName" required value="${esc(r?.supplier_name||'')}"></label>
          <label>RUC<input name="supplier_ruc" id="qfSupplierRuc" value="${esc(r?.supplier_ruc||'')}"></label>
        </div></div>
        <div class="qf-rec-section"><h3>Transporte</h3><div class="qf-rec-grid"><label>Placa<input name="vehicle_plate" value="${esc(r?.vehicle_plate||'')}"></label><label>Conductor<input name="driver_name" value="${esc(r?.driver_name||'')}"></label><label>Licencia<input name="driver_license" value="${esc(r?.driver_license||'')}"></label><label>Origen<input name="origin" value="${esc(r?.origin||'')}"></label></div></div>
        <div class="qf-rec-section"><div class="qf-rec-lines-head"><h3>Materiales recibidos</h3><button type="button" class="secondary" id="qfAddLine">+ Agregar material</button></div><div id="qfLines"></div></div>
        <div class="qf-rec-section"><div class="qf-rec-grid"><label>Estado<select name="status">${['Registrada','Pendiente de revisión','Recibida','Aprobada','Rechazada'].map(v=>`<option ${r?.status===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="wide">Observaciones<textarea name="observations" rows="3">${esc(r?.observations||'')}</textarea></label></div></div>
        <div class="qf-rec-form-actions"><button type="button" class="secondary qf-rec-cancel">Cancelar</button><button class="primary" type="submit">${r?'Guardar cambios':'Guardar entrada'}</button></div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelector('.qf-rec-close').onclick=close;
  modal.querySelector('.qf-rec-cancel').onclick=close;
  const supplier=modal.querySelector('#qfSupplier');
  supplier.onchange=()=>{const s=suppliers.find(x=>x.id===supplier.value);if(s){modal.querySelector('#qfSupplierName').value=s.name||'';modal.querySelector('#qfSupplierRuc').value=s.ruc||'';}};
  const lines=modal.querySelector('#qfLines');
  const add=item=>{
    const d=document.createElement('div');
    d.className='qf-rec-line';
    d.innerHTML=`<label>Producto<select class="lp"><option value="">— Producto —</option>${products.map(p=>`<option value="${p.id}" ${item?.product_id===p.id?'selected':''}>${esc(p.name)} (${esc(p.internal_code||'')})</option>`).join('')}</select></label><label>Cant. guía<input class="lg" type="number" min="0" step="0.001" value="${item?.quantity_guide??''}"></label><label>Cant. recibida<input class="lr" type="number" min="0" step="0.001" value="${item?.quantity_received??''}"></label><label>Peso kg<input class="lw" type="number" min="0" step="0.001" value="${item?.weight_kg??''}"></label><label>Lote<input class="ll" value="${esc(item?.lot||'')}"></label><label>Estado<select class="lc"><option ${item?.condition==='Conforme'||!item?'selected':''}>Conforme</option><option ${item?.condition==='Con diferencia'?'selected':''}>Con diferencia</option><option ${item?.condition==='Rechazado'?'selected':''}>Rechazado</option></select></label><button type="button" class="qf-line-remove">×</button>`;
    lines.appendChild(d);
    d.querySelector('.qf-line-remove').onclick=()=>d.remove();
  };
  (r?.items?.length?r.items:[{}]).forEach(add);
  modal.querySelector('#qfAddLine').onclick=()=>add({});
  modal.querySelector('#qfRecForm').onsubmit=async e=>saveReceipt(e,id,modal,lines);
}

async function saveReceipt(event,id,modal,lines){
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const items=[...lines.querySelectorAll('.qf-rec-line')].map(d=>{const p=products.find(x=>x.id===d.querySelector('.lp').value);return {product_id:p?.id||null,codigo:p?.internal_code||null,material:p?.name||null,description:p?.name||'Material',unit:p?.base_unit||null,quantity_guide:num(d.querySelector('.lg').value),quantity_received:num(d.querySelector('.lr').value),weight_kg:num(d.querySelector('.lw').value),lot:d.querySelector('.ll').value.trim()||null,condition:d.querySelector('.lc').value};}).filter(x=>x.product_id||x.quantity_guide||x.quantity_received||x.weight_kg);
  if(!String(form.get('supplier_name')||'').trim()){alert('Ingresa el proveedor.');return;}
  if(!items.length){alert('Agrega al menos un material.');return;}
  if(!currentUser) await getUser();
  if(!currentUser){alert('La sesión no está disponible.');return;}
  const payload={owner_id:currentUser.id,receipt_date:form.get('receipt_date'),receipt_time:form.get('receipt_time')||null,document_type:form.get('document_type'),guide_series:String(form.get('guide_series')||'').trim()||null,guide_number:String(form.get('guide_number')||'').trim()||null,supplier_id:form.get('supplier_id')||null,supplier_name:String(form.get('supplier_name')).trim(),supplier_ruc:String(form.get('supplier_ruc')||'').trim()||null,purchase_order:String(form.get('purchase_order')||'').trim()||null,vehicle_plate:String(form.get('vehicle_plate')||'').trim()||null,driver_name:String(form.get('driver_name')||'').trim()||null,driver_license:String(form.get('driver_license')||'').trim()||null,origin:String(form.get('origin')||'').trim()||null,status:form.get('status'),total_quantity:items.reduce((a,x)=>a+num(x.quantity_received),0),total_weight_kg:items.reduce((a,x)=>a+num(x.weight_kg),0),observations:String(form.get('observations')||'').trim()||null,updated_at:new Date().toISOString()};
  let receiptId=id;
  if(id){const {error}=await supabase.from('qf_receipts').update(payload).eq('id',id).eq('owner_id',currentUser.id);if(error){alert('No se pudo guardar: '+error.message);return;}const {error:itemError}=await supabase.from('qf_receipt_items').delete().eq('receipt_id',id);if(itemError){alert('No se pudieron actualizar los materiales: '+itemError.message);return;}}
  else {const {data,error}=await supabase.from('qf_receipts').insert(payload).select('id').single();if(error){alert('No se pudo guardar: '+error.message);return;}receiptId=data.id;}
  const {error:itemError}=await supabase.from('qf_receipt_items').insert(items.map(x=>({...x,receipt_id:receiptId})));
  if(itemError){alert('La entrada se guardó, pero hubo un error con los materiales: '+itemError.message);return;}
  modal.remove();
  await load();
  render();
}

async function removeReceipt(id){
  if(!currentUser) await getUser();
  if(!currentUser)return;
  if(!confirm('¿Eliminar esta entrada y sus materiales?'))return;
  const {error}=await supabase.from('qf_receipts').delete().eq('id',id).eq('owner_id',currentUser.id);
  if(error){alert('No se pudo eliminar: '+error.message);return;}
  await load();
  render();
}

window.qfOpenRecepciones=async()=>{
  try{await getUser();if(!currentUser){alert('Inicia sesión para acceder a Entradas.');return;}await load();render();}
  catch(error){console.error('Entradas:',error);alert('No se pudo cargar Entradas: '+(error?.message||error));}
};
