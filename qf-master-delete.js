import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://cgkdztwtodmdteohvuoh.supabase.co','sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe');

function style(){
  if(document.getElementById('qf-md-del-style')) return;
  const s=document.createElement('style');
  s.id='qf-md-del-style';
  s.textContent=`.qf-md-delete-wrap{display:flex;align-items:end;gap:8px;width:100%}.qf-md-delete-wrap .qf-md-select-holder{flex:1;min-width:0}.qf-md-delete{height:42px;min-width:42px;padding:0 12px!important;border:1px solid #e7a0a0!important;background:#fff!important;color:#b42318!important;font-weight:700!important;cursor:pointer}.qf-md-delete:hover{background:#fff1f1!important}.qf-md-delete:disabled{opacity:.45;cursor:not-allowed}.qf-md-delete-title{font-size:12px;margin-top:4px;color:#9b2c2c}@media(max-width:760px){.qf-md-delete-wrap{flex-direction:column;align-items:stretch}.qf-md-delete{width:100%}}`;
  document.head.appendChild(s);
}

async function user(){const r=await supabase.auth.getUser();if(r.error)throw r.error;if(!r.data?.user)throw Error('La sesión no está disponible.');return r.data.user}

async function deleteCustomer(id){
  const u=await user();
  const [ship,orders]=await Promise.all([
    supabase.from('qf_shipments').select('id',{count:'exact',head:true}).eq('owner_id',u.id).eq('customer_id',id),
    supabase.from('qf_purchase_orders').select('id',{count:'exact',head:true}).eq('owner_id',u.id).eq('customer_id',id)
  ]);
  if(ship.error)throw ship.error;if(orders.error)throw orders.error;
  if((ship.count||0)>0 || (orders.count||0)>0) throw Error('Este cliente ya está relacionado con movimientos u órdenes de compra. No se puede eliminar sin perder el historial.');
  const r=await supabase.from('qf_customers').update({active:false}).eq('id',id).eq('owner_id',u.id);
  if(r.error)throw r.error;
}

async function deleteSupplier(id){
  const u=await user();
  const r0=await supabase.from('qf_receipts').select('id',{count:'exact',head:true}).eq('owner_id',u.id).eq('supplier_id',id);
  if(r0.error)throw r0.error;
  if((r0.count||0)>0) throw Error('Este proveedor ya está relacionado con entradas registradas. No se puede eliminar sin perder el historial.');
  const r=await supabase.from('qf_suppliers').delete().eq('id',id).eq('owner_id',u.id);
  if(r.error)throw r.error;
}

function addDeleteControl(modal, type){
  const name=type==='customer'?'customer_id':'supplier_id';
  const select=modal.querySelector(`[name="${name}"]`);
  if(!select || select.dataset.qfDeleteReady==='1') return;
  select.dataset.qfDeleteReady='1';
  const row=select.closest('.qf-mf-row');
  if(!row) return;
  const oldButton=row.querySelector('[data-qf-new]');
  const holder=document.createElement('div');
  holder.className='qf-md-select-holder';
  select.parentNode.insertBefore(holder,select);
  holder.appendChild(select);
  const del=document.createElement('button');
  del.type='button';del.className='secondary qf-md-delete';del.textContent='×';del.title=type==='customer'?'Eliminar cliente seleccionado':'Eliminar proveedor seleccionado';
  row.classList.add('qf-md-delete-wrap');
  row.appendChild(del);
  const update=()=>{del.disabled=!select.value;};
  select.addEventListener('change',update);update();
  del.addEventListener('click',async()=>{
    const id=select.value;if(!id)return;
    const label=select.options[select.selectedIndex]?.textContent?.trim()||'';
    if(!confirm(`¿Eliminar ${type==='customer'?'cliente':'proveedor'} "${label}"?\n\nSi ya tiene historial, QUIMFLUX no permitirá eliminarlo.`))return;
    del.disabled=true;
    try{
      if(type==='customer') await deleteCustomer(id); else await deleteSupplier(id);
      select.value='';
      select.dispatchEvent(new Event('change',{bubbles:true}));
      alert(`${type==='customer'?'Cliente':'Proveedor'} eliminado correctamente.`);
      if(type==='customer'){
        modal.querySelector('[name="third_name"]').value='';modal.querySelector('[name="third_ruc"]').value='';
      }
    }catch(e){alert('No se pudo eliminar: '+(e?.message||e));update();}
  });
}

function scan(){
  style();
  document.querySelectorAll('.qf-rec-modal').forEach(modal=>{
    addDeleteControl(modal,'customer');
    addDeleteControl(modal,'supplier');
  });
}

const observer=new MutationObserver(scan);
observer.observe(document.body,{childList:true,subtree:true});
scan();
