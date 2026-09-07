/* QUIMFLUX — nomenclatura visible de módulos.
   Solo cambia etiquetas de interfaz; no modifica IDs, funciones ni tablas.
*/
(function () {
  const replacements = new Map([
    ['Despachos', 'Salidas'],
    ['Recepciones', 'Entradas']
  ]);

  function apply() {
    document.querySelectorAll('nav button, h1, h2, h3, h4, p, span, button, th, label').forEach(el => {
      const text = el.textContent?.trim();
      const replacement = replacements.get(text);
      if (replacement) el.textContent = replacement;
    });
  }

  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(apply, 50);
  };

  apply();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
