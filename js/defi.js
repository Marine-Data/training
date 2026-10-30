// Défi de groupe : un objectif de séances par mois, à atteindre tous ensemble.
// Compte toutes les séances enregistrées avec « ✓ Je l'ai faite », sans classement individuel.

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const moisCourant = () => todayStr().slice(0, 8) + '01';
let defi = null, defiStats = null;

async function loadDefi() {
  const m = moisCourant();
  try {
    const [d] = await api('/ft_defis?mois=eq.' + m);
    defi = d || null;
    defiStats = await api('/rpc/ft_defi_stats', {method: 'POST', body: JSON.stringify({p_mois: m})});
  } catch (e) { return; }
  renderDefi();
}
function renderDefi() {
  const nomMois = MOIS[parseInt(moisCourant().slice(5, 7), 10) - 1];
  if (!defi) {
    $('defi').innerHTML = `<div class="defi vide"><b>Défi de ${nomMois}</b><span>Fixez-vous un nombre de séances à faire tous ensemble ce mois-ci.</span>
      <button type="button" class="btn small" data-defi="set">🎯 Lancer le défi</button></div>`;
    return;
  }
  const total = defiStats ? defiStats.total : 0, pers = defiStats ? defiStats.personnes : 0;
  const pct = Math.min(100, Math.round(total / defi.objectif * 100));
  const fin = total >= defi.objectif;
  $('defi').innerHTML = `<div class="defi${fin ? ' gagne' : ''}">
    <div class="dhead"><b>🎯 Défi de ${nomMois}</b><button type="button" class="lien" data-defi="set">Modifier</button></div>
    <div class="dnum"><span class="big">${total}</span> / ${defi.objectif} séances</div>
    <div class="jauge" role="progressbar" aria-valuemin="0" aria-valuemax="${defi.objectif}" aria-valuenow="${total}"><i style="width:${pct}%"></i></div>
    <small>${fin ? 'Objectif atteint, bravo à tout le groupe ! 🎉' : (pers ? pers + ' personne' + (pers > 1 ? 's ont' : ' a') + ' participé' : 'Chaque « ✓ Je l’ai faite » compte')} · encore ${Math.max(0, defi.objectif - total)} pour finir</small>
  </div>`;
}
$('defi').addEventListener('click', async e => {
  if (!e.target.closest('[data-defi]')) return;
  if (!(await ensureName())) return;
  $('defiN').value = defi ? defi.objectif : 30; $('defiErr').textContent = '';
  $('defiDlg').showModal(); $('defiN').focus();
});
$('defiCancel').onclick = () => $('defiDlg').close();
$('defiForm').onsubmit = async e => {
  e.preventDefault();
  const n = parseInt($('defiN').value, 10);
  if (!(n >= 1 && n <= 10000)) { $('defiErr').textContent = 'Choisis un nombre entre 1 et 10 000.'; return; }
  try {
    await api('/ft_defis', {method: 'POST', body: JSON.stringify({mois: moisCourant(), objectif: n, auteur: me}),
      headers: {Prefer: 'resolution=merge-duplicates,return=minimal'}});
    $('defiDlg').close(); toast('Défi enregistré 🎯'); loadDefi();
  } catch (err) { $('defiErr').textContent = 'Impossible d’enregistrer pour le moment. Réessaie.'; }
};
