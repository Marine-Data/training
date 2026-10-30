// Petits outils partagés : sélection, échappement HTML, dates, messages.
let activities = [];
let me = '';
try { me = localStorage.getItem('ft_prenom') || ''; } catch (e) {}

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => s.trim().toLowerCase();

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dayLabel(s) {
  const d = new Date(s + 'T12:00:00');
  return new Intl.DateTimeFormat('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}).format(d);
}
const hm = t => t ? t.slice(0, 5).replace(':', 'h') : '';
function timeLabel(a) {
  if (!a.heure) return 'Horaire à confirmer';
  return hm(a.heure) + (a.duree_fin ? ' → ' + hm(a.duree_fin) : '');
}

function addDays(s, n) {
  const x = new Date(s + 'T12:00:00'); x.setDate(x.getDate() + n);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

function toast(msg, action, ms) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  t.style.pointerEvents = action ? 'auto' : 'none';
  if (action) {
    const b = document.createElement('button'); b.className = 'toast-act'; b.textContent = action.label;
    b.onclick = () => { t.classList.remove('show'); t.style.pointerEvents = 'none'; action.fn(); };
    t.append(' ', b);
  }
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.classList.remove('show'); t.style.pointerEvents = 'none'; }, ms || 2200);
}

