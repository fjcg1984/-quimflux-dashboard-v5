import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function enhanceNav() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const buttons = [...nav.querySelectorAll('button[data-tab]')];

  for (const button of buttons) {
    if (button.dataset.tab === 'despachos') {
      button.textContent = 'Salidas';
    }
  }

  if (nav.querySelector('[data-qf-entradas-nav="1"]')) return;

  const inventario = buttons.find(b => b.dataset.tab === 'inventario');
  const entrada = document.createElement('button');
  entrada.type = 'button';
  entrada.textContent = 'Entradas';
  entrada.dataset.qfEntradasNav = '1';
  entrada.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    window.qfOpenRecepciones?.();
  });

  if (inventario) inventario.after(entrada);
  else nav.appendChild(entrada);
}

function scheduleEnhance() {
  requestAnimationFrame(() => {
    enhanceNav();
  });
}

document.addEventListener('click', event => {
  const button = event.target.closest?.('nav button[data-tab]');
  if (!button) return;
  scheduleEnhance();
});

supabase.auth.onAuthStateChange(() => {
  setTimeout(enhanceNav, 50);
});

window.addEventListener('load', () => {
  setTimeout(enhanceNav, 100);
});
