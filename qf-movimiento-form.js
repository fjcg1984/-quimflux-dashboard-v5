import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://cgkdztwtodmdteohvuoh.supabase.co','sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe');
const DOCS=['Guía de Remisión','Factura','Boleta','Nota de Crédito','Nota de Débito','Otro'];
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const today=()=>new Date().toISOString().slice(0,10);

function installStyle(){
  if(document.getElementById('qf-mf-style'))return;
  const s=document.createElement('style');s.id='qf-mf-style';
  s.textContent='.qf-mf-row{display:flex;gap:8px;align-items:end;width:100%}.qf-mf-row>label{flex:1;min-width:0}.qf-mf-new{height:42px;white-space:nowrap;padding:0 12px!important}.qf-mf-panel{margin:10px 0 0;padding:14px;border:1px solid #33423d;border-radius:10px;background:#0d1312}.qf-mf-panel-title{font-weight:700;margin-bottom:10px}.qf-mf-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.qf-mf-panel label{display:flex;flex-direction:column;gap:5px;color:#d7e1e5;font-size:13px}.qf-mf-panel input,.qf-mf-panel select{box-sizing:border-box;width:100%;background:#0b1110;color:#f3f7f8;border:1px solid #33423d;border-radius:8px;padding:9px 10px;font:inherit}.qf-mf-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.qf-mf-msg{font-size:13px;color:#ff9c9c;margin-top:7px}@media(max-width:760px){.qf-mf-row{flex-direction:column;align-items:stretch}.qf-mf-new{width:100%}.qf-mf-grid{grid-template-columns:1fr}}';
  document.head.appendChild(s);
}

async function getUser(){const r=await supabase.auth.getUser();if(r.error)throw r.error;if(!r.data?.user)throw Error('La sesión no está disponible.');return r.data.user}
async function loadMasters(){
  const u=await getUser();
  const q=[
    supabase.from('qf_customers').select('id,business_name,ruc').eq('owner_id',u.id).eq('active',true).order('business_name'),
    supabase.from('qf_suppliers').select('id,name,ruc').eq('owner_id',u.id).order('name'),
    supabase.from('qf_vehicles').select('id,plate').eq('owner_id',u.id).eq('active',true).order('plate'),
    supabase.from('qf_drivers').select('id,full_name,license_number').eq('owner_id',u.id).eq('active',true).order('full_name'),
    supabase.from('qf_products').select('id,internal_code,name,base_unit').eq('owner_id',u.id).eq('active',true).order('name'),
    supabase.from('qf_master_options').select('option_type,value').eq('owner_id',u.id).eq('active',true).order('value'),
    supabase.from('qf_purchase_orders').select('id,oc_number,operating_unit,status,customer_id').eq('owner_id',u.id).order('oc_number')
  ];
  const r=await Promise.all(q);for(const x of r)if(x.error)throw x.error;
  return {u,customers:r[0].data||[],suppliers:r[1].data||[],vehicles:r[2].data||[],drivers:r[3].data||[],products:r[4].data||[],locations:r[5].data||[],orders:r[6].data||[]};
}
function options(items,selected,getValue,getLabel,placeholder){let h='<option value="">'+esc(placeholder)+'</option>';for(const x of items){const v=getValue(x);h+='<option value="'+esc(v)+'"'+(String(v)===String(selected??'')?' selected':'')+'>'+esc(getLabel(x))+'</option>'}return h}
function selectHtml(name,items,selected,placeholder,getValue,getLabel,cls){return '<select name="'+esc(name)+'" class="'+(cls||'')+'">'+options(items,selected,getValue,getLabel,placeholder)+'</select>'}
function fieldRow(label,control,type,text){return '<div class="qf-mf-row"><label>'+label+control+'</label><button type="button" class="secondary qf-mf-new" data-qf-new="'+type+'">+ '+text+'</button></div>'}
function findDriver(list,val){return list.find(x=>x.id===val||x.full_name===val)}

