import { createClient } from '@supabase/supabase-js';

const supabase=createClient('https://cgkdztwtodmdteohvuoh.supabase.co','sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe');

const style=document.createElement('style');
style.textContent=`
.qf-md-wrap{display:flex;gap:8px;align-items:end;width:100%}.qf-md-wrap>label{flex:1}.qf-md-add{height:42px;white-space:nowrap}.qf-md-panel{margin-top:10px;padding:12px;border:1px solid #33423d;border-radius:10px;background:#0d1312}.qf-md-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px}.qf-md-panel label{display:flex;flex-direction:column;gap:5px;color:#9db0ba;font-size:13px}.qf-md-panel input,.qf-md-panel select{box-sizing:border-box;width:100%;background:#0b1110;color:#f3f7f8;border:1px solid #33423d;border-radius:8px;padding:9px 10px;font:inherit}.qf-md-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.qf-md-msg{font-size:13px;color:#9db0ba;margin-top:7px}.qf-md-msg.ok{color:#8fd3b1}.qf-md-msg.err{color:#ff9c9c}@media(max-width:700px){.qf-md-grid{grid-template-columns:1fr}.qf-md-wrap{align-items:stretch;flex-direction:column}.qf-md-add{width:100%}}
`;
document.head.appendChild(style);

const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const fieldLabel=el=>el?.closest('label');
async function getUser(){const {data,error}=await supabase.auth.getUser();if(error)throw error;return data?.user||null;}

