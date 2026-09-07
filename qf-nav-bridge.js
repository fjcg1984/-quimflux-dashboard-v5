import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY='sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

function enhanceNav(){
  const nav=document.querySelector('nav');
  if(!nav)return;
  const buttons=[...nav.querySelectorAll('button[data-tab]')];
  buttons.forEach(button=>{if(button.dataset.tab==='despachos')button.textContent='Salidas';});
  let entrada=nav.querySelector('[data-qf-entradas-nav="1"]');
  if(!entrada){
    const inventario=buttons.find(b=>b.dataset.tab==='inventario');
    entrada=document.createElement('button');
    entrada.type='button';
    entrada.textContent='Entradas';
    entrada.dataset.qfEntradasNav='1';
    entrada.className='qf-nav-btn';
    entrada.addEventListener('click',event=>{
      event.preventDefault();
      buttons.forEach(b=>b.classList.remove('active'));
      entrada.classList.add('active');
      window.qfOpenRecepciones?.();
    });
    if(inventario)inventario.after(entrada);else nav.appendChild(entrada);
  }
}

document.addEventListener('click',event=>{
  const button=event.target.closest?.('nav button[data-tab]');
  if(button)setTimeout(enhanceNav,0);
});

supabase.auth.onAuthStateChange(()=>setTimeout(enhanceNav,50));
window.addEventListener('load',()=>setTimeout(enhanceNav,100));
