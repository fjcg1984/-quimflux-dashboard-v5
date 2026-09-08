/* QUIMFLUX: los registros existentes se abren en modo VER.
   La edición se habilita únicamente al pulsar el botón Editar dentro del registro. */
(function(){
  const STYLE_ID='qf-view-edit-style';
  function style(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent='.qf-view-edit-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(120,150,140,.25)}.qf-view-edit-btn{min-width:110px}.qf-view-edit-note{font-size:12px;opacity:.72;margin-right:auto;align-self:center}';
    document.head.appendChild(s);
  }
  function isExisting(form){
    if(form.dataset.recordId) return true;
    const title=form.closest('.qf-rec-modal')?.querySelector('h2')?.textContent?.trim()||'';
    return /^Editar\s+(salida|entrada)/i.test(title);
  }
  function setDisabled(form,disabled){
    form.querySelectorAll('input,select,textarea').forEach(el=>{el.disabled=disabled;});
    form.querySelectorAll('[data-add-line],.qf-mf-new').forEach(el=>{el.disabled=disabled;el.style.display=disabled?'none':'';});
    form.querySelectorAll('[data-lines] button').forEach(el=>{el.disabled=disabled;el.style.display=disabled?'none':'';});
  }
  function activateEdit(form,actions){
    setDisabled(form,false);
    form.querySelectorAll('.qf-mf-new,[data-add-line]').forEach(el=>el.style.display='');
    form.querySelectorAll('[data-lines] button').forEach(el=>el.style.display='');
    actions.querySelector('.qf-view-edit-btn')?.remove();
    actions.querySelector('.qf-view-edit-note')?.remove();
    actions.dataset.editing='1';
    form.closest('.qf-rec-modal')?.querySelector('h2')?.replaceChildren(document.createTextNode((form.closest('.qf-rec-modal')?.querySelector('h2')?.textContent||'').replace(/^Ver\s+/i,'Editar ')));
  }
  function setup(form){
    if(form.dataset.qfViewSetup==='1' || !isExisting(form)) return;
    form.dataset.qfViewSetup='1';
    style();
    const modal=form.closest('.qf-rec-modal');
    const title=modal?.querySelector('h2');
    if(title && /^Editar\s+/i.test(title.textContent||'')) title.textContent=(title.textContent||'').replace(/^Editar\s+/i,'Ver ');
    setDisabled(form,true);
    const actions=document.createElement('div');
    actions.className='qf-view-edit-actions';
    const note=document.createElement('span');
    note.className='qf-view-edit-note';
    note.textContent='Modo consulta';
    const edit=document.createElement('button');
    edit.type='button';
    edit.className='primary qf-view-edit-btn';
    edit.textContent='Editar';
    edit.onclick=()=>activateEdit(form,actions);
    actions.append(note,edit);
    form.appendChild(actions);
    const save=form.querySelector('button[type="submit"],button.qf-mf-save');
    if(save) save.style.display='none';
  }
  const observer=new MutationObserver(()=>document.querySelectorAll('.qf-mf-form').forEach(setup));
  function start(){style();document.querySelectorAll('.qf-mf-form').forEach(setup);observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