async function addRecord(type,modal,selectOrInput,section){
  if(modal.querySelector(`[data-qf-md-panel="${type}"]`))return;
  const panel=document.createElement('div');panel.className='qf-md-panel';panel.dataset.qfMdPanel=type;
  const cfg={
    customer:{title:'Registrar cliente',fields:'<label>Razón social / nombre<input class="n" required></label><label>RUC<input class="r" maxlength="20"></label>'},
    supplier:{title:'Registrar proveedor',fields:'<label>Razón social / nombre<input class="n" required></label><label>RUC<input class="r" maxlength="20"></label>'},
    vehicle:{title:'Registrar transporte / vehículo',fields:'<label>Placa<input class="n" required placeholder="ABC-123"></label>'},
    driver:{title:'Registrar conductor',fields:'<label>Nombre completo<input class="n" required></label><label>Licencia<input class="r" required></label>'},
    product:{title:'Registrar producto',fields:'<label>Código interno<input class="r" required></label><label>Nombre del producto<input class="n" required></label><label>Unidad<select class="u"><option value="kg">kg</option><option value="unidad">unidad</option><option value="saco">saco</option><option value="caja">caja</option><option value="litro">litro</option><option value="otro">otro</option></select></label>'},
    origin:{title:'Registrar origen',fields:'<label class="wide">Origen<input class="n" required placeholder="Planta / almacén / proveedor"></label>'},
    destination:{title:'Registrar destino',fields:'<label class="wide">Destino<input class="n" required placeholder="Cliente / planta / almacén"></label>'},
    order:{title:'Registrar O/C existente',fields:'<label>N.º de O/C<input class="n" required placeholder="OC-000123"></label><label>Unidad / referencia<input class="r" placeholder="Compras / Planta"></label><label>Estado<select class="u"><option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="atendida">Atendida</option><option value="cancelada">Cancelada</option></select></label>'}
  }[type];
  if(!cfg)return;
  panel.innerHTML=`<div class="qf-md-grid">${cfg.fields}</div><div class="qf-md-actions"><button type="button" class="secondary cancel">Cancelar</button><button type="button" class="primary save">Guardar</button></div><div class="qf-md-msg"></div>`;
  section.appendChild(panel);
  panel.querySelector('.cancel').onclick=()=>panel.remove();
  panel.querySelector('.save').onclick=async()=>{
    const msg=panel.querySelector('.qf-md-msg');const n=panel.querySelector('.n')?.value.trim();const r=panel.querySelector('.r')?.value.trim();
    if(!n){msg.className='qf-md-msg err';msg.textContent='Completa el dato requerido.';return;}
    try{
      const user=await getUser();if(!user)throw new Error('La sesión no está disponible.');
      if(type==='customer'||type==='supplier'){
        const table=type==='customer'?'qf_customers':'qf_suppliers';
        const nameField=type==='customer'?'business_name':'name';
        const {data:dupe,error:de}=await supabase.from(table).select('id').eq('owner_id',user.id).ilike(nameField,n).limit(1);if(de)throw de;
        if(dupe?.[0]){await refreshMasters(modal);selectOrInput.value=dupe[0].id;panel.remove();return;}
        const payload={owner_id:user.id,[nameField]:n,ruc:r||null,active:true};
        const {data,error}=await supabase.from(table).insert(payload).select('id').single();if(error)throw error;
        await refreshMasters(modal);selectOrInput.value=data.id;selectOrInput.dispatchEvent(new Event('change',{bubbles:true}));panel.remove();return;
      }
      if(type==='vehicle'){
        const {data:dupe,error:de}=await supabase.from('qf_vehicles').select('id').eq('owner_id',user.id).ilike('plate',n).limit(1);if(de)throw de;
        const data=dupe?.[0]?dupe[0]:(await supabase.from('qf_vehicles').insert({owner_id:user.id,plate:n,active:true}).select('id').single()).data;
        if(!data)throw new Error('No se pudo registrar el vehículo.');await refreshMasters(modal);selectOrInput.value=data.id;selectOrInput.dispatchEvent(new Event('change',{bubbles:true}));panel.remove();return;
      }
      if(type==='driver'){
        if(!r)throw new Error('Ingresa la licencia.');
        const {data:dupe,error:de}=await supabase.from('qf_drivers').select('id').eq('owner_id',user.id).ilike('full_name',n).limit(1);if(de)throw de;
        const data=dupe?.[0]?dupe[0]:(await supabase.from('qf_drivers').insert({owner_id:user.id,full_name:n,license_number:r,active:true}).select('id').single()).data;
        if(!data)throw new Error('No se pudo registrar el conductor.');await refreshMasters(modal);selectOrInput.value=data.id;selectOrInput.dispatchEvent(new Event('change',{bubbles:true}));panel.remove();return;
      }
      if(type==='product'){
        if(!r)throw new Error('Ingresa el código interno.');const unit=panel.querySelector('.u').value;
        const {data:dupe,error:de}=await supabase.from('qf_products').select('id').eq('owner_id',user.id).eq('internal_code',r).limit(1);if(de)throw de;
        const data=dupe?.[0]?dupe[0]:(await supabase.from('qf_products').insert({owner_id:user.id,internal_code:r,name:n,base_unit:unit,active:true}).select('id').single()).data;
        if(!data)throw new Error('No se pudo registrar el producto.');await refreshMasters(modal);panel.remove();await enhanceProducts(modal);return;
      }
      if(type==='origin'||type==='destination'){
        const option_type=type==='origin'?'origen':'destino';
        const {data:dupe,error:de}=await supabase.from('qf_master_options').select('id').eq('owner_id',user.id).eq('option_type',option_type).ilike('value',n).limit(1);if(de)throw de;
        const data=dupe?.[0]?dupe[0]:(await supabase.from('qf_master_options').insert({owner_id:user.id,option_type,value:n,active:true}).select('id').single()).data;
        if(!data)throw new Error('No se pudo registrar la ubicación.');await refreshMasters(modal);selectOrInput.value=n;panel.remove();return;
      }
      if(type==='order'){
        const {data:dupe,error:de}=await supabase.from('qf_purchase_orders').select('id,oc_number').eq('owner_id',user.id).eq('oc_number',n).limit(1);if(de)throw de;
        let data=dupe?.[0];
        if(!data){
          const customerSelect=modal.querySelector('select[name="customer_id"]');const supplierSelect=modal.querySelector('select[name="supplier_id"]');
          let customerId=customerSelect?.value||null;
          if(!customerId&&supplierSelect?.value){const {data:s}=await supabase.from('qf_suppliers').select('name,ruc').eq('id',supplierSelect.value).maybeSingle();if(s){let q=await supabase.from('qf_customers').select('id').eq('owner_id',user.id).ilike('business_name',s.name).limit(1);customerId=q.data?.[0]?.id;if(!customerId){const cr=await supabase.from('qf_customers').insert({owner_id:user.id,business_name:s.name,ruc:s.ruc||null,active:true}).select('id').single();if(cr.error)throw cr.error;customerId=cr.data.id;}}}
          if(!customerId)throw new Error('Selecciona primero un cliente/proveedor para asociar la O/C.');
          const {data:created,error}=await supabase.from('qf_purchase_orders').insert({owner_id:user.id,customer_id:customerId,oc_number:n,operating_unit:r||null,status:panel.querySelector('.u').value}).select('id,oc_number').single();if(error)throw error;data=created;
        }
        await refreshMasters(modal);selectOrInput.value=data.oc_number;selectOrInput.dispatchEvent(new Event('change',{bubbles:true}));panel.remove();return;
      }
    }catch(error){msg.className='qf-md-msg err';msg.textContent='No se pudo guardar: '+(error?.message||error);console.error('QUIMFLUX maestros:',error);}
  };
}

