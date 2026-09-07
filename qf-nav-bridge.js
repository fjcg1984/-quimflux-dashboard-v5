import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY='sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

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
  Esto elimina la doble renderización y evita que la interfaz cambie dos veces.
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

function scheduleEnhance(){
  requestAnimationFrame(enhanceNav);
}

supabase.auth.onAuthStateChange(scheduleEnhance);
window.addEventListener('load',scheduleEnhance,{once:true});
