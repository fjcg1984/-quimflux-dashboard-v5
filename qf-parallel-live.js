import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* QUIMFLUX — consultas operativas del Dashboard, SOLO LECTURA.
   Se activa únicamente con ?parallel=1.
   Importante: inventory / qf_receipts / qf_shipments no tienen user_id,
   por lo que las consultas NO filtran por ese campo. */
if (new URLSearchParams(location.search).get('parallel') !== '1') {
  // Modo normal: no hacer nada.
} else {
  const sb = createClient(
    'https://cgkdztwtodmdteohvuoh.supabase.co',
    'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe'
  );

  const views = [
    ['inventario', '▦', 'Inventario', 'inventory'],
    ['recepciones', '↓', 'Recepciones', 'qf_receipts'],
    ['despachos', '↑', 'Despachos', 'qf_shipments']
  ];

  const norm = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const esc = value => String(value ?? '')
    .replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));

  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  const first = (row, keys) => {
    for (const key of keys) {
      if (row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== '') {
        return row[key];
      }
    }
    return '—';
  };

  const columns = {
    inventario: [
      ['Producto', ['material', 'nombre', 'producto', 'descripcion', 'codigo_producto']],
      ['Código', ['codigo', 'codigo_producto', 'sku']],
      ['Categoría', ['categoria', 'category']],
      ['Unidad', ['unidad', 'unidad_medida']],
      ['Stock', ['stock_sistema', 'stock_actual', 'stock']],
      ['Entradas', ['entradas', 'entrada']],
      ['Salidas', ['salidas', 'salida']],
      ['Mínimo', ['stock_minimo', 'min_stock', 'minimo']]
    ],
    recepciones: [
      ['Fecha', ['fecha', 'fecha_recepcion', 'created_at']],
      ['Guía', ['guia', 'numero_guia', 'nro_guia', 'guide_number']],
      ['Proveedor', ['proveedor', 'proveedor_nombre', 'razon_social', 'supplier_name']],
      ['OC', ['oc', 'orden_compra', 'numero_oc', 'purchase_order']],
      ['Estado', ['estado', 'status']],
      ['Cantidad', ['cantidad', 'cantidad_total', 'total_cantidad', 'quantity']],
      ['Peso', ['peso', 'peso_total', 'total_peso', 'weight']]
    ],
    despachos: [
      ['Fecha', ['fecha', 'fecha_despacho', 'created_at']],
      ['Guía', ['guia', 'numero_guia', 'nro_guia', 'guide_number']],
      ['Cliente', ['cliente', 'cliente_nombre', 'razon_social', 'customer_name']],
      ['OC', ['oc', 'orden_compra', 'numero_oc', 'purchase_order']],
      ['Estado', ['estado', 'status']],
      ['Cantidad', ['cantidad', 'cantidad_total', 'total_cantidad', 'quantity']],
      ['Peso', ['peso', 'peso_total', 'total_peso', 'weight']]
    ]
  };

  const style = document.createElement('style');
  style.id = 'qpl-style';
  style.textContent = `
    .qpl-nav{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.18)}
    .qpl-nav-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;opacity:.55;margin:0 0 8px 8px}
    .qpl-nav-btn{width:100%;display:flex;align-items:center;gap:8px;margin:4px 0;padding:10px 12px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;cursor:pointer;font:inherit}
    .qpl-nav-btn:hover{background:rgba(255,255,255,.07)}
    .qpl-nav-btn.active{background:#087f4f;color:#fff}
    .qpl-nav-btn small{margin-left:auto;opacity:.55;font-size:10px}
    .qpl-wrap{padding:8px 0 24px}
    .qpl-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:18px}
    .qpl-head h1{margin:0 0 5px}
    .qpl-head p{margin:0;opacity:.7}
    .qpl-badge{border:1px solid #087f4f;border-radius:999px;padding:8px 12px;font-size:11px;font-weight:800;white-space:nowrap}
    .qpl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}
    .qpl-grid>div{border:1px solid #ddd;border-radius:12px;padding:14px;background:rgba(255,255,255,.35)}
    .qpl-grid span{display:block;font-size:11px;text-transform:uppercase;opacity:.6}
    .qpl-grid b{display:block;margin-top:3px;font-size:22px}
    .qpl-toolbar{display:flex;gap:10px;margin:12px 0}
    .qpl-toolbar input{flex:1;min-width:180px;padding:10px;border:1px solid #ccc;border-radius:9px;background:inherit;color:inherit}
    .qpl-toolbar button{padding:9px 13px;border:1px solid #ccc;border-radius:9px;background:inherit;color:inherit;cursor:pointer}
    .qpl-table{overflow:auto;border:1px solid #ddd;border-radius:12px;background:rgba(255,255,255,.3)}
    .qpl-table table{width:100%;border-collapse:collapse;min-width:760px}
    .qpl-table th,.qpl-table td{padding:10px 12px;border-bottom:1px solid #eee;text-align:left;font-size:13px}
    .qpl-table th{font-size:11px;text-transform:uppercase;opacity:.65}
    .qpl-empty{padding:28px;text-align:center;opacity:.65;border:1px dashed #ccc;border-radius:12px}
    .qpl-note{font-size:12px;opacity:.6}
    @media(max-width:800px){.qpl-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:500px){.qpl-grid{grid-template-columns:1fr}.qpl-toolbar{flex-wrap:wrap}}
  `;
  document.head.appendChild(style);

  function hideOperationalButtons() {
    const nav = document.querySelector('.qf-nav');
    if (!nav) return;

    [...nav.querySelectorAll(':scope > button, :scope > a')].forEach(button => {
      const text = norm(button.textContent);
      const aria = norm(button.getAttribute('aria-label'));
      const title = norm(button.getAttribute('title'));
      const tab = norm(button.dataset.tab);
      const target = norm(button.dataset.target);

      const operational = ['inventario', 'recepciones', 'despachos'].some(value =>
        [text, aria, title, tab, target].includes(value)
      );

      if (operational && !button.closest('.qpl-nav')) {
        button.style.display = 'none';
        button.setAttribute('aria-hidden', 'true');
        button.dataset.qplHidden = '1';
      }
    });
  }

  function ensureNav() {
    const nav = document.querySelector('.qf-nav');
    if (!nav) return;

    hideOperationalButtons();

    let box = nav.querySelector('.qpl-nav');
    if (!box) {
      box = document.createElement('div');
      box.className = 'qpl-nav';
      nav.appendChild(box);
    }

    box.innerHTML = `
      <p class="qpl-nav-label">CONSULTA OPERATIVA</p>
      ${views.map(([id, icon, label]) => `
        <button type="button" class="qpl-nav-btn" data-qpl="${id}">
          <span>${icon}</span><span>${label}</span><small>Consulta</small>
        </button>
      `).join('')}
    `;

    box.querySelectorAll('[data-qpl]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        open(button.dataset.qpl);
      }, true);
    });
  }

  async function load(type) {
    const view = views.find(item => item[0] === type);
    if (!view) throw new Error('Vista no encontrada.');

    // Estas tablas operativas no poseen user_id. Consulta directa de solo lectura.
    const result = await sb.from(view[3]).select('*');
    if (result.error) throw result.error;
    return result.data || [];
  }

  function renderTable(type, rows, search = '') {
    const filtered = search
      ? rows.filter(row => norm(JSON.stringify(row)).includes(norm(search)))
      : rows;

    if (!filtered.length) {
      return '<div class="qpl-empty">No hay registros para mostrar.</div>';
    }

    let cols = columns[type].filter(([, keys]) =>
      filtered.some(row => keys.some(key => row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== ''))
    );

    if (cols.length < 4) {
      cols = Object.keys(filtered[0])
        .filter(key => !['id', 'user_id', 'created_at', 'updated_at'].includes(key))
        .slice(0, 10)
        .map(key => [key, [key]]);
    }

    return `
      <div class="qpl-table">
        <table>
          <thead><tr>${cols.map(([label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead>
          <tbody>
            ${filtered.map(row => `
              <tr>${cols.map(([, keys]) => `<td>${esc(first(row, keys))}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p class="qpl-note">SOLO LECTURA · La edición y eliminación se realizan exclusivamente en Inventario QUIMFLUX.</p>
    `;
  }

  async function open(type) {
    const content = document.querySelector('#content');
    if (!content) return;

    const title = views.find(view => view[0] === type)?.[2] || 'Consulta operativa';

    content.innerHTML = `
      <main class="qpl-wrap">
        <div class="qpl-head">
          <div>
            <h1>${esc(title)}</h1>
            <p>Consulta operativa desde el Dashboard Administrador.</p>
          </div>
          <span class="qpl-badge">● SOLO LECTURA</span>
        </div>
        <div id="qpl-body"><div class="qpl-empty">Cargando ${esc(title)}…</div></div>
      </main>
    `;

    // Esperar al render de contenido y luego cargar los datos.
    try {
      const rows = await load(type);
      const quantity = rows.reduce((sum, row) => sum + num(first(row, ['cantidad', 'cantidad_total', 'total_cantidad', 'quantity'])), 0);
      const weight = rows.reduce((sum, row) => sum + num(first(row, ['peso', 'peso_total', 'total_peso', 'weight'])), 0);
      const low = type === 'inventario'
        ? rows.filter(row => {
            const stock = num(first(row, ['stock_sistema', 'stock_actual', 'stock']));
            const minimum = num(first(row, ['stock_minimo', 'min_stock', 'minimo']));
            return minimum > 0 && stock <= minimum;
          }).length
        : 0;

      const body = document.querySelector('#qpl-body');
      if (!body) return;

      body.innerHTML = `
        <div class="qpl-grid">
          <div><span>${type === 'inventario' ? 'Ítems' : 'Registros'}</span><b>${rows.length.toLocaleString('es-PE')}</b></div>
          <div><span>${type === 'inventario' ? 'Bajo mínimo' : 'Cantidad'}</span><b>${type === 'inventario' ? low.toLocaleString('es-PE') : quantity.toLocaleString('es-PE')}</b></div>
          <div><span>${type === 'inventario' ? 'Suficientes' : 'Peso'}</span><b>${type === 'inventario' ? Math.max(0, rows.length - low).toLocaleString('es-PE') : (weight ? weight.toLocaleString('es-PE') : '—')}</b></div>
          <div><span>Modo</span><b>Consulta</b></div>
        </div>
        <div class="qpl-toolbar">
          <input id="qpl-search" type="search" placeholder="Buscar en ${esc(title)}…" autocomplete="off">
          <button id="qpl-refresh" type="button">↻ Actualizar</button>
        </div>
        <div id="qpl-table">${renderTable(type, rows)}</div>
      `;

      document.querySelector('#qpl-search')?.addEventListener('input', event => {
        document.querySelector('#qpl-table').innerHTML = renderTable(type, rows, event.target.value);
      });

      document.querySelector('#qpl-refresh')?.addEventListener('click', () => open(type));
    } catch (error) {
      const body = document.querySelector('#qpl-body');
      if (body) {
        body.innerHTML = `<div class="qpl-empty">No fue posible consultar ${esc(title)}. ${esc(error?.message || 'Error de conexión.')}</div>`;
      }
    }
  }

  function boot() {
    ensureNav();
  }

  // Los scripts del dashboard también observan la navegación; este observer
  // vuelve a ocultar los botones operativos y reconstruye CONSULTA OPERATIVA
  // si otro script la reemplaza.
  const observer = new MutationObserver(() => {
    if (!document.querySelector('.qf-nav')) return;
    ensureNav();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  boot();
}