async function refreshMasters(modal){
  const user=await getUser();if(!user)return;
  const [c,v,d,p,s,o]=await Promise.all([
    supabase.from('qf_customers').select('id,business_name,ruc').eq('owner_id',user.id).eq('active',true).order('business_name'),
    supabase.from('qf_vehicles').select('id,plate').eq('owner_id',user.id).eq('active',true).order('plate'),
    supabase.from('qf_drivers').select('id,full_name,license_number').eq('owner_id',user.id).eq('active',true).order('full_name'),
    supabase.from('qf_products').select('id,internal_code,name,base_unit').eq('owner_id',user.id).eq('active',true).order('name'),
    supabase.from('qf_suppliers').select('id,name,ruc').eq('owner_id',user.id).order('name'),
    supabase.from('qf_master_options').select('option_type,value').eq('owner_id',user.id).eq('active',true).order('value')
  ]);
  if([c,v,d,p,s,o].some(x=>x.error))throw [c,v,d,p,s,o].find(x=>x.error).error;
  modal.__qfMasters={customers:c.data||[],vehicles:v.data||[],drivers:d.data||[],products:p.data||[],suppliers:s.data||[],locations:o.data||[]};
  const set=(sel,arr,text,keep)=>{if(!sel)return;const old=keep??sel.value;sel.innerHTML='<option value="">— Seleccionar —</option>'+arr.map(x=>`<option value="${esc(x.id)}">${esc(text(x))}</option>`).join('');if(old)sel.value=old;};
  set(modal.querySelector('select[name="customer_id"]'),modal.__qfMasters.customers,x=>`${x.business_name}${x.ruc?' · RUC '+x.ruc:''}`);
  set(modal.querySelector('select[name="supplier_id"]'),modal.__qfMasters.suppliers,x=>`${x.name}${x.ruc?' · RUC '+x.ruc:''}`);
  set(modal.querySelector('select[name="vehicle_id"]'),modal.__qfMasters.vehicles,x=>x.plate);
  set(modal.querySelector('select[name="driver_id"]'),modal.__qfMasters.drivers,x=>x.full_name);
  const os=modal.querySelector('select[name="purchase_order_id"]');if(os){const orders=(await supabase.from('qf_purchase_orders').select('id,oc_number,operating_unit,status').eq('owner_id',user.id).order('oc_number')).data||[];const old=os.value;os.innerHTML='<option value="">— Seleccionar O/C —</option>'+orders.map(x=>`<option value="${esc(x.id)}">${esc(x.oc_number)}${x.operating_unit?' · '+esc(x.operating_unit):''}</option>`).join('');if(old)os.value=old;}
  const op=modal.querySelector('select[name="purchase_order"]');if(op){const orders=(await supabase.from('qf_purchase_orders').select('id,oc_number,operating_unit,status').eq('owner_id',user.id).order('oc_number')).data||[];const old=op.value;op.innerHTML='<option value="">— Seleccionar O/C —</option>'+orders.map(x=>`<option value="${esc(x.oc_number)}">${esc(x.oc_number)}${x.operating_unit?' · '+esc(x.operating_unit):''}</option>`).join('');if(old)op.value=old;}
}

function addButton(modal,select,type,section,label){if(!select||select.dataset.qfMd)return;select.dataset.qfMd='1';const l=fieldLabel(select);if(!l)return;const wrap=document.createElement('div');wrap.className='qf-md-wrap';l.parentNode.insertBefore(wrap,l);wrap.appendChild(l);const b=document.createElement('button');b.type='button';b.className='secondary qf-md-add';b.textContent='+ '+label;b.onclick=()=>addRecord(type,modal,select,section);wrap.appendChild(b);}

function addInputButton(modal,input,type,section,label){if(!input||input.dataset.qfMd)return;input.dataset.qfMd='1';const l=fieldLabel(input);if(!l)return;const wrap=document.createElement('div');wrap.className='qf-md-wrap';l.parentNode.insertBefore(wrap,l);wrap.appendChild(l);const b=document.createElement('button');b.type='button';b.className='secondary qf-md-add';b.textContent='+ '+label;b.onclick=()=>addRecord(type,modal,input,section);wrap.appendChild(b);}

