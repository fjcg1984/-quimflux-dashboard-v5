import { createClient } from '@supabase/supabase-js';

/*
  Corrige exclusivamente el indicador de Seguridad del Dashboard.
  El módulo SSOMA ya calcula correctamente el dato; aquí se replica la
  misma regla sobre la fuente oficial para que el Dashboard no muestre
  "SIN DATOS".
*/

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let userId = null;
let rowsCache = null;
let busy = false;

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
      !![...main.querySelectorAll('h2')].find(h => (h.textContent || '').toLowerCase().includes('seguridad: días sin accidente/incidente'));
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
    (panel.querySelector('h2')?.textContent || '').toLowerCase().includes('seguridad: días sin accidente/incidente')
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
    if (strong) strong.textContent = value;
    if (badge) {
      badge.textContent = days === null ? 'SIN REGISTROS' : days === 0 ? 'EVENTO HOY' : 'EN CONTROL';
      badge.className = `badge ${days === 0 ? 'critical' : 'ok'}`;
    }
  }

  if (lastCard) {
    const strong = lastCard.querySelector('strong');
    if (strong) strong.textContent = lastDate || '—';
  }

  if (totalCard) {
    const strong = totalCard.querySelector('strong');
    if (strong) strong.textContent = String(rows.length);
  }
}

async function run() {
  if (busy) return;
  busy = true;
  try { await patchDashboard(); } finally { busy = false; }
}

new MutationObserver(() => { void run(); }).observe(document.body, { childList: true, subtree: true });
setInterval(() => { void run(); }, 1500);
void run();
