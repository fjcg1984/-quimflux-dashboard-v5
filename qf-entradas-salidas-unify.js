import { createClient } from '@supabase/supabase-js';

const sb=createClient('https://cgkdztwtodmdteohvuoh.supabase.co','sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe');
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));

function installStyle(){
  if(document.getElementById('qf-unify-style'))return;
  const s=document.createElement('style');s.id='qf-unify-style';
  s.textContent=`.qf-unify-wrap{display:flex;gap:8px;align-items:end;width:100%}.qf-unify-wrap>label{flex:1}.qf-unify-add{height:42px;white-space:nowrap}.qf-unify-panel{margin-top:10px;padding:12px;border:1px solid #33423d;border-radius:10px;background:#0d1312}.qf-unify-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px}.qf-unify-panel label{display:flex;flex-direction:column;gap:5px;color:#9db0ba;font-size:13px}.qf-unify-panel input,.qf-unify-panel select{box-sizing:border-box;width:100%;background:#0b1110;color:#f3f7f8;border:1px solid #33423d;border-radius:8px;padding:9px 10px;font:inherit}.qf-unify-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.qf-unify-msg{font-size:13px;color:#ff9c9c;margin-top:7px}.qf-unify-select{width:100%}@media(max-width:700px){.qf-unify-wrap{align-items:stretch;flex-direction:column}.qf-unify-add{width:100%}.qf-unify-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}
async function getUser(){const {data,error}=await sb.auth.getUser();if(error)throw error;if(!data?.user)throw Error('La sesión no está disponible.');return data.user}
async function loadMasters(){const u=await getUser();const [c,s,v,d,p,o,oc]=await Promise.all([
  sb.from('qf_customers').select('id,business_name,ruc').eq('owner_id',u.id).eq('active',true).order('business_name'),
  sb.from('qf_suppliers').select('id,name,ruc').eq('owner_id',u.id).order('name'),
  sb.from('qf_vehicles').select('id,plate').eq('owner_id',u.id).eq('active',true).order('plate'),
  sb.from('qf_drivers').select('id,full_name,license_number').eq('owner_id',u.id).eq('active',true).order('full_name'),
  sb.from('qf_products').select('id,internal_code,name,base_unit').eq('owner_id',u.id).eq('active',true).order('name'),
  sb.from('qf_master_options').select('option_type,value').eq('owner_id',u.id).eq('active',true).order('value'),
  sb.from('qf_purchase_orders').select('id,oc_number,operating_unit,status').eq('owner_id',u.id).order('oc_number')
]);
  for(const x of [c,s,v,d,p,o,oc])if(x.error)throw x.error;
  return {customers:c.data||[],suppliers:s.data||[],vehicles:v.data||[],drivers:d.data||[],products:p.data||[],locations:o.data||[],orders:oc.data||[]};
}
function labelOf(el){return el?.closest('label')}
function replaceInputWithSelect(el){if(!el)return null;if(el.tagName==='SELECT')return el;const s=document.createElement('select');for(const a of [...el.attributes]){if(a.name!=='type')s.setAttribute(a.name,a.value)}s.name=el.name;s.className=el.className;el.replaceWith(s);return s}
function fill(sel,items,placeholder,fn){if(!sel)return;const old=sel.value;sel.innerHTML=`<option value="">${esc(placeholder)}</option>`+items.map(x=>{const a=fn(x);return `<option value="${esc(a.value)}">${esc(a.label)}</option>`}).join('');if(old)sel.value=old}
function wrapButton(modal,el,type,label){if(!el)return;const l=labelOf(el);if(!l)return;const parent=l.parentElement;const existing=parent?.querySelector(`[data-qf-unify="${type}"]`);if(existing)return;let w=parent?.classList.contains('qf-unify-wrap')?parent:null;if(!w){w=document.createElement('div');w.className='qf-unify-wrap';l.parentNode.insertBefore(w,l);w.appendChild(l)}const b=document.createElement('button');b.type='button';b.className='secondary qf-unify-add';b.dataset.qfUnify=type;b.textContent='+ '+label;b.onclick=()=>openPanel(modal,type,el);w.appendChild(b)}
function addDestination(modal){if(modal.querySelector('[name="destination"]'))return;const origin=modal.querySelector('[name="origin"]');const l=labelOf(origin);if(!l)return;const grid=l.parentElement;const lab=document.createElement('label');lab.innerHTML='Destino<select name="destination" class="qf-unify-select"><option value="">— Seleccionar destino —</option></select>';if(grid?.classList.contains('qf-rec-grid'))grid.appendChild(lab);else (l.closest('.qf-rec-grid')||grid||modal).appendChild(lab)}
function openPanel(modal,type,target){if(modal.querySelector(`[data-qf-unify-panel="${type}"]`))return;const p=document.createElement('div');p.className='qf-unify-panel';p.dataset.qfUnifyPanel=type;
  const cfg={
    customer:['Registrar cliente','<label>Razón social / nombre<input class="n" required></label><label>RUC<input class="r" maxlength="20"></label>'],
    supplier:['Registrar proveedor','<label>Razón social / nombre<input class="n" required></label><label>RUC<input class="r" maxlength="20"></label>'],
    vehicle:['Registrar transporte','<label>Placa<input class="n" required placeholder="ABC-123"></label>'],
    driver:['Registrar conductor','<label>Nombre completo<input class="n" required></label><label>Licencia<input class="r" required></label>'],
    origin:['Registrar origen','<label>Origen<input class="n" required placeholder="Planta / almacén / proveedor"></label>'],
    destination:['Registrar destino','<label>Destino<input class="n" required placeholder="Cliente / planta / almacén"></label>'],
    order:['Registrar O/C','<label>N.º de O/C<input class="n" required placeholder="OC-000123"></label><label>Unidad / referencia<input class="r" placeholder="Compras / Planta"></label><label>Estado<select class="u"><option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="atendida">Atendida</option><option value="cancelada">Cancelada</option></select></label>'],
    product:['Registrar producto','<label>Código interno<input class="r" required></label><label>Nombre del producto<input class="n" required></label><label>Unidad<select class="u"><option value="kg">kg</option><option value="unidad">unidad</option><option value="saco">saco</option><option value="caja">caja</option><option value="litro">litro</option><option value="otro">otro</option></select></label>']
  }[type];if(!cfg)return;
  p.innerHTML=`<div><strong>${cfg[0]}</strong></div><div class="qf-unify-grid">${cfg[1]}</div><div class="qf-unify-actions"><button type="button" class="secondary c">Cancelar</button><button type="button" class="primary s">Guardar</button></div><div class="qf-unify-msg"></div>`;
  const sec=target.closest('.qf-rec-section')||modal.querySelector('.qf-rec-section')||modal;sec.appendChild(p);p.querySelector('.c').onclick=()=>p.remove();
  p.querySelector('.s').onclick=async()=>{const msg=p.querySelector('.qf-unify-msg');const n=p.querySelector('.n')?.value.trim();const r=p.querySelector('.r')?.value.trim();if(!n){msg.textContent='Completa el dato requerido.';return}try{const u=await getUser();let row;
    if(type==='customer'||type==='supplier'){const table=type==='customer'?'qf_customers':'qf_suppliers';const nf=type==='customer'?'business_name':'name';const q=await sb.from(table).select('id').eq('owner_id',u.id).ilike(nf,n).limit(1);if(q.error)throw q.error;row=q.data?.[0];if(!row){const x=await sb.from(table).insert({owner_id:u.id,[nf]:n,ruc:r||null,active:true}).select('id').single();if(x.error)throw x.error;row=x.data}target.value=row.id}
    else if(type==='vehicle'){const q=await sb.from('qf_vehicles').select('id,plate').eq('owner_id',u.id).ilike('plate',n).limit(1);if(q.error)throw q.error;row=q.data?.[0];if(!row){const x=await sb.from('qf_vehicles').insert({owner_id:u.id,plate:n,active:true}).select('id,plate').single();if(x.error)throw x.error;row=x.data}target.value=row.plate}
    else if(type==='driver'){if(!r)throw Error('Ingresa la licencia.');const q=await sb.from('qf_drivers').select('id,full_name,license_number').eq('owner_id',u.id).ilike('full_name',n).limit(1);if(q.error)throw q.error;row=q.data?.[0];if(!row){const x=await sb.from('qf_drivers').insert({owner_id:u.id,full_name:n,license_number:r,active:true}).select('id,full_name,license_number').single();if(x.error)throw x.error;row=x.data}target.value=row.full_name;const lic=modal.querySelector('[name="driver_license"]');if(lic)lic.value=row.license_number||''}
    else if(type==='origin'||type==='destination'){const ot=type==='origin'?'origen':'destino';const q=await sb.from('qf_master_options').select('id').eq('owner_id',u.id).eq('option_type',ot).ilike('value',n).limit(1);if(q.error)throw q.error;if(!q.data?.[0]){const x=await sb.from('qf_master_options').insert({owner_id:u.id,option_type:ot,value:n,active:true}).select('id').single();if(x.error)throw x.error}target.value=n}
    else if(type==='order'){const q=await sb.from('qf_purchase_orders').select('id,oc_number').eq('owner_id',u.id).eq('oc_number',n).limit(1);if(q.error)throw q.error;row=q.data?.[0];if(!row){let customerId=modal.querySelector('[name="customer_id"]')?.value||null;const supplierId=modal.querySelector('[name="supplier_id"]')?.value||null;if(!customerId&&supplierId){const z=await sb.from('qf_suppliers').select('name,ruc').eq('id',supplierId).maybeSingle();if(z.error)throw z.error;if(z.data){const c=await sb.from('qf_customers').select('id').eq('owner_id',u.id).ilike('business_name',z.data.name).limit(1);if(c.error)throw c.error;customerId=c.data?.[0]?.id;if(!customerId){const cr=await sb.from('qf_customers').insert({owner_id:u.id,business_name:z.data.name,ruc:z.data.ruc||null,active:true}).select('id').single();if(cr.error)throw cr.error;customerId=cr.data.id}}}if(!customerId)throw Error('Selecciona primero un cliente/proveedor para asociar la O/C.');const x=await sb.from('qf_purchase_orders').insert({owner_id:u.id,customer_id:customerId,oc_number:n,operating_unit:r||null,status:p.querySelector('.u').value}).select('id,oc_number').single();if(x.error)throw x.error;row=x.data}target.value=row.oc_number}
    else if(type==='product'){if(!r)throw Error('Ingresa el código interno.');const unit=p.querySelector('.u').value;const q=await sb.from('qf_products').select('id').eq('owner_id',u.id).eq('internal_code',r).limit(1);if(q.error)throw q.error;if(q.data?.[0])target.value=q.data[0].id;else{const x=await sb.from('qf_products').insert({owner_id:u.id,internal_code:r,name:n,base_unit:unit,active:true}).select('id').single();if(x.error)throw x.error;target.value=x.data.id}}
    target.dispatchEvent(new Event('change',{bubbles:true}));p.remove();setTimeout(()=>refreshModal(modal),50);
  }catch(e){msg.textContent='No se pudo guardar: '+(e?.message||e)}}
}
async function refreshModal(modal){const m=await loadMasters();
  const kind=modal.querySelector('[name="supplier_id"]')?'entrada':'salida';
  if(kind==='salida'){
    fill(modal.querySelector('[name="customer_id"]'),m.customers,'— Seleccionar cliente —',x=>({value:x.id,label:`${x.business_name}${x.ruc?' · RUC '+x.ruc:''}`}));
    fill(modal.querySelector('[name="vehicle_id"]'),m.vehicles,'— Seleccionar vehículo —',x=>({value:x.id,label:x.plate}));
    fill(modal.querySelector('[name="driver_id"]'),m.drivers,'— Seleccionar conductor —',x=>({value:x.id,label:x.full_name}));
    fill(modal.querySelector('[name="purchase_order_id"]'),m.orders,'— Seleccionar O/C —',x=>({value:x.id,label:`${x.oc_number}${x.operating_unit?' · '+x.operating_unit:''}`}));
    wrapButton(modal,modal.querySelector('[name="customer_id"]'),'customer','Nuevo cliente');wrapButton(modal,modal.querySelector('[name="vehicle_id"]'),'vehicle','Nuevo transporte');wrapButton(modal,modal.querySelector('[name="driver_id"]'),'driver','Nuevo conductor');wrapButton(modal,modal.querySelector('[name="purchase_order_id"]'),'order','Registrar O/C');
  }else{
    fill(modal.querySelector('[name="supplier_id"]'),m.suppliers,'— Seleccionar proveedor —',x=>({value:x.id,label:`${x.name}${x.ruc?' · RUC '+x.ruc:''}`}));
    const v=replaceInputWithSelect(modal.querySelector('[name="vehicle_plate"]'));fill(v,m.vehicles,'— Seleccionar vehículo —',x=>({value:x.plate,label:x.plate}));
    const d=replaceInputWithSelect(modal.querySelector('[name="driver_name"]'));fill(d,m.drivers,'— Seleccionar conductor —',x=>({value:x.full_name,label:x.full_name}));
    const lic=replaceInputWithSelect(modal.querySelector('[name="driver_license"]'));fill(lic,m.drivers,'— Seleccionar licencia —',x=>({value:x.license_number,label:x.license_number}));
    const o=replaceInputWithSelect(modal.querySelector('[name="origin"]'));fill(o,m.locations.filter(x=>x.option_type==='origen'),'— Seleccionar origen —',x=>({value:x.value,label:x.value}));
    addDestination(modal);const de=replaceInputWithSelect(modal.querySelector('[name="destination"]'));fill(de,m.locations.filter(x=>x.option_type==='destino'),'— Seleccionar destino —',x=>({value:x.value,label:x.value}));
    const oc=replaceInputWithSelect(modal.querySelector('[name="purchase_order"]'));fill(oc,m.orders,'— Seleccionar O/C —',x=>({value:x.oc_number,label:`${x.oc_number}${x.operating_unit?' · '+x.operating_unit:''}`}));
    wrapButton(modal,modal.querySelector('[name="supplier_id"]'),'supplier','Nuevo proveedor');wrapButton(modal,oc,'order','Registrar O/C');wrapButton(modal,v,'vehicle','Nuevo transporte');wrapButton(modal,d,'driver','Nuevo conductor');wrapButton(modal,o,'origin','Nuevo origen');wrapButton(modal,de,'destination','Nuevo destino');
    if(d&&!d.dataset.qfSync){d.dataset.qfSync='1';d.addEventListener('change',()=>{const row=m.drivers.find(x=>x.full_name===d.value);if(row&&lic)lic.value=row.license_number||''})}if(lic&&!lic.dataset.qfSync){lic.dataset.qfSync='1';lic.addEventListener('change',()=>{const row=m.drivers.find(x=>x.license_number===lic.value);if(row&&d)d.value=row.full_name||''})}
  }
  modal.querySelectorAll('#qfShipLines select.lp,#qfLines select.lp').forEach(sel=>wrapButton(modal,sel,'product','Nuevo producto'));
}
function enhance(){installStyle();const modal=document.querySelector('.qf-rec-modal');if(!modal||modal.dataset.qfUnified2)return;modal.dataset.qfUnified2='1';setTimeout(()=>refreshModal(modal).catch(console.error),80)}
for(const n of ['qfOpenSalidas','qfOpenRecepciones']){const t=setInterval(()=>{if(typeof window[n]==='function'){const old=window[n];if(old.__qfUnified2)return;const w=(...a)=>{const r=old(...a);setTimeout(enhance,120);return r};w.__qfUnified2=true;window[n]=w;clearInterval(t)}},50);setTimeout(()=>clearInterval(t),15000)}
