import { createClient } from '@supabase/supabase-js';

/*
  Corrección puntual del indicador de Seguridad del Dashboard.

  IMPORTANTE:
  Este módulo NO observa document.body ni ejecuta intervalos permanentes.
  El Dashboard se renderiza desde main.js; mantener un MutationObserver global
  aquí provocaba que las propias modificaciones de este módulo generaran nuevas
  mutaciones y podían congelar el navegador.
*/

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let userId = null;
let rowsCache = null;

function normalizeType(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isAccidentOrIncident(type) {
  const t = normalizeType(type);
  if (t.startsWith('casi accidente')) return false;
  return t === 'accidente' || t.startsWith('accidente ') ||
    t === 'incidente' || t.startsWith('incidente ');
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  return Math.max(0, Math.floor((to - from) / 86400000));
}

async function getUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

async function loadRows(currentUserId) {
  if (rowsCache && userId === currentUserId) return rowsCache;

  const { data, error } = await supabase
    .from('ssoma_incidents')
    .select('fecha,tipo,estado')
    .eq('user_id', currentUserId)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('QUIMFLUX Dashboard SSOMA:', error);
    rowsCache = [];
  } else {
    rowsCache = data || [];
  }

  userId = currentUserId;
  return rowsCache;
}

function findDashboard() {
  return [...document.querySelectorAll('main')].find(main => {
    const h1 = main.querySelector('h1')?.textContent?.trim() || '';
    return h1 === 'Administración de Planta' ||
      !![...main.querySelectorAll('h2')].find(h =>
        (h.textContent || '').toLowerCase().includes('seguridad: días sin accidente/incidente')
      );
  });
}

function findCard(panel, label) {
  return [...panel.querySelectorAll('.card')].find(card =>
    card.querySelector('small')?.textContent?.trim().toLowerCase() === label.toLowerCase()
  );
}

async function patchDashboard() {
  const main = findDashboard();
  if (!main) return;

  const security = [...main.querySelectorAll('.panel')].find(panel =>
    (panel.querySelector('h2')?.textContent || '')
      .toLowerCase()
      .includes('seguridad: días sin accidente/incidente')
  );
  if (!security) return;

  const user = await getUser();
  if (!user?.id) return;

  const rows = await loadRows(user.id);
  const relevant = rows.filter(row => isAccidentOrIncident(row.tipo));
  const dates = relevant
    .map(row => String(row.fecha || '').slice(0, 10))
    .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();

  const lastDate = dates.at(-1) || null;
  const days = lastDate ? daysBetween(lastDate, todayLocal()) : null;

  const daysCard = findCard(security, 'Días sin accidente/incidente');
  const lastCard = findCard(security, 'Último accidente/incidente');
  const totalCard = findCard(security, 'Total eventos SSOMA');

  if (daysCard) {
    const value = days === null ? 'SIN DATOS' : String(days);
    const strong = daysCard.querySelector('strong');
    const badge = daysCard.querySelector('.badge');

    if (strong && strong.textContent !== value) strong.textContent = value;
    if (badge) {
      const label = days === null ? 'SIN REGISTROS' : days === 0 ? 'EVENTO HOY' : 'EN CONTROL';
      if (badge.textContent.trim() !== label) badge.textContent = label;
      badge.className = `badge ${days === 0 ? 'critical' : 'ok'}`;
    }
  }

  if (lastCard) {
    const strong = lastCard.querySelector('strong');
    const value = lastDate || '—';
    if (strong && strong.textContent !== value) strong.textContent = value;
  }

  if (totalCard) {
    const strong = totalCard.querySelector('strong');
    const value = String(rows.length);
    if (strong && strong.textContent !== value) strong.textContent = value;
  }
}

/*
  Una sola ejecución al cargar el módulo.
  main.js ya es el responsable del renderizado y navegación del Dashboard.
*/
void patchDashboard();
