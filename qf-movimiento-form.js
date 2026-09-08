import { createClient } from '@supabase/supabase-js';

const supabase=createClient('https://cgkdztwtodmdteohvuoh.supabase.co','sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe');
const DOCS=['Guía de Remisión','Factura','Boleta','Nota de Crédito','Nota de Débito','Otro'];
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const today=()=>new Date().toISOString().slice(0,10);

function installStyle(){
  if(document.getElementById('qf-movimiento-form-style'))return;
  const s=document.createElement('style');s.id='qf-movimiento-form-style';
  s.textContent='.qf-mf-row{display:flex;gap:8px;align-items:end;width:100%}.qf-mf-row>label{flex:1;min-width:0}.qf-mf-new{height:42px;white-space:nowrap;padding:0 12px!important}.qf-mf-panel{margin-top:10px;padding:12px;border:1px solid #33423d;border-radius:10px;background:#0d1312}.qf-mf-panel-title{font-weight:700;margin-bottom:10px}.qf-mf-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.qf-mf-panel label{display:flex;flex-direction:column;gap:5px;color:#9db0ba;font-size:13px}.qf-mf-panel input,.qf-mf-panel select{box-sizing:border-box;width:100%;background:#0b1110;color:#f3f7f8;border:1px solid #33423d;border-radius:8px;padding:9px 10px;font:inherit}.qf-mf-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.qf-mf-msg{font-size:13px;color:#ff9c9c;margin-top:7px}@media(max-width:760px){.qf-mf-row{flex-direction:column;align-items:stretch}.qf-mf-new{width:100%}.qf-mf-grid{grid-template-columns:1fr}}';
  document.head.appendChild(s);
}

async function getUser(){const {data,error}=await supabase.auth.getUser();if(error)throw error;if(!data?.user)throw Error('La sesión no está disponible.');return data.user}
async function loadMasters(){const u=await getUser();const [c,s,v,d,p,o,oc]=await Promise.all([
  supabase.from('qf_customers').select('id,business_name,ruc').eq('owner_id',u.id).eq('active',true).order('business_name'),
  supabase.from('qf_suppliers').select('id,name,ruc').eq('owner_id',u.id).order('name'),
  supabase.from('qf_vehicles').select('id,plate').eq('owner_id',u.id).eq('active',true).order('plate'),
  supabase.from('qf_drivers').select('id,full_name,license_number').eq('owner_id',u.id).eq('active',true).order('full_name'),
  supabase.from('qf_products').select('id,internal_code,name,base_unit').eq('owner_id',u.id).eq('active',true).order('name'),
  supabase.from('qf_master_options').select('option_type,value').eq('owner_id',u.id).eq('active',true).order('value'),
  supabase.from('qf_purchase_orders').select('id,oc_number,operating_unit,status,customer_id').eq('owner_id',u.id).order('oc_number')
]);
  for(const r of [c,s,v,d,p,o,oc])if(r.error)throw r.error;
  return {u,customers:c.data||[],suppliers:s.data||[],vehicles:v.data||[],drivers:d.data||[],products:p.data||[],locations:o.data||[],orders:oc.data||[]};
}
function optionHtml(value,label,selected){return '<option value="'+esc(value)+'"'+(String(value)===String(selected??'')?' selected':'')+'>'+esc(label)+'</option>'}
function selectHtml(name,items,selected,placeholder,getValue,getLabel){let html='<select name="'+esc(name)+'"><option value="">'+esc(placeholder)+'</option>';for(const item of items)html+=optionHtml(getValue(item),getLabel(item),selected);return html+'</select>'}
function fieldRow(label,control,type,text){return '<div class="qf-mf-row"><label>'+label+control+'</label><button type="button" class="secondary qf-mf-new" data-qf-new="'+type+'">+ '+text+'</button></div>'}
function findDriver(drivers,value){return drivers.find(x=>x.id===value||x.full_name===value)}

