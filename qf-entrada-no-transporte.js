/* Entradas no requiere datos de transporte. Oculta y desactiva ese bloque
   sólo cuando el formulario corresponde a una entrada; Salidas lo conserva. */
function cleanEntradaTransport(){
  document.querySelectorAll('.qf-mf-form').forEach(form=>{
    const title=form.closest('.qf-rec-modal-card')?.querySelector('.qf-rec-modal-head h2')?.textContent?.trim()||'';
    if(!/^((Nueva|Editar|Ver) entrada)$/i.test(title))return;
    form.querySelectorAll('.qf-rec-section').forEach(section=>{
      const heading=section.querySelector('h3')?.textContent?.trim().toLowerCase();
      if(heading!=='transporte')return;
      section.querySelectorAll('input,select,textarea,button').forEach(el=>{
        el.disabled=true;
        el.tabIndex=-1;
      });
      section.remove();
    });
  });
}

cleanEntradaTransport();
new MutationObserver(cleanEntradaTransport).observe(document.body,{childList:true,subtree:true});
