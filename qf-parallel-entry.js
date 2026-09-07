import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ENABLED = new URLSearchParams(location.search).get('parallel') === '1';
if (!ENABLED) return;

const supabase = createClient(
  'https://cgkdztwtodmdteohvuoh.supabase.co',
  'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe'
);

const views = [
  ['inventario','▦','Inventario','inventory'],
  ['recepciones','↓','Recepciones','qf_receipts'],
  ['despachos','↑','Despachos','qf_shipments']
];

const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const first = (r,ks) => { for (const k of ks) if (r?.[k] !== null && r?.[k] !== undefined && r?.[k] !== '') return r[k]; return '—'; };

function style(){
 if(document.getElementById('qf-parallel-style')) return;
 const s=document.createElement('style'); s.id='qf-parallel-style'; s.textContent=`
 .qfp-nav{margin-top:16px;padding-top:12px;border-top:1px solid rgba(127,127,127,.18)}
 .qfp-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;opacity:.6;margin:0 0 7px}
 .qfp-nav button{width:100%;display:flex;gap:8px;align-items:center;text-align:left;margin:3px 0}
 .qfp-nav button small{margin-left:auto;opacity:.55;text-transform:uppercase}
 .qfp-wrap{padding:4px 0 24px}.qfp-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:18px}.qfp-head h1{margin:0 0 5px}.qfp-head p{margin:0;opacity:.7}.qfp-badge{border:1px solid rgba(8,127,79,.3);border-radius:999px;padding:8px 12px;font-size:11px;font-weight:800}.qfp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.qfp-grid>div{border:1px solid rgba(127,127,127,.18);border-radius:12px;padding:14px;background:rgba(127,127,127,.035)}.qfp-grid span{display:block;font-size:11px;text-transform:uppercase;opacity:.6;margin-bottom:5px}.qfp-grid b{font-size:22px}.qfp-toolbar{display:flex;gap:10px;margin-bottom:12px}.qfp-toolbar input{flex:1;min-width:180px;padding:10px 12px;border:1px solid rgba(127,127,127,.25);border-radius:9px;background:inherit;color:inherit}.qfp-toolbar button{padding:9px 13px;border:1px solid rgba(127,127,127,.25);border-radius:9px;background:inherit;color:inherit;cursor:pointer}.qfp-table{overflow:auto;border:1px solid rgba(127,127,127,.18);border-radius:12px}.qfp-table table{width:100%;border-collapse:collapse;min-width:760px}.qfp-table th,.qfp-table td{padding:10px 12px;border-bottom:1px solid rgba(127,127,127,.12);text-align:left;font-size:13px}.qfp-table th{font-size:11px;text-transform:uppercase;opacity:.65;white-space:nowrap}.qfp-empty{padding:28px;text-align:center;opacity:.65;border:1px dashed rgba(127,127,127,.25);border-radius:12px}.qfp-note{font-size:12px;opacity:.6}@media(max-width:900px){.qfp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.qfp-grid{grid-template-columns:1fr}.qfp-toolbar{flex-wrap:wrap}.qfp-toolbar input{min-width:100%}}
 `; document.head.appendChild(s);
}

function hideOperational(){
 const nav=document.querySelector('.qf-nav'); if(!nav) return;
 nav.querySelectorAll('button,a').forEach(el=>{
   const t=norm(el.textContent), a=norm(el.getAttribute('aria-label')), h=norm(el.getAttribute('title'));
   if(['inventario','recepciones','despachos'].includes(t)||['inventario','recepciones','despachos'].includes(a)||['inventario','recepciones','despachos'].includes(h)) el.hidden=true;
 });
}

function addNav(){
 const nav=document.querySelector('.qf-nav'); if(!nav || nav.querySelector('.qfp-nav')) return;
 const box=document.createElement('div'); box.className='qfp-nav'; box.innerHTML='<p class="qfp-label">CONSULTA OPERATIVA</p>'+views.map(([k,i,l])=>`<button type="button" class="qf-nav-btn" data-qfp="${k}"><span>${i}</span>${l}<small>Consulta</small></button>`).join(''); nav.appendChild(box);
 box.querySelectorAll('[data-qfp]').forEach(b=>b.addEventListener('click',()=>openView(b.dataset.qfp)));
}

async function rows(type){
 const table=views.find(v=>v[0]===type)[3];
 const {data:userData}=await supabase.auth.getUser();
 let q=supabase.from(table).select('*');
 if(userData?.user?.id) q=q.eq('user_id',userData.user.id);
 const {data,error}=await q;
 if(error) throw error;
 return data||[];
}