async function saveMaster(modal,type,panel,button,refresh){
  const msg=panel.querySelector('.qf-mf-msg');const a=panel.querySelector('.a')?.value.trim();const b=panel.querySelector('.b')?.value.trim();
  if(!a){msg.textContent='Completa el dato requerido.';return}
  try{
    const u=await getUser();let selected=null;
    if(type==='customer'){
      const q=await supabase.from('qf_customers').select('id').eq('owner_id',u.id).ilike('business_name',a).limit(1);if(q.error)throw q.error;
      if(q.data?.[0])selected=q.data[0].id;else{const x=await supabase.from('qf_customers').insert({owner_id:u.id,business_name:a,ruc:b||null,active:true}).select('id').single();if(x.error)throw x.error;selected=x.data.id}
    }else if(type==='supplier'){
      const q=await supabase.from('qf_suppliers').select('id').eq('owner_id',u.id).ilike('name',a).limit(1);if(q.error)throw q.error;
      if(q.data?.[0])selected=q.data[0].id;else{const x=await supabase.from('qf_suppliers').insert({owner_id:u.id,name:a,ruc:b||null}).select('id').single();if(x.error)throw x.error;selected=x.data.id}
    }else if(type==='vehicle'){
      const q=await supabase.from('qf_vehicles').select('id,plate').eq('owner_id',u.id).ilike('plate',a).limit(1);if(q.error)throw q.error;
      const row=q.data?.[0];if(row)selected=row.plate;else{const x=await supabase.from('qf_vehicles').insert({owner_id:u.id,plate:a,active:true}).select('plate').single();if(x.error)throw x.error;selected=x.data.plate}
    }else if(type==='driver'){
      if(!b)throw Error('Ingresa la licencia.');
      const q=await supabase.from('qf_drivers').select('id,full_name,license_number').eq('owner_id',u.id).ilike('full_name',a).limit(1);if(q.error)throw q.error;
      const row=q.data?.[0];if(row)selected=row.full_name;else{const x=await supabase.from('qf_drivers').insert({owner_id:u.id,full_name:a,license_number:b,active:true}).select('full_name,license_number').single();if(x.error)throw x.error;selected=x.data.full_name}
    }else if(type==='origin'||type==='destination'){
      const option_type=type==='origin'?'origen':'destino';const q=await supabase.from('qf_master_options').select('id').eq('owner_id',u.id).eq('option_type',option_type).ilike('value',a).limit(1);if(q.error)throw q.error;
      if(!q.data?.length){const x=await supabase.from('qf_master_options').insert({owner_id:u.id,option_type,value:a,active:true}).select('id').single();if(x.error)throw x.error}selected=a;
    }else if(type==='product'){
      if(!b)throw Error('Ingresa el código interno.');const unit=panel.querySelector('.c').value;
      const q=await supabase.from('qf_products').select('id').eq('owner_id',u.id).eq('internal_code',b).limit(1);if(q.error)throw q.error;
      if(q.data?.[0])selected=q.data[0].id;else{const x=await supabase.from('qf_products').insert({owner_id:u.id,internal_code:b,name:a,base_unit:unit,active:true}).select('id').single();if(x.error)throw x.error;selected=x.data.id}
    }else if(type==='order'){
      let customerId=modal.querySelector('[name="customer_id"]')?.value||null;
      if(!customerId){const supplierId=modal.querySelector('[name="supplier_id"]')?.value;if(supplierId){const z=await supabase.from('qf_suppliers').select('name,ruc').eq('id',supplierId).maybeSingle();if(z.error)throw z.error;if(z.data){const c=await supabase.from('qf_customers').select('id').eq('owner_id',u.id).ilike('business_name',z.data.name).limit(1);if(c.error)throw c.error;customerId=c.data?.[0]?.id;if(!customerId){const cr=await supabase.from('qf_customers').insert({owner_id:u.id,business_name:z.data.name,ruc:z.data.ruc||null,active:true}).select('id').single();if(cr.error)throw cr.error;customerId=cr.data.id}}}}
      if(!customerId)throw Error('Selecciona primero cliente o proveedor para asociar la O/C.');
      const x=await supabase.from('qf_purchase_orders').insert({owner_id:u.id,customer_id:customerId,oc_number:a,operating_unit:b||null,status:panel.querySelector('.c').value}).select('id,oc_number').single();if(x.error)throw x.error;selected=x.data.id;
    }
    panel.remove();await refresh(selected,type);button.dispatchEvent(new Event('change',{bubbles:true}));
  }catch(e){msg.textContent='No se pudo guardar: '+(e?.message||e)}
}

