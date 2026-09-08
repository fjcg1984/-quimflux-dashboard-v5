/* QUIMFLUX: O/C manual en Entradas y Salidas. Solo presentación del campo. */
(function(){
  function upgrade(root=document){
    root.querySelectorAll('.qf-mf-form [name="purchase_order_id"],.qf-mf-form [name="purchase_order"]').forEach(el=>{
      if(el.tagName==='INPUT') return;
      const input=document.createElement('input');
      input.type='text';
      input.name=el.name;
      input.value=el.value ? (el.selectedOptions?.[0]?.textContent||'').trim() : '';
      input.placeholder='Escribe el N.º de O/C';
      input.autocomplete='off';
      input.className=el.className||'';
      el.replaceWith(input);
    });
  }
  const start=()=>{
    upgrade();
    new MutationObserver(()=>upgrade()).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
