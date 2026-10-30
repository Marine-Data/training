// Accès à la base : toutes les requêtes passent par api().
// Hors ligne, les lectures viennent du cache (voir sw.js) et certains envois attendent le retour du réseau.

// Envois qui peuvent attendre : s'inscrire, voter, enregistrer une séance faite.
const EN_ATTENTE_OK = ['/ft_inscriptions', '/ft_votes', '/ft_realisations'];
function fileAttente() { try { return JSON.parse(localStorage.getItem('ft_file') || '[]'); } catch (e) { return []; } }
function setFileAttente(f) { try { localStorage.setItem('ft_file', JSON.stringify(f)); } catch (e) {} }

async function api(path, opts = {}) {
  const methode = (opts.method || 'GET').toUpperCase();
  const differable = methode === 'POST' && EN_ATTENTE_OK.some(p => path.startsWith(p));
  if (differable && !navigator.onLine) return mettreEnAttente(path, opts);
  let r;
  try { r = await fetch(SB + path, {...opts, headers: {...H, ...(opts.headers || {})}}); }
  catch (e) { if (differable) return mettreEnAttente(path, opts); throw e; }
  if (!r.ok) { const t = await r.text(); const e = new Error(t || r.status); e.status = r.status; throw e; }
  return r.status === 204 || r.status === 201 && !String(r.headers.get('content-type')).includes('json') ? null : r.json().catch(() => null);
}
function mettreEnAttente(path, opts) {
  setFileAttente([...fileAttente(), {path, method: opts.method, body: opts.body, headers: opts.headers || {}}]);
  setTimeout(() => toast('Hors ligne : ce sera envoyé au retour du réseau 📶', null, 3500), 50);
  return null;
}
// Au retour du réseau : on envoie la file dans l'ordre, puis on recharge.
async function viderFileAttente() {
  let f = fileAttente(); if (!f.length || !navigator.onLine) return;
  while (f.length) {
    const x = f[0];
    try {
      const r = await fetch(SB + x.path, {method: x.method, body: x.body, headers: {...H, ...x.headers}});
      if (!r.ok && r.status !== 409) break;   // 409 : déjà fait (doublon), on passe
    } catch (e) { break; }
    f = f.slice(1); setFileAttente(f);
  }
  if (!f.length) { toast('Envoyé ✅'); if (typeof load === 'function') load(); if (typeof seLoaded !== 'undefined' && seLoaded) loadSeances(); }
}
window.addEventListener('online', () => { majHorsLigne(); viderFileAttente(); });
window.addEventListener('offline', majHorsLigne);
function majHorsLigne() { const b = document.getElementById('horsligne'); if (b) b.hidden = navigator.onLine; }