function openMasterPanel(modal,type,button,refresh){
  const old=modal.querySelector('[data-qf-panel="'+type+'"]');if(old){old.remove();return}
  const titles={customer:'Nuevo cliente',supplier:'Nuevo proveedor',vehicle:'Nuevo transporte',driver:'Nuevo conductor',origin:'Nuevo origen',destination:'Nuevo destino',product:'Nuevo producto',order:'Nueva O/C'};
  let body='';
  if(type==='customer'||type==='supplier')body='<label>Nombre / razón social<input class="a" required></label><label>RUC<input class="b"></label>';
  else if(type==='vehicle')body='<label>Placa<input class="a" required placeholder="ABC-123"></label>';
  else if(type==='driver')body='<label>Nombre completo<input class="a" required></label><label>Licencia<input class="b" required></label>';
  else if(type==='origin'||type==='destination')body='<label>'+(type==='origin'?'Origen':'Destino')+'<input class="a" required></label>';
  else if(type==='product')body='<label>Nombre del producto<input class="a" required></label><label>Código interno<input class="b" required></label><label>Unidad<select class="c"><option value="kg">kg</option><option value="unidad">unidad</option><option value="saco">saco</option><option value="caja">caja</option><option value="litro">litro</option><option value="otro">otro</option></select></label>';
  else body='<label>N.º de O/C<input class="a" required></label><label>Unidad / referencia<input class="b"></label><label>Estado<select class="c"><option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="atendida">Atendida</option><option value="cancelada">Cancelada</option></select></label>';
  const p=document.createElement('div');p.className='qf-mf-panel';p.dataset.qfPanel=type;
  p.innerHTML='<div class="qf-mf-panel-title">'+titles[type]+'</div><div class="qf-mf-grid">'+body+'</div><div class="qf-mf-actions"><button type="button" class="secondary qf-mf-cancel">Cancelar</button><button type="button" class="primary qf-mf-save">Guardar</button></div><div class="qf-mf-msg"></div>';
  const section=button.closest('.qf-rec-section')||modal;section.appendChild(p);
  p.querySelector('.qf-mf-cancel').onclick=()=>p.remove();
  p.querySelector('.qf-mf-save').onclick=()=>saveMaster(modal,type,p,button,refresh);
}

async function saveMaster(modal,type,panel,button,refresh){
  const msg=panel.querySelector('.qf-mf-msg'),a=(panel.querySelector('.a')?.value||'').trim(),b=(panel.querySelector('.b')?.value||'').trim();
  if(!a){msg.textContent='Completa el dato requerido.';return}
  try{
    const u=await getUser();let selected=null;
    if(type==='customer'){
      const r=await supabase.from('qf_customers').insert({owner_id:u.id,business_name:a,ruc:b||null,active:true}).select('id').single();if(r.error)throw r.error;selected=r.data.id;
    }else if(type==='supplier'){
      const r=await supabase.from('qf_suppliers').insert({owner_id:u.id,name:a,ruc:b||null}).select('id').single();if(r.error)throw r.error;selected=r.data.id;
    }else if(type==='vehicle'){
      const r=await supabase.from('qf_vehicles').insert({owner_id:u.id,plate:a,active:true}).select('plate').single();if(r.error)throw r.error;selected=r.data.plate;
    }else if(type==='driver'){
      if(!b)throw Error('Ingresa la licencia.');const r=await supabase.from('qf_drivers').insert({owner_id:u.id,full_name:a,license_number:b,active:true}).select('full_name').single();if(r.error)throw r.error;selected=r.data.full_name;
    }else if(type==='origin'||type==='destination'){
      const r=await supabase.from('qf_master_options').insert({owner_id:u.id,option_type:type==='origin'?'origen':'destino',value:a,active:true}).select('value').single();if(r.error)throw r.error;selected=r.data.value;
    }else if(type==='product'){
      if(!b)throw Error('Ingresa el código interno.');const r=await supabase.from('qf_products').insert({owner_id:u.id,internal_code:b,name:a,base_unit:panel.querySelector('.c').value,active:true}).select('id').single();if(r.error)throw r.error;selected=r.data.id;
    }else if(type==='order'){
      let customerId=modal.querySelector('[name="customer_id"]')?.value||null;
      if(!customerId){const sid=modal.querySelector('[name="supplier_id"]')?.value;if(sid){const sr=await supabase.from('qf_suppliers').select('name,ruc').eq('id',sid).maybeSingle();if(sr.error)throw sr.error;if(sr.data){const cr=await supabase.from('qf_customers').insert({owner_id:u.id,business_name:sr.data.name,ruc:sr.data.ruc||null,active:true}).select('id').single();if(cr.error)throw cr.error;customerId=cr.data.id}}}
      if(!customerId)throw Error('Selecciona primero cliente o proveedor.');
      const r=await supabase.from('qf_purchase_orders').insert({owner_id:u.id,customer_id:customerId,oc_number:a,operating_unit:b||null,status:panel.querySelector('.c').value}).select('id,oc_number').single();if(r.error)throw r.error;selected=r.data;
    }
    panel.remove();await refresh(selected,type);
  }catch(e){msg.textContent='No se pudo guardar: '+(e?.message||e)}
}

