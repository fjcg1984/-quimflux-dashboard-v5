import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cgkdztwtodmdteohvuoh.supabase.co',
  'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe'
);

const CONSULTAS = [
  ['inventario', '▦', 'Inventario'],
  ['recepciones', '↓', 'Recepciones'],
  ['despachos', '↑', 'Despachos']
];

const TABLES = {
  inventario: 'inventory',
  recepciones: 'qf_receipts',
  despachos: 'qf_shipments'
};

const TITLES = {
  inventario: ['Inventario', 'Consulta del stock operativo proveniente de Inventario QUIMFLUX.'],
  recepciones: ['Recepciones', 'Consulta de recepciones registradas en Inventario QUIMFLUX.'],
  despachos: ['Despachos', 'Consulta de despachos registrados en Inventario QUIMFLUX.']
};

const FIELDS = {
  inventario: [
    ['Producto', ['nombre', 'producto', 'descripcion', 'codigo_producto']],
    ['Código', ['codigo', 'codigo_producto', 'sku']],
    ['Unidad', ['unidad', 'unidad_medida']],
    ['Stock', ['stock_sistema', 'stock_actual', 'stock']],
    ['Entradas', ['entradas', 'entrada']],
    ['Salidas', ['salidas', 'salida']],
    ['Mínimo', ['stock_minimo', 'min_stock', 'minimo']]
  ],
  recepciones: [
    ['Fecha', ['fecha', 'fecha_recepcion']],
    ['Guía', ['guia', 'numero_guia', 'nro_guia']],
    ['Proveedor', ['proveedor', 'proveedor_nombre', 'razon_social']],
    ['OC', ['oc', 'orden_compra', 'numero_oc']],
    ['Vehículo', ['placa', 'vehiculo']],
    ['Estado', ['estado', 'status']],
    ['Cantidad', ['cantidad', 'cantidad_total', 'total_cantidad']],
    ['Peso', ['peso', 'peso_total', 'total_peso']]
  ],
  despachos: [
    ['Fecha', ['fecha', 'fecha_despacho']],
    ['Guía', ['guia', 'numero_guia', 'nro_guia']],
    ['Cliente', ['cliente', 'cliente_nombre', 'razon_social']],
    ['OC', ['oc', 'orden_compra', 'numero_oc']],
    ['Vehículo', ['placa', 'vehiculo']],
    ['Estado', ['estado', 'status']],
    ['Cantidad', ['cantidad', 'cantidad_total', 'total_cantidad']],
    ['Peso', ['peso', 'peso_total', 'total_peso']]
  ]
};

