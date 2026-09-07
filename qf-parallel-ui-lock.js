/* QUIMFLUX — bloqueo de navegación operativa en modo paralelo. */
if (new URLSearchParams(location.search).get('parallel') === '1') {
  const operational = new Set(['inventario','recepciones','despachos']);
  const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function lock() {
    const nav = document.querySelector('.qf-nav');
    if (!nav) return;

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

    // Protección adicional por texto para elementos que otros scripts vuelvan a insertar.
    [...nav.children].forEach(el => {
      if (el.classList.contains('qpl-nav')) return;
      const text = norm(el.textContent);
      if (operational.has(text)) {
        el.hidden = true;
        el.style.setProperty('display','none','important');
      }
    });
  }

  const observer = new MutationObserver(lock);
  observer.observe(document.body, {childList:true, subtree:true, attributes:true});
  lock();
  setInterval(lock, 300);
}
