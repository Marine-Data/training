// Démarrage : onglets, premier chargement et rafraîchissement automatique.
/* Onglets Planning / Séances */
function setView(v) {
  const seances = v === 'seances';
  $('viewPlanning').hidden = seances; $('viewSeances').hidden = !seances;
  $('tabPlanning').setAttribute('aria-selected', String(!seances));
  $('tabSeances').setAttribute('aria-selected', String(seances));
  try { history.replaceState(null, '', seances ? '#seances' : location.pathname + location.search); } catch (e) {}
}
document.querySelector('.mtabs').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
if (location.hash === '#seances') setView('seances');

load();
setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]')) load(); }, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
