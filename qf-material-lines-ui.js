/* QUIMFLUX: gestión de filas de materiales.
   - Lote en Entradas es opcional.
   - Permite eliminar cualquier fila de material en Entradas y Salidas.
   - Si se elimina la última fila, deja una fila vacía para mantener el formulario utilizable.
*/
(function(){
  const STYLE_ID='qf-material-lines-ui-style';
  function style(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent='.qf-line-remove{min-width:36px!important;width:36px;height:40px!important;padding:0!important;font-size:18px;line-height:1;border-radius:8px}.qf-line-remove:hover{filter:brightness(1.12)}';
    document.head.appendChild(s);
  }
  function isEntry(form){
    const title=form.closest('.qf-rec-modal')?.querySelector('h2')?.textContent||'';
    return /entrada/i.test(title);
  }
  function normalize(form){
    if(!form.matches('.qf-mf-form')) return;
    style();
    const lines=form.querySelector('[data-lines]');
    if(!lines) return;
    if(isEntry(form)) lines.querySelectorAll('input.ll,input[name="lot"]').forEach(el=>el.removeAttribute('required'));
    lines.querySelectorAll('.qf-line-remove').forEach(btn=>{
      if(btn.dataset.qfMaterialUi==='1') return;
      btn.dataset.qfMaterialUi='1';
      btn.title='Eliminar material';
      btn.setAttribute('aria-label','Eliminar material');
      btn.textContent='×';
      btn.onclick=()=>{
        const row=btn.closest('.qf-rec-line,[data-line]')||btn.parentElement;
        if(!row) return;
        const rows=[...lines.children];
        if(rows.length>1){ row.remove(); return; }
        row.querySelectorAll('select,input,textarea').forEach(el=>{
          if(el.tagName==='SELECT') el.value='';
          else el.value='';
        });
      };
    });
  }
  function start(){
    style();
    document.querySelectorAll('.qf-mf-form').forEach(normalize);
    new MutationObserver(()=>document.querySelectorAll('.qf-mf-form').forEach(normalize)).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