function openMasterPanel(modal,type,button,refresh){
  const old=modal.querySelector('[data-qf-panel="'+type+'"]');if(old){old.remove();return}
  const titles={customer:'Nuevo cliente',supplier:'Nuevo proveedor',vehicle:'Nuevo transporte',driver:'Nuevo conductor',origin:'Nuevo origen',destination:'Nuevo destino',product:'Nuevo producto',order:'Nueva O/C'};
  let body='';
  if(type==='customer'||type==='supplier')body='<label>Razón social / nombre<input class="a" required></label><label>RUC<input class="b"></label>';
  else if(type==='vehicle')body='<label>Placa<input class="a" required placeholder="ABC-123"></label>';
  else if(type==='driver')body='<label>Nombre completo<input class="a" required></label><label>Licencia<input class="b" required></label>';
  else if(type==='origin'||type==='destination')body='<label>'+titles[type].replace('Nuevo ','')+'<input class="a" required></label>';
  else if(type==='product')body='<label>Nombre del producto<input class="a" required></label><label>Código interno<input class="b" required></label><label>Unidad<select class="c"><option value="kg">kg</option><option value="unidad">unidad</option><option value="saco">saco</option><option value="caja">caja</option><option value="litro">litro</option><option value="otro">otro</option></select></label>';
  else body='<label>N.º de O/C<input class="a" required></label><label>Unidad / referencia<input class="b"></label><label>Estado<select class="c"><option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="atendida">Atendida</option><option value="cancelada">Cancelada</option></select></label>';
  const panel=document.createElement('div');panel.className='qf-mf-panel';panel.dataset.qfPanel=type;panel.innerHTML='<div class="qf-mf-panel-title">'+titles[type]+'</div><div class="qf-mf-grid">'+body+'</div><div class="qf-mf-actions"><button type="button" class="secondary qf-mf-cancel">Cancelar</button><button type="button" class="primary qf-mf-save">Guardar</button></div><div class="qf-mf-msg"></div>';
  (button.closest('.qf-rec-section')||modal).appendChild(panel);
  panel.querySelector('.qf-mf-cancel').onclick=()=>panel.remove();panel.querySelector('.qf-mf-save').onclick=()=>saveMaster(modal,type,panel,button,refresh);
}

