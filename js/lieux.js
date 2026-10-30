// Lieux enregistrés : stades, parcs, piscines du groupe, avec adresse et coordonnées.
// On les choisit d'un geste en proposant une activité ; ils donnent l'itinéraire et la météo du vrai lieu.

let lieux = [];
let lieuChoisi = null;   // lieu sélectionné dans le formulaire ouvert

async function loadLieux() {
  try { lieux = await api('/ft_lieux?select=*&order=nom.asc'); } catch (e) { return; }
  renderLieuxSugg();
  // Lieux sans coordonnées : on les cherche une fois et on les enregistre pour tout le monde.
  for (const l of lieux.filter(l => l.lat == null && l.adresse)) {
    const g = await geocoder(l.adresse);
    if (g) { try { await api('/ft_lieux?id=eq.' + l.id, {method: 'PATCH', body: JSON.stringify({lat: g.lat, lon: g.lon}), headers: {Prefer: 'return=minimal'}}); l.lat = g.lat; l.lon = g.lon; } catch (e) {} }
  }
}
const lieuDe = a => a.lieu_id ? lieux.find(l => l.id === a.lieu_id) : null;

// Adresse → coordonnées : Géoplateforme (adresses françaises), puis l'ancienne API Adresse, puis les noms de villes.
async function geocoder(q) {
  const essais = [
    ['https://data.geopf.fr/geocodage/search?limit=1&q=', j => j.features && j.features[0] && {lon: j.features[0].geometry.coordinates[0], lat: j.features[0].geometry.coordinates[1], label: j.features[0].properties.label}],
    ['https://api-adresse.data.gouv.fr/search/?limit=1&q=', j => j.features && j.features[0] && {lon: j.features[0].geometry.coordinates[0], lat: j.features[0].geometry.coordinates[1], label: j.features[0].properties.label}],
    ['https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=', j => j.results && j.results[0] && {lat: j.results[0].latitude, lon: j.results[0].longitude, label: [j.results[0].name, j.results[0].admin1].filter(Boolean).join(', ')}]
  ];
  for (const [u, lire] of essais) {
    try { const r = await fetch(u + encodeURIComponent(q)); if (r.ok) { const g = lire(await r.json()); if (g) return g; } } catch (e) {}
  }
  return null;
}

/* Choix rapide dans les formulaires (proposer et modifier) */
function renderLieuxSugg() {
  [['lieuxSugg', 'fLieu'], ['eLieuxSugg', 'eLieu']].forEach(([box, champ]) => {
    const el = $(box); if (!el) return;
    el.innerHTML = lieux.map(l => `<button type="button" data-lieu="${l.id}" data-champ="${champ}" aria-pressed="${lieuChoisi === l.id}">📍 ${esc(l.nom)}</button>`).join('');
  });
  majBoutonLieu('fLieu', 'lieuSave'); majBoutonLieu('eLieu', 'eLieuSave');
}
function majBoutonLieu(champ, bouton) {
  const v = $(champ).value.trim(), b = $(bouton);
  b.hidden = !v || !!lieuChoisi || lieux.some(l => norm(l.nom) === norm(v));
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-lieu]'); if (!b) return;
  const l = lieux.find(x => x.id === b.dataset.lieu); if (!l) return;
  lieuChoisi = l.id; $(b.dataset.champ).value = l.nom; renderLieuxSugg();
});
['fLieu', 'eLieu'].forEach(id => $(id).addEventListener('input', e => {
  const l = lieux.find(x => norm(x.nom) === norm(e.target.value));
  lieuChoisi = l ? l.id : null; renderLieuxSugg();
}));
// Enregistrer le lieu tapé : on cherche son adresse, puis on l'ajoute à la liste du groupe.
async function enregistrerLieu(champ) {
  if (!(await ensureName())) return;
  const texte = $(champ).value.trim(); if (!texte) return;
  toast('Recherche de l’adresse…');
  const g = await geocoder(texte);
  if (!g) { toast('Adresse introuvable : ajoute la rue et la ville.'); return; }
  const nom = texte.split(',')[0].trim().slice(0, 80);
  try {
    const [l] = await api('/ft_lieux', {method: 'POST', body: JSON.stringify({nom, adresse: g.label.slice(0, 200), lat: g.lat, lon: g.lon, auteur: me}), headers: {Prefer: 'return=representation'}});
    lieux.push(l); lieux.sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
    lieuChoisi = l.id; $(champ).value = l.nom; renderLieuxSugg();
    toast('Lieu enregistré : ' + g.label);
  } catch (e) { toast('Impossible d’enregistrer le lieu. Réessaie.'); }
}
$('lieuSave').onclick = () => enregistrerLieu('fLieu');
$('eLieuSave').onclick = () => enregistrerLieu('eLieu');

/* Gérer les lieux */
function renderLieuxDlg() {
  $('lieuxList').innerHTML = lieux.length ? lieux.map(l => `<li><span><b>${esc(l.nom)}</b><small>${esc(l.adresse || 'Adresse inconnue')}</small></span>
      ${me && norm(me) === norm(l.auteur) ? `<button type="button" class="xdel" data-lsup="${l.id}" aria-label="Supprimer ce lieu">✕</button>` : ''}</li>`).join('')
    : '<li><span>Aucun lieu pour l’instant. Tape une adresse dans « Où ? » puis « 📍 Enregistrer ce lieu ».</span></li>';
}
document.addEventListener('click', e => { if (e.target.closest('.gererlieux')) { renderLieuxDlg(); $('lieuxDlg').showModal(); } });
$('lieuxClose').onclick = () => $('lieuxDlg').close();
$('lieuxList').addEventListener('click', async e => {
  const b = e.target.closest('[data-lsup]'); if (!b) return;
  if (!(await ensureCode())) return;
  if (await supprimerProtege('ft_supprimer_lieu', {p_id: b.dataset.lsup})) { toast('Lieu supprimé'); await loadLieux(); renderLieuxDlg(); load(); }
});

/* Sur la carte d'activité : nom, adresse, carte et itinéraire */
function lieuInfoHtml(a) {
  const l = lieuDe(a); if (!l) return '';
  const q = l.lat != null ? l.lat + ',' + l.lon : encodeURIComponent(l.adresse || l.nom);
  return `<div class="lieuinfo">${l.adresse ? `<small>${esc(l.adresse)}</small>` : ''}
    <a href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">🧭 Itinéraire</a></div>`;
}
