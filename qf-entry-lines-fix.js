/* Normaliza las líneas de materiales del formulario compartido para que el
   guardador pueda leerlas aunque el formulario use nombres específicos de
   Entrada (quantity_received, weight_kg, etc.). No cambia los valores ni la
   estructura visible del formulario. */
function normalizeLine(root){
  root.querySelectorAll('.qf-mf-form [data-lines] > *').forEach(row=>{
    const product=row.querySelector('select[name="product_id"],select.lp,.qf-line-product');
    if(product) product.classList.add('lp');

    const inputs=[...row.querySelectorAll('input')];
    const qtyReceived=row.querySelector('input[name="quantity_received"],input[name="quantity"]') || inputs.find(x=>/recibida|cantidad/i.test(x.closest('label')?.textContent||''));
    const weight=row.querySelector('input[name="weight_kg"],input[name="weight"]') || inputs.find(x=>/peso/i.test(x.closest('label')?.textContent||''));
    const lot=row.querySelector('input[name="lot"]') || inputs.find(x=>/lote/i.test(x.closest('label')?.textContent||''));
    if(qtyReceived) qtyReceived.classList.add('lq');
    if(weight) weight.classList.add('lw');
    if(lot) lot.classList.add('ll');
  });
}

function start(){
  normalizeLine(document);
  const obs=new MutationObserver(()=>normalizeLine(document));
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>obs.disconnect(),120000);
}
if(document.body) start();
else document.addEventListener('DOMContentLoaded',start,{once:true});
