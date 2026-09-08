import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY='sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

/* Compatibilidad permanente del shell heredado. main.js sigue renderizando
   el menú histórico; aquí sólo normalizamos sus etiquetas y añadimos Entradas. */
const app=document.getElementById('app');
if(app){
  const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(descriptor?.set && !app.__qfShellPatched){
    Object.defineProperty(app,'innerHTML',{
      configurable:true,
      enumerable:descriptor.enumerable,
      get(){return descriptor.get.call(this);},
      set(value){
        let html=String(value);
        if(html.includes('<nav>') && html.includes('id="content"')){
          html=html.replace(/(<button\s+data-tab="despachos"[^>]*>)\s*Despachos\s*(<\/button>)/,'$1Salidas$2');
          html=html.replace(/Administrador de Planta V6/g,'Administrador de Planta');
          if(!html.includes('data-tab="entradas"')) html=html.replace(/<button\s+data-tab="personal"/,'<button data-tab="entradas">Entradas</button>\n        <button data-tab="personal"');
          html=html.replace(/\s*<button\s+data-tab="clientes"[^>]*>\s*Clientes\s*<\/button>/g,'');
        }
        descriptor.set.call(this,html);
      }
    });
    Object.defineProperty(app,'__qfShellPatched',{value:true,configurable:false});
  }
}

/* Evita el render duplicado durante INITIAL_SESSION/SIGNED_IN mientras init()
   termina de cargar datos. SIGNED_OUT sí continúa hacia main.js. */
const authPrototype=Object.getPrototypeOf(supabase.auth);
if(authPrototype && !authPrototype.__qfStableAuthPatch){
  const originalOnAuthStateChange=authPrototype.onAuthStateChange;
  authPrototype.onAuthStateChange=function(callback){
    const guardedCallback=(event,session)=>{if(event==='INITIAL_SESSION'||event==='SIGNED_IN')return;return callback(event,session);};
    return originalOnAuthStateChange.call(this,guardedCallback);
  };
  Object.defineProperty(authPrototype,'__qfStableAuthPatch',{value:true,configurable:false});
}

let externalNavigationBusy=false;
document.addEventListener('click',event=>{
  const button=event.target.closest?.('nav button[data-tab]');
  if(!button)return;
  const target=button.dataset.tab;
  if(target!=='despachos' && target!=='entradas')return;
  event.preventDefault();event.stopImmediatePropagation();
  if(externalNavigationBusy)return;
  document.querySelectorAll('nav button[data-tab]').forEach(b=>b.classList.remove('active'));
  button.classList.add('active');
  if(target==='despachos')button.textContent='Salidas';
  externalNavigationBusy=true;
  Promise.resolve(target==='despachos'?window.qfOpenSalidas?.():window.qfOpenRecepciones?.())
    .catch(error=>console.error('QUIMFLUX navegación:',error))
    .finally(()=>{externalNavigationBusy=false;});
},{capture:true});
