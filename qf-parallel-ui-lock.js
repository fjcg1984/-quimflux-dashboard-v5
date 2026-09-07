/* QUIMFLUX — bloqueo de navegación y edición operativa en modo paralelo. */
if (new URLSearchParams(location.search).get('parallel') === '1') {
  const operational = new Set(['inventario','recepciones','despachos']);
  const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const mutationWords = [
    'nueva','nuevo','agregar','añadir','crear','guardar','editar','eliminar','borrar',
    'actualizar','registrar','confirmar','anular','modificar','grabar','procesar','recepcionar',
    'despachar','salida','entrada','ajustar stock','ajuste de stock'
  ];
  const isMutationText = text => {
    const value = norm(text);
    return mutationWords.some(word => value.includes(norm(word)));
  };
  const isAllowedControl = el => {
    const text = norm(el?.textContent);
    const attrs = norm(`${el?.getAttribute?.('aria-label') || ''} ${el?.getAttribute?.('title') || ''}`);
    return ['filtrar','limpiar','consultar proveedor','buscar','refrescar','actualizar datos','consulta','salir'].some(word =>
      text.includes(word) || attrs.includes(word)
    );
  };

  function lock() {
    const nav = document.querySelector('.qf-nav');
    if (nav) {
      // Los botones de CONSULTA OPERATIVA jamás deben ser tratados como navegación normal.
      nav.querySelectorAll('.qpl-nav-btn').forEach(btn => {
        btn.classList.remove('qf-nav-btn','active','qf-active');
        btn.setAttribute('data-qf-parallel-consulta','1');
      });

      // Ocultar los botones operativos originales aunque estén dentro de wrappers.
      nav.querySelectorAll('button,a').forEach(btn => {
        if (btn.closest('.qpl-nav')) return;
        const values = [
          norm(btn.textContent),
          norm(btn.getAttribute('aria-label')),
          norm(btn.getAttribute('title')),
          norm(btn.dataset.tab),
          norm(btn.dataset.target),
          norm(btn.getAttribute('href'))
        ];
        if (values.some(v => operational.has(v) || [...operational].some(x => v.includes(`tab=${x}`)))) {
          btn.hidden = true;
          btn.style.setProperty('display','none','important');
          btn.setAttribute('aria-hidden','true');
        }
      });

      [...nav.children].forEach(el => {
        if (el.classList.contains('qpl-nav')) return;
        const text = norm(el.textContent);
        if (operational.has(text)) {
          el.hidden = true;
          el.style.setProperty('display','none','important');
        }
      });
    }

    // Bloquea cualquier control de alta/edición/eliminación que haya quedado visible.
    document.querySelectorAll('button,a,input[type="submit"],input[type="button"],input[type="reset"],select,textarea').forEach(el => {
      if (el.closest('.qpl-nav')) return;
      if (el.dataset.qfParallelLocked === '1') return;
      if (isAllowedControl(el)) return;

      const hayMutation = isMutationText(`${el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.getAttribute('value') || ''} ${el.getAttribute('name') || ''} ${el.getAttribute('id') || ''}`);
      const insideOperationalForm = el.closest('form,dialog,[role="dialog"],.modal,.qf-modal,.formulario,.form-container');

      if (hayMutation || (insideOperationalForm && (el.matches('select,textarea,input') || el.type === 'submit'))) {
        el.dataset.qfParallelLocked = '1';
        el.disabled = true;
        el.setAttribute('aria-disabled','true');
        el.style.setProperty('pointer-events','none','important');
        if (el.tagName === 'A') el.setAttribute('tabindex','-1');
      }
    });

    // Campos de edición dentro de las vistas operativas quedan bloqueados, pero los filtros siguen activos.
    const heading = norm(document.body.textContent);
    const operationalPage = ['inventario','recepciones','despachos'].some(name => heading.includes(name));
    if (operationalPage) {
      document.querySelectorAll('form input:not([type="search"]), form select, form textarea').forEach(el => {
        const parentText = norm(el.closest('form')?.textContent || '');
        const isFilter = parentText.includes('filtrar') || parentText.includes('buscar') || parentText.includes('consulta');
        if (!isFilter && !el.dataset.qfParallelFilter) {
          el.disabled = true;
          el.setAttribute('aria-readonly','true');
        }
      });
    }
  }

  // Bloqueo preventivo de acciones de mutación antes de que otros scripts las procesen.
  document.addEventListener('click', event => {
    const el = event.target.closest?.('button,a,input[type="submit"],input[type="button"]');
    if (!el || el.closest('.qpl-nav') || isAllowedControl(el)) return;
    const descriptor = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.getAttribute('value') || ''} ${el.getAttribute('data-action') || ''}`;
    if (isMutationText(descriptor)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      el.disabled = true;
      el.setAttribute('aria-disabled','true');
    }
  }, true);

  // Solo se bloquean formularios que claramente corresponden a alta/edición; los filtros pueden enviarse.
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form || isAllowedControl(form)) return;
    if (isMutationText(form.textContent || '') || form.querySelector('[data-qf-parallel-locked="1"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const observer = new MutationObserver(lock);
  observer.observe(document.body, {childList:true, subtree:true, attributes:true});
  lock();
  setInterval(lock, 300);
}
