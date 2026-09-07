/* QUIMFLUX — Rama paralela
   Oculta del Dashboard Administrador las vistas operativas de
   Inventario, Recepciones y Despachos.

   Importante: no elimina ni modifica la lógica operativa existente.
   Estas funciones quedan intactas para la futura integración con
   Inventario QUIMFLUX como fuente de datos.
*/
(function () {
  const HIDDEN = new Set(['inventario', 'recepciones', 'despachos']);

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function hideOperationalTabs() {
    const nav = document.querySelector('.qf-nav');
    if (!nav) return;

    nav.querySelectorAll('button, a').forEach((item) => {
      const text = normalize(item.textContent);
      const aria = normalize(item.getAttribute('aria-label'));
      const title = normalize(item.getAttribute('title'));
      const target = normalize(
        item.dataset?.tab ||
        item.dataset?.view ||
        item.getAttribute('data-tab') ||
        item.getAttribute('href')
      );

      const isOperational = [...HIDDEN].some((key) =>
        text === key || aria === key || title === key || target === key || target.endsWith(`#${key}`)
      );

      if (isOperational) {
        item.hidden = true;
        item.setAttribute('aria-hidden', 'true');
        item.dataset.qfOperationalHidden = '1';
      }
    });
  }

  const observer = new MutationObserver(hideOperationalTabs);
  observer.observe(document.body, { childList: true, subtree: true });

  hideOperationalTabs();
  setInterval(hideOperationalTabs, 500);
})();