function enhanceProducts(modal){
  const lines=modal.querySelector('#qfShipLines,#qfLines');if(!lines)return;
  lines.querySelectorAll('select.lp').forEach(sel=>{if(sel.dataset.qfMd)return;sel.dataset.qfMd='1';const l=fieldLabel(sel);const b=document.createElement('button');b.type='button';b.className='secondary qf-md-add';b.style.marginTop='6px';b.textContent='+ Nuevo producto';b.onclick=()=>addRecord('product',modal,sel,sel.closest('.qf-rec-section'));l?.appendChild(b);});
}

function enhanceModal(modal,kind){
  if(!modal||modal.__qfMdEnhanced)return;modal.__qfMdEnhanced=true;
  const section=modal.querySelector('.qf-rec-section');
  refreshMasters(modal).catch(console.error);
  if(kind==='salidas'){
    addButton(modal,modal.querySelector('select[name="customer_id"]'),'customer',section,'Nuevo cliente');
    addButton(modal,modal.querySelector('select[name="vehicle_id"]'),'vehicle',modal.querySelectorAll('.qf-rec-section')[1]||section,'Nuevo transporte');
    addButton(modal,modal.querySelector('select[name="driver_id"]'),'driver',modal.querySelectorAll('.qf-rec-section')[1]||section,'Nuevo conductor');
    addInputButton(modal,modal.querySelector('input[name="origin"]'),'origin',modal.querySelectorAll('.qf-rec-section')[1]||section,'Nuevo origen');
    addInputButton(modal,modal.querySelector('input[name="destination"]'),'destination',modal.querySelectorAll('.qf-rec-section')[1]||section,'Nuevo destino');
    const oc=modal.querySelector('select[name="purchase_order_id"]');addButton(modal,oc,'order',section,'Registrar O/C');
    enhanceProducts(modal);const add=modal.querySelector('#qfAddShipLine');if(add&&!add.dataset.qfMdWrap){const old=add.onclick;add.onclick=(...a)=>{old?.(...a);enhanceProducts(modal)};add.dataset.qfMdWrap='1';}
  }else{
    addButton(modal,modal.querySelector('select[name="supplier_id"]'),'supplier',section,'Nuevo proveedor');
    addInputButton(modal,modal.querySelector('input[name="vehicle_plate"]'),'vehicle',modal.querySelectorAll('.qf-rec-section')[1]||section,'Nuevo transporte');
    addInputButton(modal,modal.querySelector('input[name="driver_name"]'),'driver',modal.querySelectorAll('.qf-rec-section')[1]||section,'Nuevo conductor');
    addInputButton(modal,modal.querySelector('input[name="driver_license"]'),'driver',modal.querySelectorAll('.qf-rec-section')[1]||section,'Nueva licencia');
    addInputButton(modal,modal.querySelector('input[name="origin"]'),'origin',modal.querySelectorAll('.qf-rec-section')[1]||section,'Nuevo origen');
    addInputButton(modal,modal.querySelector('input[name="destination"]'),'destination',modal.querySelectorAll('.qf-rec-section')[1]||section,'Nuevo destino');
    addInputButton(modal,modal.querySelector('input[name="purchase_order"]'),'order',section,'Registrar O/C');
    enhanceProducts(modal);const add=modal.querySelector('#qfAddLine');if(add&&!add.dataset.qfMdWrap){const old=add.onclick;add.onclick=(...a)=>{old?.(...a);enhanceProducts(modal)};add.dataset.qfMdWrap='1';}
  }
}

function wrap(name,kind){
  const fn=window[name];if(typeof fn!=='function'||fn.__qfMdWrapped)return false;
  const wrapped=async function(...args){const result=await fn.apply(this,args);const modal=document.querySelector('.qf-rec-modal');if(modal)enhanceModal(modal,kind);return result;};wrapped.__qfMdWrapped=true;window[name]=wrapped;return true;
}
function boot(){const a=wrap('qfOpenSalidas','salidas'),b=wrap('qfOpenRecepciones','entradas');return a||b;}
if(!boot()){const timer=setInterval(()=>{if(boot())clearInterval(timer)},50);setTimeout(()=>clearInterval(timer),10000);}