export async function openMovimientoForm({mode,record=null,onSaved}){
  installStyle();const m=await loadMasters();const entry=mode==='entrada';const third=entry?'Proveedor':'Cliente';const thirdName=entry?'supplier_id':'customer_id';const thirdList=entry?m.suppliers:m.customers;const selectedThird=entry?record?.supplier_id:record?.customer_id;
  const modal=document.createElement('div');modal.className='qf-rec-modal';
  const orderName=entry?'purchase_order':'purchase_order_id';
  const vehSelected=entry?record?.vehicle_plate:record?.vehicle_id,drvSelected=entry?record?.driver_name:record?.driver_id;
  const thirdControl=selectHtml(thirdName,thirdList,selectedThird,'— Seleccionar '+third.toLowerCase()+' —',x=>x.id,x=>entry?x.name+(x.ruc?' · RUC '+x.ruc:''):x.business_name+(x.ruc?' · RUC '+x.ruc:''));
  const orderControl=entry?selectHtml(orderName,m.orders,record?.purchase_order,'— Seleccionar O/C —',x=>x.oc_number,x=>x.oc_number+(x.operating_unit?' · '+x.operating_unit:'')):selectHtml(orderName,m.orders,record?.purchase_order_id,'— Seleccionar O/C —',x=>x.id,x=>x.oc_number+(x.operating_unit?' · '+x.operating_unit:''));
  const vehicleControl=selectHtml('vehicle',m.vehicles,vehSelected,'— Seleccionar vehículo —',x=>entry?x.plate:x.id,x=>x.plate);
  const driverControl=selectHtml('driver',m.drivers,drvSelected,'— Seleccionar conductor —',x=>entry?x.full_name:x.id,x=>x.full_name);
  const originControl=selectHtml('origin',m.locations.filter(x=>x.option_type==='origen'),record?.origin,'— Seleccionar origen —',x=>x.value,x=>x.value);
  const destControl=selectHtml('destination',m.locations.filter(x=>x.option_type==='destino'),record?.destination,'— Seleccionar destino —',x=>x.value,x=>x.value);
  const date=record?.[entry?'receipt_date':'guide_date']||today(),time=String(record?.[entry?'receipt_time':'guide_time']||'').slice(0,5);
  const statuses=entry?['Registrada','Pendiente de revisión','Recibida','Aprobada','Rechazada']:['registrado','preparando','despachado','entregado','anulado'];
  let h='';
  h+='<div class="qf-rec-modal-card"><div class="qf-rec-modal-head"><div><h2>'+esc(entry?(record?'Editar entrada':'Nueva entrada'):(record?'Editar salida':'Nueva salida'))+'</h2><p>Registra documento, '+third.toLowerCase()+', transporte y materiales.</p></div><button type="button" class="qf-rec-close">×</button></div><form class="qf-mf-form">';
  h+='<div class="qf-rec-section"><h3>Documento y '+third.toLowerCase()+'</h3><div class="qf-rec-grid">';
  h+='<label>Fecha<input name="date" type="date" required value="'+esc(date)+'"></label><label>Hora<input name="time" type="time" value="'+esc(time)+'"></label><label>Tipo de documento<select name="document_type">';
  for(const d of DOCS)h+='<option value="'+esc(d)+'"'+(d===(record?.document_type||'Guía de Remisión')?' selected':'')+'>'+esc(d)+'</option>';
  h+='</select></label><label>Serie<input name="series" value="'+esc(record?.guide_series||'')+'"></label><label>Número<input name="number" required value="'+esc(record?.guide_number||'')+'"></label>';
  h+='<div>'+fieldRow('Orden de compra',orderControl,'order','Nueva O/C')+'</div><div class="wide">'+fieldRow(third,thirdControl,entry?'supplier':'customer','Nuevo '+third.toLowerCase())+'</div>';
  h+='<label>'+third+' seleccionado<input name="third_name" readonly value=""></label><label>RUC<input name="third_ruc" readonly value=""></label></div></div>';
  h+='<div class="qf-rec-section"><h3>Transporte</h3><div class="qf-rec-grid"><div>'+fieldRow('Placa',vehicleControl,'vehicle','Nuevo transporte')+'</div><div>'+fieldRow('Conductor',driverControl,'driver','Nuevo conductor')+'</div><label>Licencia<input name="driver_license" readonly value=""></label><div>'+fieldRow('Origen',originControl,'origin','Nuevo origen')+'</div><div>'+fieldRow('Destino',destControl,'destination','Nuevo destino')+'</div></div></div>';
  h+='<div class="qf-rec-section"><div class="qf-rec-lines-head"><h3>'+(entry?'Materiales recibidos':'Materiales despachados')+'</h3><button type="button" class="secondary" data-add-line>+ Agregar material</button></div><div data-lines></div></div>';
  h+='<div class="qf-rec-section"><div class="qf-rec-grid"><label>Estado<select name="status">';for(const st of statuses)h+='<option value="'+esc(st)+'"'+(st===record?.status?' selected':'')+'>'+esc(st)+'</option>';h+='</select></label>';
  if(!entry)h+='<label>Peso bruto (kg)<input name="gross_weight_kg" type="number" min="0" step="0.001" value="'+esc(record?.gross_weight_kg??'')+'"></label><label>Motivo<select name="reason"><option>Venta</option><option>Traslado</option><option>Devolución</option><option>Otro</option></select></label>';
  h+='<label class="wide">Observaciones<textarea name="observations" rows="3">'+esc(record?.observations||'')+'</textarea></label></div></div><div class="qf-rec-form-actions"><button type="button" class="secondary qf-rec-cancel">Cancelar</button><button type="submit" class="primary">'+(record?'Guardar cambios':entry?'Guardar entrada':'Guardar salida')+'</button></div></form></div>';
  modal.innerHTML=h;document.body.appendChild(modal);
  const close=()=>modal.remove();modal.querySelector('.qf-rec-close').onclick=close;modal.querySelector('.qf-rec-cancel').onclick=close;
  const form=modal.querySelector('form'),thirdEl=modal.querySelector('[name="'+thirdName+'"]');
  const updateThird=()=>{const r=thirdList.find(x=>x.id===thirdEl.value);modal.querySelector('[name="third_name"]').value=r?(entry?r.name:r.business_name):'';modal.querySelector('[name="third_ruc"]').value=r?.ruc||''};thirdEl.onchange=updateThird;updateThird();
  const driverEl=modal.querySelector('[name="driver"]'),updateLicense=()=>{const r=findDriver(m.drivers,driverEl.value);modal.querySelector('[name="driver_license"]').value=r?.license_number||''};driverEl.onchange=updateLicense;updateLicense();
  const lines=modal.querySelector('[data-lines]');
  const addLine=item=>{const d=document.createElement('div');d.className='qf-rec-line';const product=selectHtml('product',m.products,item?.product_id,'— Seleccionar producto —',x=>x.id,x=>x.name+(x.internal_code?' · '+x.internal_code:''),'lp');
    if(entry)d.innerHTML='<label>Producto'+product+'</label><label>Cant. guía<input class="lg" type="number" min="0" step="0.001" value="'+esc(item?.quantity_guide??'')+'"></label><label>Cant. recibida<input class="lr" type="number" min="0" step="0.001" value="'+esc(item?.quantity_received??'')+'"></label><label>Peso kg<input class="lw" type="number" min="0" step="0.001" value="'+esc(item?.weight_kg??'')+'"></label><label>Lote<input class="ll" value="'+esc(item?.lot||'')+'"></label><label>Estado<select class="lc"><option'+(!item||item?.condition==='Conforme'?' selected':'')+'>Conforme</option><option'+(item?.condition==='Con diferencia'?' selected':'')+'>Con diferencia</option><option'+(item?.condition==='Rechazado'?' selected':'')+'>Rechazado</option></select></label><button type="button" class="qf-line-remove">×</button>';
    else d.innerHTML='<label>Producto'+product+'</label><label>Cantidad<input class="lq" type="number" min="0" step="0.001" value="'+esc(item?.quantity??'')+'"></label><label>Peso kg<input class="lw" type="number" min="0" step="0.001" value="'+esc(item?.weight_kg??'')+'"></label><label>Lote<input class="ll" value="'+esc(item?.lot||'')+'"></label><button type="button" class="qf-line-remove">×</button>';
    lines.appendChild(d);d.querySelector('.qf-line-remove').onclick=()=>{if(lines.children.length>1)d.remove()};
    const productEl=d.querySelector('.lp');const pb=document.createElement('button');pb.type='button';pb.className='secondary qf-mf-new';pb.textContent='+ Nuevo producto';pb.onclick=()=>openMasterPanel(modal,'product',pb,async id=>{const mm=await loadMasters();productEl.innerHTML=options(mm.products,id,x=>x.id,x=>x.name+(x.internal_code?' · '+x.internal_code:''),'— Seleccionar producto —');productEl.value=id});productEl.parentElement.appendChild(pb);
  };
  (record?.items?.length?record.items:[{}]).forEach(addLine);modal.querySelector('[data-add-line]').onclick=()=>addLine({});
  const refresh=async(selected,type)=>{const mm=await loadMasters();let el;
    if(type==='customer'||type==='supplier'){el=modal.querySelector('[name="'+thirdName+'"]');el.innerHTML=options(entry?mm.suppliers:mm.customers,selected,x=>x.id,x=>entry?x.name+(x.ruc?' · RUC '+x.ruc:''):x.business_name+(x.ruc?' · RUC '+x.ruc:''),'— Seleccionar '+third.toLowerCase()+' —');el.value=selected;const r=(entry?mm.suppliers:mm.customers).find(x=>x.id===selected);modal.querySelector('[name="third_name"]').value=r?(entry?r.name:r.business_name):'';modal.querySelector('[name="third_ruc"]').value=r?.ruc||'';
    }else if(type==='vehicle'){el=modal.querySelector('[name="vehicle"]');el.innerHTML=options(mm.vehicles,selected,x=>entry?x.plate:x.id,x=>x.plate,'— Seleccionar vehículo —');el.value=selected;
    }else if(type==='driver'){el=modal.querySelector('[name="driver"]');el.innerHTML=options(mm.drivers,selected,x=>entry?x.full_name:x.id,x=>x.full_name,'— Seleccionar conductor —');el.value=selected;updateLicense();
    }else if(type==='origin'||type==='destination'){el=modal.querySelector('[name="'+type+'"]');el.innerHTML=options(mm.locations.filter(x=>x.option_type===(type==='origin'?'origen':'destino')),selected,x=>x.value,x=>x.value,'— Seleccionar '+(type==='origin'?'origen':'destino')+' —');el.value=selected;
    }else if(type==='order'){el=modal.querySelector('[name="'+orderName+'"]');if(entry){const oc=mm.orders.find(x=>x.id===selected?.id||x.oc_number===selected);el.innerHTML=options(mm.orders,oc?.oc_number||selected,x=>x.oc_number,x=>x.oc_number+(x.operating_unit?' · '+x.operating_unit:''),'— Seleccionar O/C —');el.value=oc?.oc_number||selected}else{el.innerHTML=options(mm.orders,selected,x=>x.id,x=>x.oc_number+(x.operating_unit?' · '+x.operating_unit:''),'— Seleccionar O/C —');el.value=selected}
    }};
  modal.querySelectorAll('[data-qf-new]').forEach(b=>b.onclick=()=>openMasterPanel(modal,b.dataset.qfNew,b,refresh));
  form.onsubmit=async ev=>{ev.preventDefault();try{const u=await getUser(),f=new FormData(form);if(!String(f.get('third_name')||'').trim())throw Error('Selecciona un '+third.toLowerCase()+'.');
      if(entry){const items=[...lines.children].map(d=>{const p=m.products.find(x=>x.id===d.querySelector('.lp').value);return{product_id:p?.id||null,codigo:p?.internal_code||null,material:p?.name||null,description:p?.name||'Material',unit:p?.base_unit||null,quantity_guide:num(d.querySelector('.lg').value),quantity_received:num(d.querySelector('.lr').value),weight_kg:num(d.querySelector('.lw').value),lot:d.querySelector('.ll').value.trim()||null,condition:d.querySelector('.lc').value}}).filter(x=>x.product_id||x.quantity_guide||x.quantity_received||x.weight_kg);if(!items.length)throw Error('Agrega al menos un material.');const payload={owner_id:u.id,receipt_date:f.get('date'),receipt_time:f.get('time')||null,document_type:f.get('document_type'),guide_series:String(f.get('series')||'').trim()||null,guide_number:String(f.get('number')||'').trim()||null,supplier_id:f.get('supplier_id')||null,supplier_name:String(f.get('third_name')).trim(),supplier_ruc:String(f.get('third_ruc')||'').trim()||null,purchase_order:String(f.get('purchase_order')||'').trim()||null,vehicle_plate:String(f.get('vehicle')||'').trim()||null,driver_name:String(f.get('driver')||'').trim()||null,driver_license:String(f.get('driver_license')||'').trim()||null,origin:String(f.get('origin')||'').trim()||null,destination:String(f.get('destination')||'').trim()||null,status:f.get('status'),total_quantity:items.reduce((a,x)=>a+num(x.quantity_received),0),total_weight_kg:items.reduce((a,x)=>a+num(x.weight_kg),0),observations:String(f.get('observations')||'').trim()||null,updated_at:new Date().toISOString()};let id=record?.id;if(id){let r=await supabase.from('qf_receipts').update(payload).eq('id',id).eq('owner_id',u.id);if(r.error)throw r.error;let d=await supabase.from('qf_receipt_items').delete().eq('receipt_id',id);if(d.error)throw d.error}else{const r=await supabase.from('qf_receipts').insert(payload).select('id').single();if(r.error)throw r.error;id=r.data.id}const r2=await supabase.from('qf_receipt_items').insert(items.map(x=>({...x,receipt_id:id})));if(r2.error)throw r2.error;
      }else{const items=[...lines.children].map(d=>{const p=m.products.find(x=>x.id===d.querySelector('.lp').value);return{product_id:p?.id||null,source_product_code:p?.internal_code||null,description_source:p?.name||'Material',quantity:num(d.querySelector('.lq').value),unit:p?.base_unit||'kg',package_type:null,package_count:null,weight_per_package_kg:null,lot:d.querySelector('.ll').value.trim()||null,condition:'Conforme'}}).filter(x=>x.product_id&&x.quantity>0);if(!items.length)throw Error('Agrega al menos un material con cantidad mayor que cero.');const s=String(f.get('series')||'').trim(),doc=String(f.get('number')||'').trim();if(!doc)throw Error('Ingresa el número de documento.');const payload={owner_id:u.id,guide_number:s?s+'-'+doc:doc,guide_date:f.get('date'),guide_time:f.get('time')||null,document_type:f.get('document_type'),reason:f.get('reason')||'Venta',customer_id:f.get('customer_id')||null,purchase_order_id:f.get('purchase_order_id')||null,origin:String(f.get('origin')||'').trim()||null,destination:String(f.get('destination')||'').trim()||null,gross_weight_kg:f.get('gross_weight_kg')===''?null:num(f.get('gross_weight_kg')),vehicle_id:f.get('vehicle')||null,driver_id:f.get('driver')||null,status:f.get('status'),observations:String(f.get('observations')||'').trim()||null};let id=record?.id;if(id){const r=await supabase.from('qf_shipments').update(payload).eq('id',id).eq('owner_id',u.id);if(r.error)throw r.error;const d=await supabase.from('qf_shipment_items').delete().eq('shipment_id',id).eq('owner_id',u.id);if(d.error)throw d.error}else{const r=await supabase.from('qf_shipments').insert(payload).select('id').single();if(r.error)throw r.error;id=r.data.id}const r2=await supabase.from('qf_shipment_items').insert(items.map((x,i)=>({...x,shipment_id:id,owner_id:u.id,line_no:i+1})));if(r2.error)throw r2.error}
      modal.remove();if(onSaved)await onSaved();
    }catch(e){alert('No se pudo guardar: '+(e?.message||e))}};
}