const fields={
 inventario:[['Producto',['nombre','producto','descripcion','codigo_producto']],['Código',['codigo','codigo_producto','sku']],['Unidad',['unidad','unidad_medida']],['Stock',['stock_sistema','stock_actual','stock']],['Entradas',['entradas','entrada']],['Salidas',['salidas','salida']],['Mínimo',['stock_minimo','min_stock','minimo']]],
 recepciones:[['Fecha',['fecha','fecha_recepcion']],['Guía',['guia','numero_guia','nro_guia']],['Proveedor',['proveedor','proveedor_nombre','razon_social']],['OC',['oc','orden_compra','numero_oc']],['Estado',['estado','status']],['Cantidad',['cantidad','cantidad_total','total_cantidad']],['Peso',['peso','peso_total','total_peso']]],
 despachos:[['Fecha',['fecha','fecha_despacho']],['Guía',['guia','numero_guia','nro_guia']],['Cliente',['cliente','cliente_nombre','razon_social']],['OC',['oc','orden_compra','numero_oc']],['Estado',['estado','status']],['Cantidad',['cantidad','cantidad_total','total_cantidad']],['Peso',['peso','peso_total','total_peso']]]
};
function table(type,rs,search=''){
 const q=norm(search), data=q?rs.filter(r=>norm(JSON.stringify(r)).includes(q)):rs;
 if(!data.length) return '<div class="qfp-empty">No hay registros que coincidan con la consulta.</div>';
 const cols=fields[type].filter(([,ks])=>data.some(r=>ks.some(k=>r?.[k]!==null&&r?.[k]!==undefined&&r?.[k]!=='')));
 const use=cols.length>=4?cols:Object.keys(data[0]).filter(k=>!['id','user_id','created_at','updated_at'].includes(k)).slice(0,8).map(k=>[k.replace(/_/g,' '),[k]]);
 return `<div class="qfp-table"><table><thead><tr>${use.map(c=>`<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${data.map(r=>`<tr>${use.map(c=>`<td>${esc(first(r,c[1]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="qfp-note">SOLO LECTURA · Edición y eliminación exclusivamente en Inventario QUIMFLUX.</p>`;
}
function cards(type,rs){
 if(type==='inventario'){const low=rs.filter(r=>num(first(r,['stock_minimo','min_stock','minimo']))>0&&num(first(r,['stock_sistema','stock_actual','stock']))<=num(first(r,['stock_minimo','min_stock','minimo']))).length;return `<div class="qfp-grid"><div><span>Ítems</span><b>${rs.length}</b></div><div><span>Bajo mínimo</span><b>${low}</b></div><div><span>Suficientes</span><b>${Math.max(0,rs.length-low)}</b></div><div><span>Modo</span><b>Consulta</b></div></div>`;}
 const qty=rs.reduce((s,r)=>s+num(first(r,['cantidad','cantidad_total','total_cantidad'])),0), wt=rs.reduce((s,r)=>s+num(first(r,['peso','peso_total','total_peso'])),0);
 return `<div class="qfp-grid"><div><span>Registros</span><b>${rs.length}</b></div><div><span>Cantidad</span><b>${qty.toLocaleString('es-PE')}</b></div><div><span>Peso</span><b>${wt?wt.toLocaleString('es-PE'):'—'}</b></div><div><span>Modo</span><b>Consulta</b></div></div>`;
}

async function openView(type){
 const content=document.querySelector('.qf-content #content')||document.querySelector('#content'); if(!content) return;
 const title=views.find(v=>v[0]===type)[2]; content.innerHTML=`<main class="qfp-wrap"><div class="qfp-head"><div><h1>${title}</h1><p>Consulta operativa desde el Dashboard Administrador.</p></div><span class="qfp-badge">● SOLO LECTURA</span></div><div id="qfp-body"><div class="qfp-empty">Cargando información…</div></div></main>`;
 try{const rs=await rows(type),body=document.getElementById('qfp-body');body.innerHTML=cards(type,rs)+`<div class="qfp-toolbar"><input id="qfp-search" type="search" placeholder="Buscar…"><button id="qfp-refresh" type="button">↻ Actualizar</button></div><div id="qfp-table">${table(type,rs)}</div>`;document.getElementById('qfp-search').oninput=e=>document.getElementById('qfp-table').innerHTML=table(type,rs,e.target.value);document.getElementById('qfp-refresh').onclick=()=>openView(type);}catch(e){document.getElementById('qfp-body').innerHTML=`<div class="qfp-empty">No fue posible consultar ${esc(title)}. ${esc(e?.message||'Error de conexión.')}</div>`;}
}

function boot(){style();hideOperational();addNav();}
const observer=new MutationObserver(boot); observer.observe(document.body,{childList:true,subtree:true}); boot();