function norm(v) {
  return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function esc(v = '') {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function num(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function first(row, keys) { for (const k of keys) if (row?.[k] !== null && row?.[k] !== undefined && row?.[k] !== '') return row[k]; return '—'; }
function fmt(label, value) {
  if (label === 'Fecha') {
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
function columns(type, rows) {
  const preferred = FIELDS[type].filter(([, keys]) => rows.some(r => keys.some(k => r?.[k] !== null && r?.[k] !== undefined && r?.[k] !== '')));
  if (preferred.length >= 4) return preferred;
  const excluded = new Set(['id','user_id','created_at','updated_at']);
  const keys = [...new Set(rows.flatMap(r => Object.keys(r || {})))].filter(k => !excluded.has(k)).slice(0,8);
  return keys.map(k => [k.replace(/_/g,' '), [k]]);
}
function tableHtml(type, rows, search = '') {
  const q = norm(search);
  const filtered = q ? rows.filter(r => norm(JSON.stringify(r)).includes(q)) : rows;
  if (!filtered.length) return '<div class="qf-ro-empty">No hay registros que coincidan con la consulta.</div>';
  const cols = columns(type, filtered);
  return `<div class="qf-ro-table"><table><thead><tr>${cols.map(([l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${filtered.map(r => `<tr>${cols.map(([l,k]) => `<td>${esc(fmt(l, first(r,k)))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="qf-ro-note">SOLO LECTURA · La edición y eliminación se realizan exclusivamente en Inventario QUIMFLUX.</p>`;
}
function cards(type, rows) {
  if (type === 'inventario') {
    const low = rows.filter(r => num(first(r,['stock_minimo','min_stock','minimo'])) > 0 && num(first(r,['stock_sistema','stock_actual','stock'])) <= num(first(r,['stock_minimo','min_stock','minimo']))).length;
    return `<div class="qf-ro-grid"><div><span>Ítems</span><b>${rows.length}</b></div><div><span>Bajo mínimo</span><b>${low}</b></div><div><span>Suficientes</span><b>${Math.max(0,rows.length-low)}</b></div><div><span>Modo</span><b>Consulta</b></div></div>`;
  }
  const qty = rows.reduce((s,r)=>s+num(first(r,['cantidad','cantidad_total','total_cantidad'])),0);
  const weight = rows.reduce((s,r)=>s+num(first(r,['peso','peso_total','total_peso'])),0);
  return `<div class="qf-ro-grid"><div><span>Registros</span><b>${rows.length}</b></div><div><span>Cantidad</span><b>${qty.toLocaleString('es-PE')}</b></div><div><span>Peso</span><b>${weight ? weight.toLocaleString('es-PE') : '—'}</b></div><div><span>Modo</span><b>Consulta</b></div></div>`;
}
async function userId() {
  const {data,error} = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user?.id || null;
}
async function load(type) {
  const id = await userId();
  let q = supabase.from(TABLES[type]).select('*');
  if (id) q = q.eq('user_id', id);
  const {data,error} = await q;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
function styles() {
  if (document.getElementById('qf-ro-style')) return;
  const s = document.createElement('style'); s.id='qf-ro-style'; s.textContent=`
    .qf-ro-wrap{padding:4px 0 24px}.qf-ro-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:18px}.qf-ro-head h1{margin:0 0 5px}.qf-ro-head p{margin:0;opacity:.7}.qf-ro-badge{border:1px solid rgba(8,127,79,.3);border-radius:999px;padding:8px 12px;font-size:11px;font-weight:800}.qf-ro-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.qf-ro-grid>div{border:1px solid rgba(127,127,127,.18);border-radius:12px;padding:14px;background:rgba(127,127,127,.035)}.qf-ro-grid span{display:block;font-size:11px;text-transform:uppercase;opacity:.6;margin-bottom:5px}.qf-ro-grid b{font-size:22px}.qf-ro-toolbar{display:flex;gap:10px;margin-bottom:12px}.qf-ro-toolbar input{flex:1;min-width:180px;padding:10px 12px;border:1px solid rgba(127,127,127,.25);border-radius:9px;background:inherit;color:inherit}.qf-ro-toolbar button{padding:9px 13px;border:1px solid rgba(127,127,127,.25);border-radius:9px;background:inherit;color:inherit;cursor:pointer}.qf-ro-table{overflow:auto;border:1px solid rgba(127,127,127,.18);border-radius:12px}.qf-ro-table table{width:100%;border-collapse:collapse;min-width:760px}.qf-ro-table th,.qf-ro-table td{padding:10px 12px;border-bottom:1px solid rgba(127,127,127,.12);text-align:left;font-size:13px;vertical-align:top}.qf-ro-table th{font-size:11px;text-transform:uppercase;opacity:.65;white-space:nowrap}.qf-ro-empty{padding:28px;text-align:center;opacity:.65;border:1px dashed rgba(127,127,127,.25);border-radius:12px}.qf-ro-note{font-size:12px;opacity:.6}.qf-ro-nav{margin-top:16px;padding-top:12px;border-top:1px solid rgba(127,127,127,.18)}.qf-ro-nav-label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;opacity:.6;margin:0 0 7px}.qf-ro-nav button{width:100%;display:flex;gap:8px;align-items:center;text-align:left;margin:3px 0}.qf-ro-nav button small{margin-left:auto;opacity:.55;text-transform:uppercase}@media(max-width:900px){.qf-ro-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.qf-ro-grid{grid-template-columns:1fr}.qf-ro-toolbar{flex-wrap:wrap}.qf-ro-toolbar input{min-width:100%}}
  `; document.head.appendChild(s);
}
function addNav() {
  const nav=document.querySelector('.qf-nav'); if(!nav || nav.dataset.qfRo==='1') return;
  const wrap=document.createElement('div'); wrap.className='qf-ro-nav'; wrap.innerHTML='<p class="qf-ro-nav-label">CONSULTA OPERATIVA</p>'+CONSULTAS.map(([k,i,l])=>`<button type="button" class="qf-nav-btn" data-qf-ro="${k}"><span>${i}</span>${l}<small>Consulta</small></button>`).join(''); nav.appendChild(wrap); nav.dataset.qfRo='1';
  wrap.querySelectorAll('[data-qf-ro]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.qfRo)));
}
async function open(type) {
  const content=document.querySelector('.qf-content #content') || document.querySelector('#content'); if(!content) return;
  document.querySelectorAll('[data-qf-ro]').forEach(b=>b.classList.toggle('qf-active',b.dataset.qfRo===type));
  const [title,subtitle]=TITLES[type];
  content.innerHTML=`<main class="qf-ro-wrap"><div class="qf-ro-head"><div><h1>${title}</h1><p>${subtitle}</p></div><span class="qf-ro-badge">● SOLO LECTURA</span></div><div id="qf-ro-body"><div class="qf-ro-empty">Cargando información…</div></div></main>`;
  try {
    const rows=await load(type), body=document.getElementById('qf-ro-body'); if(!body) return;
    body.innerHTML=cards(type,rows)+`<div class="qf-ro-toolbar"><input id="qf-ro-search" type="search" placeholder="Buscar…" aria-label="Buscar en la consulta"><button type="button" id="qf-ro-refresh">↻ Actualizar</button></div><div id="qf-ro-table">${tableHtml(type,rows)}</div>`;
    document.getElementById('qf-ro-search')?.addEventListener('input',e=>{const el=document.getElementById('qf-ro-table');if(el)el.innerHTML=tableHtml(type,rows,e.target.value)});
    document.getElementById('qf-ro-refresh')?.addEventListener('click',()=>open(type));
  } catch(e) {
    const body=document.getElementById('qf-ro-body'); if(body) body.innerHTML=`<div class="qf-ro-empty">No fue posible consultar ${esc(title.toLowerCase())}. ${esc(e?.message || 'Error de conexión.')}</div>`;
  }
}
function boot(){styles();addNav();}
const observer=new MutationObserver(boot); observer.observe(document.body,{childList:true,subtree:true}); boot();
