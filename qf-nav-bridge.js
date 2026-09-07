import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY='sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

/*
  ESTABILIDAD DE ARRANQUE
  main.js mantiene un callback onAuthStateChange que vuelve a renderizar
  mientras init() todavía está cargando datos. Eso produce el parpadeo:
  shell vacío -> shell con datos -> shell final.

  La sesión inicial y el SIGNED_IN ya son gestionados explícitamente por
  main.js mediante getSession()/load() y el formulario de acceso. Evitamos
  esos callbacks duplicados para que exista un único ciclo de render.

  SIGNED_OUT se conserva para que una pérdida/cierre de sesión siga
  llevando la aplicación a la pantalla de acceso.
*/
const authPrototype=Object.getPrototypeOf(supabase.auth);
if(authPrototype && !authPrototype.__qfStableAuthPatch){
  const originalOnAuthStateChange=authPrototype.onAuthStateChange;
  authPrototype.onAuthStateChange=function(callback){
    const guardedCallback=(event,session)=>{
      if(event==='INITIAL_SESSION' || event==='SIGNED_IN') return;
      return callback(event,session);
    };
    return originalOnAuthStateChange.call(this,guardedCallback);
  };
  Object.defineProperty(authPrototype,'__qfStableAuthPatch',{value:true,configurable:false});
}

let enhancing=false;
let externalNavigationBusy=false;

function enhanceNav(){
  if(enhancing)return;
  enhancing=true;
  try{
    const nav=document.querySelector('nav');
    if(!nav)return;

    const despachos=nav.querySelector('button[data-tab="despachos"]');
    if(despachos)despachos.textContent='Salidas';

    let entrada=nav.querySelector('button[data-tab="entradas"]');
    if(!entrada){
      entrada=document.createElement('button');
      entrada.type='button';
      entrada.dataset.tab='entradas';
      entrada.textContent='Entradas';
      entrada.className='';
      const inventario=nav.querySelector('button[data-tab="inventario"]');
      if(inventario)inventario.after(entrada);else nav.appendChild(entrada);
    }
  }finally{
    enhancing=false;
  }
}

/*
  Entradas y Salidas no deben pasar por el render antiguo de main.js.
  La captura ocurre antes del onclick de los botones creados por main.js.
*/
document.addEventListener('click',event=>{
  const button=event.target.closest?.('nav button[data-tab]');
  if(!button)return;

  const target=button.dataset.tab;
  if(target!=='despachos' && target!=='entradas')return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if(externalNavigationBusy)return;

  document.querySelectorAll('nav button[data-tab]').forEach(b=>b.classList.remove('active'));
  button.classList.add('active');
  externalNavigationBusy=true;

  Promise.resolve(
    target==='despachos'
      ? window.qfOpenSalidas?.()
      : window.qfOpenRecepciones?.()
  ).catch(error=>console.error('QUIMFLUX navegación:',error))
   .finally(()=>{externalNavigationBusy=false;});
},{capture:true});

/*
  La nomenclatura se aplica una sola vez después de que main.js haya
  construido el menú. No usamos MutationObserver ni intervalos.
*/
window.addEventListener('load',()=>requestAnimationFrame(enhanceNav),{once:true});
