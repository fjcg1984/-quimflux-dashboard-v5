import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY='sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const style=document.createElement('style');
style.textContent=`
.qf-oc-field{display:flex;gap:8px;align-items:end}.qf-oc-field>label{flex:1}.qf-oc-add{height:42px;white-space:nowrap}.qf-oc-inline{margin-top:12px;padding:14px;border:1px solid #33423d;border-radius:10px;background:#0d1312}.qf-oc-inline-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px}.qf-oc-inline label{display:flex;flex-direction:column;gap:6px;color:#9db0ba;font-size:13px}.qf-oc-inline input,.qf-oc-inline select{box-sizing:border-box;width:100%;background:#0b1110;color:#f3f7f8;border:1px solid #33423d;border-radius:8px;padding:9px 10px;font:inherit}.qf-oc-inline-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.qf-oc-msg{font-size:13px;color:#9db0ba;margin-top:8px}.qf-oc-msg.ok{color:#8fd3b1}.qf-oc-msg.err{color:#ff9c9c}@media(max-width:700px){.qf-oc-inline-grid{grid-template-columns:1fr}.qf-oc-field{align-items:stretch;flex-direction:column}.qf-oc-add{width:100%}}
`;
document.head.appendChild(style);

function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));}

async function getUser(){
  const {data,error}=await supabase.auth.getUser();
  if(error) throw error;
  return data?.user||null;
}

async function loadOrders(ownerId){
  const {data,error}=await supabase.from('qf_purchase_orders').select('id,oc_number,operating_unit,status,customer_id,created_at').eq('owner_id',ownerId).order('created_at',{ascending:false});
  if(error) throw error;
  return data||[];
}

async function ensureCustomer(ownerId,supplier){
  const name=String(supplier?.name||'').trim();
  const ruc=String(supplier?.ruc||'').trim();
  if(!name) throw new Error('Selecciona o ingresa un proveedor antes de registrar la O/C.');

  let query=supabase.from('qf_customers').select('id,business_name,ruc').eq('owner_id',ownerId);
  if(ruc) query=query.eq('ruc',ruc);
  else query=query.ilike('business_name',name).limit(1);
  const {data,error}=await query.limit(1);
  if(error) throw error;
  if(data?.[0]) return data[0].id;

  const {data:created,error:createError}=await supabase.from('qf_customers').insert({owner_id:ownerId,business_name:name,ruc:ruc||null,active:true}).select('id').single();
  if(createError) throw createError;
  return created.id;
}

async function refreshSelect(select,ownerId,selected=''){
  const orders=await loadOrders(ownerId);
  select.innerHTML='<option value="">— Seleccionar O/C —</option>'+orders.map(o=>`<option value="${esc(o.oc_number)}" data-oc-id="${esc(o.id)}">${esc(o.oc_number)}${o.operating_unit?' · '+esc(o.operating_unit):''}${o.status?' · '+esc(o.status):''}</option>`).join('');
  if(selected) select.value=selected;
}

async function enhanceModal(modal){
  if(!modal||modal.__qfOcEnhanced) return;
  const input=modal.querySelector('input[name="purchase_order"]');
  const supplierSelect=modal.querySelector('select[name="supplier_id"]');
  const supplierName=modal.querySelector('input[name="supplier_name"]');
  const supplierRuc=modal.querySelector('input[name="supplier_ruc"]');
  if(!input||!supplierSelect) return;
  modal.__qfOcEnhanced=true;

  const original=input.value||'';
  const label=input.closest('label');
  const wrapper=document.createElement('div');
  wrapper.className='qf-oc-field';
  label.parentNode.insertBefore(wrapper,label);
  wrapper.appendChild(label);

  const addButton=document.createElement('button');
  addButton.type='button';
  addButton.className='secondary qf-oc-add';
  addButton.textContent='+ Registrar O/C existente';
  wrapper.appendChild(addButton);

  const select=document.createElement('select');
  select.name='purchase_order';
  select.required=false;
  select.setAttribute('aria-label','Orden de compra');
  select.className=input.className;
  input.replaceWith(select);

  let user;
  try{user=await getUser();if(user) await refreshSelect(select,user.id,original);}catch(error){console.error('QUIMFLUX O/C:',error);}

  select.addEventListener('change',()=>{
    const opt=select.selectedOptions[0];
    select.dataset.purchaseOrderId=opt?.dataset?.ocId||'';
  });

  addButton.addEventListener('click',()=>{
    if(modal.querySelector('.qf-oc-inline')) return;
    const panel=document.createElement('div');
    panel.className='qf-oc-inline';
    panel.innerHTML=`<div class="qf-oc-inline-grid">
      <label>N.º de O/C<input class="qf-oc-number" placeholder="OC-000123" required></label>
      <label>Unidad / referencia<input class="qf-oc-unit" placeholder="Compras / Planta"></label>
      <label>Estado<select class="qf-oc-status"><option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="atendida">Atendida</option><option value="cancelada">Cancelada</option></select></label>
    </div><div class="qf-oc-inline-actions"><button type="button" class="secondary qf-oc-cancel">Cancelar</button><button type="button" class="primary qf-oc-save">Guardar O/C</button></div><div class="qf-oc-msg"></div>`;
    const section=label.closest('.qf-rec-section');
    section.appendChild(panel);
    panel.querySelector('.qf-oc-cancel').onclick=()=>panel.remove();
    panel.querySelector('.qf-oc-save').onclick=async()=>{
      const msg=panel.querySelector('.qf-oc-msg');
      const number=panel.querySelector('.qf-oc-number').value.trim();
      const unit=panel.querySelector('.qf-oc-unit').value.trim()||null;
      const status=panel.querySelector('.qf-oc-status').value;
      if(!number){msg.className='qf-oc-msg err';msg.textContent='Ingresa el número de O/C.';return;}
      try{
        const currentUser=user||await getUser();
        if(!currentUser) throw new Error('La sesión no está disponible.');
        const {data:existing,error:checkError}=await supabase.from('qf_purchase_orders').select('id,oc_number').eq('owner_id',currentUser.id).eq('oc_number',number).limit(1);
        if(checkError) throw checkError;
        if(existing?.[0]){
          await refreshSelect(select,currentUser.id,number);
          panel.remove();
          return;
        }
        const supplier={name:supplierName?.value.trim(),ruc:supplierRuc?.value.trim()};
        const customerId=await ensureCustomer(currentUser.id,supplier);
        const {data:created,error:createError}=await supabase.from('qf_purchase_orders').insert({owner_id:currentUser.id,customer_id:customerId,oc_number:number,operating_unit:unit,status}).select('id,oc_number').single();
        if(createError) throw createError;
        await refreshSelect(select,currentUser.id,created.oc_number);
        panel.remove();
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }catch(error){
        console.error('QUIMFLUX registrar O/C:',error);
        msg.className='qf-oc-msg err';
        msg.textContent='No se pudo registrar la O/C: '+(error?.message||error);
      }
    };
  });
}

function wrapOpen(){
  if(typeof window.qfOpenRecepciones!=='function'||window.qfOpenRecepciones.__qfOcWrapped)return false;
  const original=window.qfOpenRecepciones;
  const wrapped=async function(...args){
    const result=await original.apply(this,args);
    const modal=document.querySelector('.qf-rec-modal');
    if(modal) await enhanceModal(modal);
    return result;
  };
  wrapped.__qfOcWrapped=true;
  window.qfOpenRecepciones=wrapped;
  return true;
}

if(!wrapOpen()){
  const timer=setInterval(()=>{if(wrapOpen())clearInterval(timer);},50);
  setTimeout(()=>clearInterval(timer),10000);
}