export async function openMovimientoForm({mode,record=null,onSaved}){
  installStyle();const m=await loadMasters();const isEntry=mode==='entrada';const thirdLabel=isEntry?'Proveedor':'Cliente';const thirdSelectName=isEntry?'supplier_id':'customer_id';const selectedThird=isEntry?record?.supplier_id:record?.customer_id;
  const modal=document.createElement('div');modal.className='qf-rec-modal';
  const thirdItems=isEntry?m.suppliers:m.customers;const thirdPlaceholder=isEntry?'— Seleccionar proveedor —':'— Seleccionar cliente —';
  const thirdSelect=isEntry?selectHtml('supplier_id',m.suppliers,selectedThird,thirdPlaceholder,x=>x.id,x=>x.name+(x.ruc?' · RUC '+x.ruc:'')):selectHtml('customer_id',m.customers,selectedThird,thirdPlaceholder,x=>x.id,x=>x.business_name+(x.ruc?' · RUC '+x.ruc:''));
  const orderSelect=isEntry?selectHtml('purchase_order',m.orders,record?.purchase_order,'— Seleccionar O/C —',x=>x.oc_number,x=>x.oc_number+(x.operating_unit?' · '+x.operating_unit:'')):selectHtml('purchase_order_id',m.orders,record?.purchase_order_id,'— Seleccionar O/C —',x=>x.id,x=>x.oc_number+(x.operating_unit?' · '+x.operating_unit:''));
  const vehicleSelect=selectHtml('vehicle',m.vehicles,isEntry?record?.vehicle_plate:record?.vehicle_id,'— Seleccionar vehículo —',x=>isEntry?x.plate:x.id,x=>x.plate);
  const driverSelect=selectHtml('driver',m.drivers,isEntry?record?.driver_name:record?.driver_id,'— Seleccionar conductor —',x=>isEntry?x.full_name:x.id,x=>x.full_name);
  const originSelect=selectHtml('origin',m.locations.filter(x=>x.option_type==='origen'),record?.origin,'— Seleccionar origen —',x=>x.value,x=>x.value);
  const destinationSelect=selectHtml('destination',m.locations.filter(x=>x.option_type==='destino'),record?.destination,'— Seleccionar destino —',x=>x.value,x=>x.value);
  const date=record?.[isEntry?'receipt_date':'guide_date']||today();const time=String(record?.[isEntry?'receipt_time':'guide_time']||'').slice(0,5);
  const statusItems=isEntry?['Registrada','Pendiente de revisión','Recibida','Aprobada','Rechazada']:['registrado','preparando','despachado','entregado','anulado'];
  let html='<div class="qf-rec-modal-card"><div class="qf-rec-modal-head"><div><h2>'+(isEntry?(record?'Editar entrada':'Nueva entrada'):(record?'Editar salida':'Nueva salida'))+'</h2><p>Registra documento, '+thirdLabel.toLowerCase()+', transporte y materiales.</p></div><button type="button" class="qf-rec-close">×</button></div><form class="qf-mf-form">';
  html+='<div class="qf-rec-section"><h3>Documento y '+thirdLabel.toLowerCase()+'</h3><div class="qf-rec-grid">';
  html+='<label>Fecha<input name="date" type="date" required value="'+esc(date)+'"></label><label>Hora<input name="time" type="time" value="'+esc(time)+'"></label><label>Tipo de documento<select name="document_type">';
  for(const d of DOCS)html+='<option value="'+esc(d)+'"'+(d===(record?.document_type||'Guía de Remisión')?' selected':'')+'>'+esc(d)+'</option>';
  html+='</select></label><label>Serie<input name="series" value="'+esc(record?.guide_series||'')+'"></label><label>Número<input name="number" required value="'+esc(record?.guide_number||'')+'"></label>';
  html+='<div>'+fieldRow('Orden de compra',orderSelect,'order','Nueva O/C')+'</div>';
  html+='<div class="wide">'+fieldRow(thirdLabel,thirdSelect,isEntry?'supplier':'customer','Nuevo '+thirdLabel.toLowerCase())+'</div>';
  const thirdName=isEntry?(record?.supplier_name||''):(m.customers.find(x=>x.id===selectedThird)?.business_name||'');const thirdRuc=isEntry?(record?.supplier_ruc||''):(m.customers.find(x=>x.id===selectedThird)?.ruc||'');
  html+='<label>'+thirdLabel+' seleccionado<input name="third_name" readonly value="'+esc(thirdName)+'"></label><label>RUC<input name="third_ruc" readonly value="'+esc(thirdRuc)+'"></label></div></div>';
  html+='<div class="qf-rec-section"><h3>Transporte</h3><div class="qf-rec-grid">';
  html+='<div>'+fieldRow('Placa',vehicleSelect,'vehicle','Nuevo transporte')+'</div><div>'+fieldRow('Conductor',driverSelect,'driver','Nuevo conductor')+'</div>';
  const drv=findDriver(m.drivers,isEntry?record?.driver_name:record?.driver_id);const lic=record?.driver_license||drv?.license_number||'';
  html+='<label>Licencia<input name="driver_license" readonly value="'+esc(lic)+'"></label><div>'+fieldRow('Origen',originSelect,'origin','Nuevo origen')+'</div><div>'+fieldRow('Destino',destinationSelect,'destination','Nuevo destino')+'</div></div></div>';
  html+='<div class="qf-rec-section"><div class="qf-rec-lines-head"><h3>'+(isEntry?'Materiales recibidos':'Materiales despachados')+'</h3><button type="button" class="secondary" data-add-line>+ Agregar material</button></div><div data-lines></div></div>';
  html+='<div class="qf-rec-section"><div class="qf-rec-grid"><label>Estado<select name="status">';for(const st of statusItems)html+='<option value="'+esc(st)+'"'+(st===record?.status?' selected':'')+'>'+esc(st)+'</option>';html+='</select></label>';
  if(!isEntry)html+='<label>Peso bruto (kg)<input name="gross_weight_kg" type="number" min="0" step="0.001" value="'+esc(record?.gross_weight_kg??'')+'"></label><label>Motivo<select name="reason"><option>Venta</option><option>Traslado</option><option>Devolución</option><option>Otro</option></select></label>';
  html+='<label class="wide">Observaciones<textarea name="observations" rows="3">'+esc(record?.observations||'')+'</textarea></label></div></div>';
  html+='<div class="qf-rec-form-actions"><button type="button" class="secondary qf-rec-cancel">Cancelar</button><button type="submit" class="primary">'+(record?'Guardar cambios':isEntry?'Guardar entrada':'Guardar salida')+'</button></div></form></div>';
  modal.innerHTML=html;document.body.appendChild(modal);
  const close=()=>modal.remove();modal.querySelector('.qf-rec-close').onclick=close;modal.querySelector('.qf-rec-cancel').onclick=close;
  const form=modal.querySelector('form');const third=modal.querySelector('[name="'+thirdSelectName+'"]');const updateThird=()=>{const row=thirdItems.find(x=>x.id===third.value);modal.querySelector('[name="third_name"]').value=row?(isEntry?row.name:row.business_name):'';modal.querySelector('[name="third_ruc"]').value=row?.ruc||''};third.onchange=updateThird;
  const driver=modal.querySelector('[name="driver"]');const updateLicense=()=>{const row=findDriver(m.drivers,driver.value);modal.querySelector('[name="driver_license"]').value=row?.license_number||''};driver.onchange=updateLicense;
  const lines=modal.querySelector('[data-lines]');
  const addLine=item=>{const d=document.createElement('div');d.className='qf-rec-line';const product=selectHtml('product',m.products,item?.product_id,'— Seleccionar producto —',x=>x.id,x=>x.name+(x.internal_code?' · '+x.internal_code:''));
    if(isEntry)d.innerHTML='<label>Producto'+product+'</label><label>Cant. guía<input class="lg" type="number" min="0" step="0.001" value="'+esc(item?.quantity_guide??'')+'"></label><label>Cant. recibida<input class="lr" type="number" min="0" step="0.001" value="'+esc(item?.quantity_received??'')+'"></label><label>Peso kg<input class="lw" type="number" min="0" step="0.001" value="'+esc(item?.weight_kg??'')+'"></label><label>Lote<input class="ll" value="'+esc(item?.lot||'')+'"></label><label>Estado<select class="lc"><option'+(item?.condition==='Conforme'||!item?' selected':'')+'>Conforme</option><option'+(item?.condition==='Con diferencia'?' selected':'')+'>Con diferencia</option><option'+(item?.condition==='Rechazado'?' selected':'')+'>Rechazado</option></select></label><button type="button" class="qf-line-remove">×</button>';
    else d.innerHTML='<label>Producto'+product+'</label><label>Cantidad<input class="lq" type="number" min="0" step="0.001" value="'+esc(item?.quantity??'')+'"></label><label>Peso kg<input class="lw" type="number" min="0" step="0.001" value="'+esc(item?.weight_kg??'')+'"></label><label>Lote<input class="ll" value="'+esc(item?.lot||'')+'"></label><button type="button" class="qf-line-remove">×</button>';
    lines.appendChild(d);d.querySelector('.qf-line-remove').onclick=()=>{if(lines.children.length>1)d.remove()};
    const psel=d.querySelector('.lp');const pb=document.createElement('button');pb.type='button';pb.className='secondary qf-mf-new';pb.textContent='+ Nuevo producto';pb.style.marginTop='22px';pb.onclick=()=>openMasterPanel(modal,'product',pb,async selected=>{const mm=await loadMasters();psel.innerHTML=selectHtml('product',mm.products,selected,'— Seleccionar producto —',x=>x.id,x=>x.name+(x.internal_code?' · '+x.internal_code:''));psel.value=selected});psel.parentElement.appendChild(pb);
  };
  (record?.items?.length?record.items:[{}]).forEach(addLine);modal.querySelector('[data-add-line]').onclick=()=>addLine({});
  const refresh=async(selected,type)=>{const mm=await loadMasters();let el;
    if(type==='customer'||type==='supplier'){el=modal.querySelector('[name="'+thirdSelectName+'"]');el.innerHTML=selectHtml(thirdSelectName,isEntry?mm.suppliers:mm.customers,selected,isEntry?'— Seleccionar proveedor —':'— Seleccionar cliente —',x=>x.id,x=>isEntry?x.name+(x.ruc?' · RUC '+x.ruc:''):x.business_name+(x.ruc?' · RUC '+x.ruc:''));el.value=selected;updateThird()}
    else if(type==='vehicle'){el=modal.querySelector('[name="vehicle"]');el.innerHTML=selectHtml('vehicle',mm.vehicles,selected,'— Seleccionar vehículo —',x=>isEntry?x.plate:x.id,x=>x.plate);el.value=selected}
    else if(type==='driver'){el=modal.querySelector('[name="driver"]');el.innerHTML=selectHtml('driver',mm.drivers,selected,'— Seleccionar conductor —',x=>isEntry?x.full_name:x.id,x=>x.full_name);el.value=selected;updateLicense()}
    else if(type==='origin'||type==='destination'){el=modal.querySelector('[name="'+type+'"]');el.innerHTML=selectHtml(type,mm.locations.filter(x=>x.option_type===(type==='origin'?'origen':'destino')),selected,'— Seleccionar '+type+' —',x=>x.value,x=>x.value);el.value=selected}
    else if(type==='order'){el=modal.querySelector('[name="'+(isEntry?'purchase_order':'purchase_order_id')+'"]');el.innerHTML=isEntry?selectHtml('purchase_order',mm.orders,mm.orders.find(x=>x.id===selected)?.oc_number||selected,'— Seleccionar O/C —',x=>x.oc_number,x=>x.oc_number+(x.operating_unit?' · '+x.operating_unit:'')):selectHtml('purchase_order_id',mm.orders,selected,'— Seleccionar O/C —',x=>x.id,x=>x.oc_number+(x.operating_unit?' · '+x.operating_unit:''));if(isEntry)el.value=selected}
  };
  modal.querySelectorAll('[data-qf-new]').forEach(b=>b.onclick=()=>openMasterPanel(modal,b.dataset.qfNew,b,refresh));
  form.onsubmit=async e=>{e.preventDefault();try{const u=await getUser();const f=new FormData(form);if(!String(f.get('third_name')||'').trim())throw Error('Selecciona un '+thirdLabel.toLowerCase()+'.');
      if(isEntry){const items=[...lines.children].map(d=>{const p=m.products.find(x=>x.id===d.querySelector('.lp').value);return{product_id:p?.id||null,codigo:p?.internal_code||null,material:p?.name||null,description:p?.name||'Material',unit:p?.base_unit||null,quantity_guide:num(d.querySelector('.lg').value),quantity_received:num(d.querySelector('.lr').value),weight_kg:num(d.querySelector('.lw').value),lot:d.querySelector('.ll').value.trim()||null,condition:d.querySelector('.lc').value}}).filter(x=>x.product_id||x.quantity_guide||x.quantity_received||x.weight_kg);if(!items.length)throw Error('Agrega al menos un material.');const payload={owner_id:u.id,receipt_date:f.get('date'),receipt_time:f.get('time')||null,document_type:f.get('document_type'),guide_series:String(f.get('series')||'').trim()||null,guide_number:String(f.get('number')||'').trim()||null,supplier_id:f.get('supplier_id')||null,supplier_name:String(f.get('third_name')).trim(),supplier_ruc:String(f.get('third_ruc')||'').trim()||null,purchase_order:String(f.get('purchase_order')||'').trim()||null,vehicle_plate:String(f.get('vehicle')||'').trim()||null,driver_name:String(f.get('driver')||'').trim()||null,driver_license:String(f.get('driver_license')||'').trim()||null,origin:String(f.get('origin')||'').trim()||null,destination:String(f.get('destination')||'').trim()||null,status:f.get('status'),total_quantity:items.reduce((a,x)=>a+num(x.quantity_received),0),total_weight_kg:items.reduce((a,x)=>a+num(x.weight_kg),0),observations:String(f.get('observations')||'').trim()||null,updated_at:new Date().toISOString()};let id=record?.id;if(id){const r=await supabase.from('qf_receipts').update(payload).eq('id',id).eq('owner_id',u.id);if(r.error)throw r.error;const d=await supabase.from('qf_receipt_items').delete().eq('receipt_id',id);if(d.error)throw d.error}else{const r=await supabase.from('qf_receipts').insert(payload).select('id').single();if(r.error)throw r.error;id=r.data.id}const r2=await supabase.from('qf_receipt_items').insert(items.map(x=>({...x,receipt_id:id})));if(r2.error)throw r2.error}
      else {const items=[...lines.children].map(d=>{const p=m.products.find(x=>x.id===d.querySelector('.lp').value);return{product_id:p?.id||null,source_product_code:p?.internal_code||null,description_source:p?.name||'Material',quantity:num(d.querySelector('.lq').value),unit:p?.base_unit||'kg',package_type:null,package_count:null,weight_per_package_kg:null,lot:d.querySelector('.ll').value.trim()||null,condition:'Conforme'}}).filter(x=>x.product_id&&x.quantity>0);if(!items.length)throw Error('Agrega al menos un material con cantidad mayor que cero.');const s=String(f.get('series')||'').trim(),n=String(f.get('number')||'').trim();if(!n)throw Error('Ingresa el número de documento.');const payload={owner_id:u.id,guide_number:s?s+'-'+n:n,guide_date:f.get('date'),guide_time:f.get('time')||null,document_type:f.get('document_type'),reason:f.get('reason')||'Venta',customer_id:f.get('customer_id')||null,purchase_order_id:f.get('purchase_order_id')||null,origin:String(f.get('origin')||'').trim()||null,destination:String(f.get('destination')||'').trim()||null,gross_weight_kg:f.get('gross_weight_kg')===''?null:num(f.get('gross_weight_kg')),vehicle_id:f.get('vehicle')||null,driver_id:f.get('driver')||null,status:f.get('status'),observations:String(f.get('observations')||'').trim()||null};let id=record?.id;if(id){const r=await supabase.from('qf_shipments').update(payload).eq('id',id).eq('owner_id',u.id);if(r.error)throw r.error;const d=await supabase.from('qf_shipment_items').delete().eq('shipment_id',id).eq('owner_id',u.id);if(d.error)throw d.error}else{const r=await supabase.from('qf_shipments').insert(payload).select('id').single();if(r.error)throw r.error;id=r.data.id}const r2=await supabase.from('qf_shipment_items').insert(items.map((x,i)=>({...x,shipment_id:id,owner_id:u.id,line_no:i+1})));if(r2.error)throw r2.error}
      modal.remove();if(onSaved)await onSaved();
    }catch(e){alert('No se pudo guardar: '+(e?.message||e))}};
}
