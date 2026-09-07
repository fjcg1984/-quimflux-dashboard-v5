/* QUIMFLUX — asegura que Recepciones siga siendo navegable en modo paralelo. */
if (new URLSearchParams(location.search).get('parallel') === '1') {
  function fixRecepcionesNav() {
    const nav = document.querySelector('.qf-nav');
    if (!nav) return;
    const buttons = nav.querySelectorAll('[data-qf-rec-nav="1"]');
    buttons.forEach(button => {
      button.hidden = false;
      button.removeAttribute('aria-hidden');
      button.style.removeProperty('display');
      button.style.setProperty('display', 'flex', 'important');
      button.disabled = false;
      button.style.removeProperty('pointer-events');
      if (!button.dataset.qfRecParallelHandler) {
        button.dataset.qfRecParallelHandler = '1';
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.qfOpenRecepciones?.();
        }, true);
      }
    });
  }
  const observer = new MutationObserver(fixRecepcionesNav);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  fixRecepcionesNav();
  setInterval(fixRecepcionesNav, 300);
}
