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

// Code du groupe : vérifié par la base avant tout chargement.
// Tant que la protection n'est pas installée dans la base (fonction absente), on démarre comme avant.
async function codeGroupeValide(c) {
  try {
    const r = await fetch(SB + '/rpc/ft_groupe_verifier', {method: 'POST', headers: H, body: JSON.stringify({p_code: c})});
    if (r.status === 404) return true;
    if (!r.ok) return null;
    return (await r.json()) === true;
  } catch (e) { return null; }
}
function demanderCodeGroupe() {
  return new Promise(res => {
    const dlg = $('groupeDlg'), inp = $('groupeInput');
    $('groupeErr').textContent = ''; inp.value = '';
    dlg.addEventListener('cancel', e => e.preventDefault());
    dlg.showModal(); inp.focus();
    $('groupeForm').onsubmit = async e => {
      e.preventDefault();
      const c = inp.value.trim();
      if (!c) { $('groupeErr').textContent = 'Entre le code du groupe.'; return; }
      const ok = await codeGroupeValide(c);
      if (ok === null) { $('groupeErr').textContent = 'Pas de réseau : réessaie dans un instant.'; return; }
      if (!ok) { $('groupeErr').textContent = 'Code incorrect. Demande-le dans le groupe WhatsApp.'; return; }
      garderCodeGroupe(c); dlg.close(); res();
    };
  });
}
async function demarrer() {
  const c = codeGroupe();
  const ok = c ? await codeGroupeValide(c) : await codeGroupeValide('');
  // ok === null : pas de réseau, on démarre avec le code gardé (données en cache).
  if (ok === false) { garderCodeGroupe(''); await demanderCodeGroupe(); }
  load();
  loadLieux().then(() => { render(); chargerMeteo(); });
  loadDefi();
  majHorsLigne();
  viderFileAttente();
}
demarrer();
setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]')) load(); }, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
