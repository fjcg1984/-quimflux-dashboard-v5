import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY='sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

let enhancing=false;

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
  IMPORTANTE: Entradas y Salidas son módulos externos a main.js.
  Capturamos esos clics ANTES de que main.js ejecute su render antiguo.
  Así evitamos la carrera que provocaba que la pantalla cambiara dos veces.
*/
document.addEventListener('click',event=>{
  const button=event.target.closest?.('nav button[data-tab]');
  if(!button)return;

  const target=button.dataset.tab;
  if(target!=='despachos' && target!=='entradas')return;

  event.preventDefault();
  event.stopImmediatePropagation();

  document.querySelectorAll('nav button[data-tab]').forEach(b=>b.classList.remove('active'));
  button.classList.add('active');

  if(target==='despachos'){
    window.qfOpenSalidas?.();
  }else{
    window.qfOpenRecepciones?.();
  }
},{capture:true});

function scheduleEnhance(){
  requestAnimationFrame(enhanceNav);
}

supabase.auth.onAuthStateChange(scheduleEnhance);
window.addEventListener('load',scheduleEnhance,{once:true});
