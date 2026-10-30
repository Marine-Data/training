// Séances du groupe : chacun peut créer, modifier, dupliquer, partager ou supprimer une séance.
// Chaque sport a ses blocs, ses unités et ses suggestions d'exercices.

// Pour chaque sport : ses blocs, et pour chaque bloc l'unité proposée et des suggestions d'exercices.
// Un bloc renommé ou ajouté reprend les suggestions par mot-clé (échauffement, étirements…), sinon celles du sport.
const ECHAUFF_GENERIQUE = {dose: '5 min', sugg: ['Corde à sauter', 'Montées de genoux', 'Rotations d’épaules', 'Mobilité des poignets', 'Cercles de hanches', 'Squats lents']};
const ETIR_GENERIQUE = {dose: '30 s', sugg: ['Pectoraux au mur', 'Dorsaux', 'Ischios', 'Psoas en fente', 'Épaules', 'Avant-bras et poignets']};
const SPORTS = {
  'Tricking': {emo: '🤸', tags: ['Débutant', 'Flips', 'Rotations', 'Souplesse', 'Enchaînements'], blocs: {
    'Échauffement':  {dose: '3 par côté', sugg: ['Corde à sauter', 'Balancés de jambe', 'Kicks', 'Roue', 'Roue à une main', 'Rondade']},
    'Technique':     {dose: '5 essais', sugg: ['Papillon', 'Macaco', 'Flip arrière', 'Salto avant', 'Roue sans les mains', 'Poirier']},
    'Enchaînements': {dose: '5', sugg: ['Rondade + rebond', 'Rondade + flip', 'Élan + papillon', 'Macaco + macaco']},
    'Étirements':    {dose: '45 s', sugg: ['Grand écart antéro-postérieur', 'Grand écart facial', 'Pont', 'Chameau', 'Fente basse', 'Demi-écart']}}},
  'Natation': {emo: '🏊', tags: ['Débutant', 'Technique', 'Endurance', 'Vitesse', 'Avec matériel'], blocs: {
    'Échauffement':    {dose: '200 m', sugg: ['Crawl souple', 'Dos', 'Brasse', 'Éducatifs']},
    'Corps de séance': {dose: '4 × 100 m', sugg: ['Crawl', 'Jambes avec planche', 'Pull-buoy', 'Sprints 25 m', 'Pyramide', 'Brasse']},
    'Retour au calme': {dose: '100 m', sugg: ['Nage libre souple', 'Dos souple']}}},
  'Running': {emo: '🏃', tags: ['Fractionné court', 'Fractionné moyen', 'Fractionné long', 'Pyramide', 'Mixte', 'Fartlek', 'Test', 'En équipe', 'Endurance', 'Reprise', 'Avant course', 'Allure 10 km', 'Chaleur'], blocs: {
    'Échauffement':    {dose: '10 min', sugg: ['Footing lent', 'Gammes', 'Accélérations progressives']},
    'Corps de séance': {dose: '6 × 400 m', sugg: ['Fractionné 400 m', '30/30', 'Côtes', 'Allure tempo', 'Sortie longue']},
    'Retour au calme': {dose: '5 min', sugg: ['Footing lent', 'Marche', 'Étirements mollets']}}},
  'Renfo': {emo: '💪', tags: ['Débutant', 'Haut du corps', 'Bas du corps', 'Gainage', 'Pour le tricking'], blocs: {
    'Échauffement': {dose: '5 min', sugg: ['Rameur', 'Vélo', 'Corde à sauter', 'Mobilité des épaules', 'Squats à vide']},
    'Force':        {dose: '4 × 8', sugg: ['Squats', 'Soulevé de terre', 'Tractions', 'Pompes', 'Fentes', 'Dips', 'Développé militaire']},
    'Gainage':      {dose: '3 × 30 s', sugg: ['Planche', 'Planche latérale', 'Hollow hold', 'Dead bug', 'Superman']},
    'Étirements':   ETIR_GENERIQUE}},
  // Pensé pour un parc de street workout en extérieur : barre fixe, barres parallèles, barre basse, espalier, banc.
  'Street workout': {emo: '🏋️', tags: ['Débutant', 'Tractions', 'Poussée', 'Skills', 'Gainage'], desc: 'Parc de street workout : barre fixe, barres parallèles, barre basse, banc…', blocs: {
    'Échauffement': {dose: '10 rép.', sugg: ['Corde à sauter|5 min', 'Course à pied|10 min', 'Rotations d’épaules', 'Mobilité des poignets', 'Cercles de hanches', 'Rotations de chevilles', 'Ouverture thoracique', 'Chat-vache', 'Scapula pull-ups à la barre fixe', 'Pompes scapulaires', 'Suspension à la barre fixe|3 × 20 s']},
    'Force':        {dose: '3 × 6', sugg: ['Tractions à la barre fixe', 'Tractions négatives|3 × 4', 'Australian pull-ups à la barre basse|3 × 8', 'Dips aux barres parallèles', 'Dips sur banc|3 × 10', 'Pompes', 'Pompes inclinées sur barre basse|3 × 10', 'Pompes déclinées pieds sur banc', 'Relevés de genoux suspendu|3 × 8', 'Step-ups sur banc|3 × 10']},
    'Skills':       {dose: '5 × 10 s', sugg: ['Support aux barres parallèles|3 × 20 s', 'L-sit aux barres parallèles', 'Tuck front lever à la barre fixe', 'Skin the cat|3 × 3', 'Handstand contre un mur', 'Muscle-up à la barre fixe|3 × 2']},
    'Étirements':   {dose: '30 s', sugg: ['Dorsaux suspendu à la barre', 'Pectoraux aux barres parallèles', 'Épaules à l’espalier', 'Avant-bras et poignets', 'Mollets sur une marche', 'Pike stretch', 'Pancake']}}},
  'Gym suédoise': {emo: '🧘', tags: ['Doux', 'Intense', 'Sans matériel'], blocs: {
    'Échauffement':  {dose: '1 min', sugg: ['Marche active', 'Montées de genoux', 'Rotations de bras', 'Talons-fesses']},
    'Cardio':        {dose: '2 min', sugg: ['Jumping jacks', 'Burpees', 'Pas chassés', 'Talons-fesses']},
    'Renforcement':  {dose: '1 min', sugg: ['Squats', 'Fentes', 'Pompes', 'Gainage']},
    'Étirements':    ETIR_GENERIQUE}},
  'Yoga': {emo: '🪷', tags: ['Doux', 'Souplesse', 'Récupération'], blocs: {
    'Centrage':   {dose: '1 min', sugg: ['Respiration ventrale', 'Posture de l’enfant', 'Chat-vache']},
    'Postures':   {dose: '5 respirations', sugg: ['Salutation au soleil', 'Chien tête en bas', 'Guerrier II', 'Pigeon', 'Pont']},
    'Relaxation': {dose: '3 min', sugg: ['Torsion allongée', 'Savasana']}}},
  'Autre': {emo: '⚡', blocs: {
    'Échauffement':    ECHAUFF_GENERIQUE,
    'Corps de séance': {dose: '10 min', sugg: []},
    'Retour au calme': ETIR_GENERIQUE}}
};
const sportOf = s => SPORTS[s] || SPORTS['Autre'];
const normT = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
function blocInfo(sport, titre) {
  const blocs = sportOf(sport).blocs, n = normT(titre);
  const exact = Object.keys(blocs).find(k => normT(k) === n);
  if (exact) return blocs[exact];
  const kw = k => Object.keys(blocs).find(x => normT(x).includes(k));
  if (/echauf|centrage|mobilit/.test(n)) return blocs[kw('echauf') || ''] || ECHAUFF_GENERIQUE;
  if (/etire|souplesse|calme|relax|recup/.test(n)) return blocs[kw('etire') || kw('calme') || kw('relax') || ''] || ETIR_GENERIQUE;
  const main = Object.keys(blocs).find(k => !/echauf|centrage|etire|calme|relax/.test(normT(k)));
  return blocs[main] || {dose: '10 min', sugg: []};
}

let seances = [];
let seFilter = 'Tous';
let seTag = '';  // étiquette choisie dans le sport filtré
let seLoaded = false;
const pendingSeDel = new Map();

async function loadSeances() {
  try {
    const rows = await api('/ft_seances?select=*&order=updated_at.desc');
    seances = rows.filter(s => !pendingSeDel.has(s.id));
    seLoaded = true;
    await Promise.all([loadRealisations(), loadProgrammes()]);
    renderSeances();
  } catch (e) {
    $('seList').innerHTML = '<div class="empty">Impossible de charger les séances. Réessaie dans un instant.</div>';
  }
}

/* Liste et filtres par sport */
// Séances illustrées (pages du dossier seances/), rangées dans leur sport.
const ILLUSTREES = {
  'Tricking': [{titre: 'Tricking : flips et rotations', info: '2 séances de 1h15 avec fiches dessinées et tutos', href: 'seances/tricking.html'}],
  'Natation': [{titre: 'Natation 1 500 m', info: '3 séances : celle d’Adrien, sa V2 avec planche, une avec sprints', href: 'seances/natation.html'}],
  'Renfo':    [{titre: 'Renfo en salle', info: '1 h pour les objectifs du tricking : poirier, flips, rotations, écarts', href: 'seances/renfo.html'}]
};

// Accueil : tous les sports en tuiles. Un sport ouvert : ses filtres par type, puis ses séances.
function renderSeances() {
  if (seFilter !== 'Tous' && !SPORTS[seFilter]) seFilter = 'Tous';
  if (seFilter === 'Tous') {
    seTag = '';
    $('seFilters').innerHTML = '';
    $('seList').innerHTML = progressionHtml() + favorisHtml() + `<h3 class="sportsT">Les sports</h3><div class="sportgrid">${Object.keys(SPORTS).filter(k => k !== 'Autre' || seances.some(s => s.sport === 'Autre')).map(k => {
      const n = seances.filter(s => s.sport === k).length + (ILLUSTREES[k] || []).length;
      return `<button type="button" class="stile" data-sport="${esc(k)}"><span class="emo" aria-hidden="true">${SPORTS[k].emo}</span><b>${esc(k)}</b><small>${n ? n + ' séance' + (n > 1 ? 's' : '') : 'À créer'}</small></button>`;
    }).join('')}</div>`;
    return;
  }
  const order = sportOf(seFilter).tags || [];
  let list = seances.filter(s => s.sport === seFilter);
  const tc = {};
  list.forEach(s => (s.tags || []).forEach(g => tc[g] = (tc[g] || 0) + 1));
  const tags = Object.keys(tc).sort((x, y) => ((order.indexOf(x) + 1) || 99) - ((order.indexOf(y) + 1) || 99));
  if (seTag && !tc[seTag]) seTag = '';
  $('seFilters').innerHTML = `<div class="sporthead"><button type="button" class="back" data-sport="Tous">← Tous les sports</button>
      <h3>${sportOf(seFilter).emo} ${esc(seFilter)}</h3></div>` +
    (tags.length ? `<div class="frow tags" aria-label="Type de séance">${['', ...tags].map(g =>
      `<button type="button" class="fchip tag" data-tag="${esc(g)}" aria-pressed="${g === seTag}">${g ? esc(g) : 'Toutes'} <span>${g ? tc[g] : list.length}</span></button>`).join('')}</div>` : '');
  if (seTag) list = list.filter(s => (s.tags || []).includes(seTag));
  // Classement : par type de séance (ordre des étiquettes du sport), puis par nom
  const rank = s => Math.min(99, ...(s.tags || []).map(g => (order.indexOf(g) + 1) || 99));
  list = list.slice().sort((x, y) => rank(x) - rank(y) || x.titre.localeCompare(y.titre, 'fr', {numeric: true}));
  const illus = seTag ? [] : (ILLUSTREES[seFilter] || []);
  $('seList').innerHTML = (seTag ? '' : programmesHtml(seFilter)) + illus.map(x => `<a class="disc illus" href="${x.href}">
      <span class="emo" aria-hidden="true">${sportOf(seFilter).emo}</span>
      <span class="dtxt"><b>${esc(x.titre)}</b><small>${esc(x.info)}</small><span class="tagline"><i>Illustrée</i></span></span>
      <span class="go" aria-hidden="true">→</span></a>`).join('') +
    list.map(s => {
      const meta = [s.duree ? s.duree + ' min' : '', 'par ' + esc(s.auteur)].filter(Boolean).join(' · ');
      const tg = (s.tags || []).length ? `<span class="tagline">${s.tags.map(g => `<i>${esc(g)}</i>`).join('')}</span>` : '';
      return `<button type="button" class="disc se" data-id="${s.id}">
        <span class="emo" aria-hidden="true">${sportOf(s.sport).emo}</span>
        <span class="dtxt"><b>${esc(s.titre)}</b><small>${meta}</small>${tg}</span>
        <span class="go" aria-hidden="true">→</span></button>`;
    }).join('') +
    (!list.length && !illus.length ? `<div class="empty">Pas encore de séance de ${esc(seFilter.toLowerCase())}.<br>Crée la première, elle sera visible par tout le groupe.</div>` : '');
}
function goSport(k) {
  seFilter = k; seTag = '';
  renderSeances();
  $('seNew').textContent = k === 'Tous' ? '+ Créer une séance' : '+ Créer une séance de ' + k.toLowerCase();
}
$('seFilters').addEventListener('click', e => {
  const b = e.target.closest('[data-sport],[data-tag]'); if (!b) return;
  if (b.dataset.sport !== undefined) goSport(b.dataset.sport); else { seTag = b.dataset.tag; renderSeances(); }
});
$('seList').addEventListener('click', e => {
  const r = e.target.closest('[data-real]'); if (r) { supprimerRealisation(r.dataset.real); return; }
  const t = e.target.closest('[data-sport]'); if (t) { goSport(t.dataset.sport); return; }
  const b = e.target.closest('[data-id]'); if (b) openSeance(b.dataset.id);
});

/* Explication et vidéo des exercices techniques (voir lexique.js) */
function lexHtml(nom) {
  const l = lexique(nom); if (!l) return '';
  return `<small class="lex">${esc(l.texte)} <a href="${l.video}" target="_blank" rel="noopener">▶ Voir une vidéo</a></small>`;
}
function majAide(row) { row.querySelector('.xhelp').innerHTML = lexHtml(row.querySelector('.xn').value); }

/* Fiche d'une séance */
const linkify = s => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">lien ↗</a>');
let viewing = null;
function openSeance(id) {
  const s = seances.find(x => x.id === id); if (!s) return;
  viewing = s;
  const meta = [s.duree ? s.duree + ' min' : '', 'proposée par ' + esc(s.auteur)].filter(Boolean).join(' · ');
  $('seView').innerHTML = `
    <span class="badge">${sportOf(s.sport).emo} ${esc(s.sport)}</span>
    <h2>${esc(s.titre)}</h2>
    ${(s.tags || []).length ? `<p class="tagline">${s.tags.map(g => `<i>${esc(g)}</i>`).join('')}</p>` : ''}
    <p class="meta">${meta}</p>
    ${s.description ? `<p class="desc">${linkify(s.description)}</p>` : ''}
    ${s.sport === 'Running' ? alluresBoxHtml() : ''}
    ${(s.blocs || []).filter(b => (b.ex || []).length).map(b => `
      <section class="sebloc"><h3>${esc(b.titre || 'Bloc')}</h3><ol>${b.ex.map(x => `
        <li><b>${esc(x.dose || '')}</b><span>${esc(x.nom)}${x.note ? `<small>${linkify(x.note)}</small>` : ''}${allureExHtml(x)}${lexHtml(x.nom)}</span></li>`).join('')}</ol></section>`).join('')}`;
  const fav = $('seActions').querySelector('[data-se="fav"]');
  fav.textContent = favoris.has(s.id) ? '★ En favori' : '☆ Favori';
  fav.setAttribute('aria-pressed', String(favoris.has(s.id)));
  // Seul l'auteur peut supprimer ; les autres peuvent modifier ou dupliquer.
  $('seActions').querySelector('[data-se="del"]').hidden = !(me && norm(me) === norm(s.auteur));
  if (!$('seViewDlg').open) $('seViewDlg').showModal();
  try { history.replaceState(null, '', '#seance-' + s.id); } catch (e) {}
}
function closeSeance() { $('seViewDlg').close(); }
$('seViewDlg').addEventListener('close', () => { try { history.replaceState(null, '', '#seances'); } catch (e) {} });
$('seClose').onclick = closeSeance;

$('seActions').addEventListener('click', async e => {
  const b = e.target.closest('[data-se]'); if (!b || !viewing) return;
  const s = viewing, act = b.dataset.se;
  if (act === 'share') shareSeance(s);
  else if (act === 'plan') { closeSeance(); planSeance(s); }
  else if (act === 'edit') { if (!(await ensureName())) return; closeSeance(); openEditor(s, false); }
  else if (act === 'copy') { if (!(await ensureName())) return; closeSeance(); openEditor(s, true); }
  else if (act === 'del') { closeSeance(); deleteSeance(s.id); }
  else if (act === 'run') { closeSeance(); demarrerSeance(s); }
  else if (act === 'done') { if (await marquerFaite(s)) closeSeance(); }
  else if (act === 'fav') { const on = toggleFavori(s.id); toast(on ? 'Ajoutée à tes favoris ⭐' : 'Retirée de tes favoris'); openSeance(s.id); if (seFilter === 'Tous') renderSeances(); }
});
// Changer sa VMA recalcule les temps affichés
$('seView').addEventListener('change', e => { if (e.target.id === 'vmaInput') { setVma(parseFloat(String(e.target.value).replace(',', '.'))); if (viewing) openSeance(viewing.id); } });

/* Partager sur WhatsApp */
function seanceText(s, withLink) {
  const L = [`${sportOf(s.sport).emo} *${s.titre}*`, [s.sport, s.duree ? s.duree + ' min' : '', 'par ' + s.auteur].filter(Boolean).join(' · ')];
  if ((s.tags || []).length) L.push(s.tags.map(g => '#' + g.replace(/\s+/g, '')).join(' '));
  if (s.description) L.push('', s.description);
  (s.blocs || []).filter(b => (b.ex || []).length).forEach(b => {
    L.push('', '*' + (b.titre || 'Bloc') + '*');
    b.ex.forEach(x => L.push('• ' + [x.dose, x.nom].filter(Boolean).join(' ') + (x.note ? ' (' + x.note + ')' : '')));
  });
  if (withLink) L.push('', 'La séance dans l’appli : ' + pageUrl() + '#seance-' + s.id);
  return L.join('\n');
}
function shareSeance(s) {
  window.open('https://wa.me/?text=' + encodeURIComponent(seanceText(s, true)), '_blank', 'noopener');
}

/* Proposer la séance au planning : ouvre le formulaire d'activité pré-rempli */
async function planSeance(s) {
  setView('planning');
  await $('addBtn').onclick();
  if (!$('addDlg').open) return;
  seanceLiee = s.id;
  $('fTitre').value = s.titre.slice(0, 120);
  const resume = [s.sport + (s.duree ? ' · ' + s.duree + ' min' : ''),
    ...(s.blocs || []).filter(b => (b.ex || []).length).map(b => b.titre + ' : ' + b.ex.map(x => x.nom).join(', '))];
  let desc = resume.join('\n');
  const link = '\nSéance : ' + pageUrl() + '#seance-' + s.id;
  $('fDesc').value = (desc.length + link.length > 600 ? desc.slice(0, 600 - link.length - 1) + '…' : desc) + link;
}

/* Suppression avec « Annuler » pendant 6 secondes */
async function deleteSeance(id) {
  const s = seances.find(x => x.id === id);
  if (!s || !me || norm(me) !== norm(s.auteur)) { toast('Seule la personne qui a créé la séance peut la supprimer.'); return; }
  if (!(await ensureCode())) return;
  seances = seances.filter(x => x.id !== id); renderSeances();
  const t = setTimeout(async () => {
    pendingSeDel.delete(id);
    await supprimerProtege('ft_supprimer_seance', {p_id: id});
    loadSeances();
  }, 6000);
  pendingSeDel.set(id, t);
  toast('Séance supprimée', {label: 'Annuler', fn: () => { clearTimeout(t); pendingSeDel.delete(id); loadSeances(); }}, 6000);
}
window.addEventListener('pagehide', () => {
  pendingSeDel.forEach((t, id) => { clearTimeout(t); supprimerAuDepart('ft_supprimer_seance', {p_id: id}); });
  pendingSeDel.clear();
});

/* Éditeur : création, modification, duplication */
let editingSe = null;
function exRow(x = {}, dose) {
  const r = document.createElement('div'); r.className = 'exrow';
  r.innerHTML = `<input class="xd" maxlength="40" placeholder="${esc(dose)}" aria-label="Quantité" value="${esc(x.dose || '')}">
    <input class="xn" maxlength="80" placeholder="Exercice" aria-label="Exercice" value="${esc(x.nom || '')}">
    <button type="button" class="xdel" aria-label="Retirer cet exercice">✕</button>
    <input class="xo" maxlength="200" placeholder="Consigne ou lien (optionnel)" aria-label="Consigne" value="${esc(x.note || '')}">
    <p class="xhelp"></p>`;
  majAide(r);
  return r;
}
function suggHtml(info) {
  // Une suggestion peut porter sa quantité : « Corde à sauter|5 min ».
  return info.sugg.map(s => { const [n, d] = s.split('|');
    return `<button type="button" data-sugg="${esc(n)}"${d ? ` data-dose="${esc(d)}"` : ''}>+ ${esc(n)}${d ? ' · ' + esc(d) : ''}</button>`; }).join('');
}
function blocEl(b, sport) {
  const el = document.createElement('fieldset'); el.className = 'blocedit';
  const info = blocInfo(sport, b.titre);
  el.innerHTML = `<div class="bhead"><input class="bt" maxlength="60" value="${esc(b.titre || '')}" placeholder="Nom du bloc" aria-label="Nom du bloc">
      <button type="button" class="bdel" aria-label="Retirer ce bloc">Retirer</button></div>
    <div class="exs"></div>
    <div class="sugg">${suggHtml(info)}</div>
    <button type="button" class="btn small addex">+ Exercice</button>`;
  const box = el.querySelector('.exs');
  (b.ex && b.ex.length ? b.ex : [{}]).forEach(x => box.appendChild(exRow(x, info.dose)));
  return el;
}
// Renommer un bloc met à jour ses suggestions et l'unité proposée.
function refreshBloc(el) {
  const info = blocInfo(currentSport(), el.querySelector('.bt').value);
  el.querySelector('.sugg').innerHTML = suggHtml(info);
  el.querySelectorAll('.xd').forEach(i => i.placeholder = info.dose);
}
// Étiquettes : celles proposées pour le sport, plus celles déjà posées sur la séance.
function fillTags(sel) {
  const all = [...new Set([...(sportOf(currentSport()).tags || []), ...sel])];
  $('seTags').innerHTML = all.map(g => `<label class="sport"><input type="checkbox" value="${esc(g)}"${sel.includes(g) ? ' checked' : ''}><span>${esc(g)}</span></label>`).join('');
  $('seTagsWrap').hidden = !all.length;
}
const readTags = () => [...$('seTags').querySelectorAll('input:checked')].map(i => i.value).slice(0, 8);
function currentSport() { const r = document.querySelector('input[name="seSport"]:checked'); return r ? r.value : 'Autre'; }
function fillBlocs(blocs, sport) {
  const box = $('seBlocs'); box.innerHTML = '';
  blocs.forEach(b => box.appendChild(blocEl(b, sport)));
}
function readBlocs() {
  return [...$('seBlocs').children].map(el => ({
    titre: el.querySelector('.bt').value.trim(),
    ex: [...el.querySelectorAll('.exrow')].map(r => ({
      dose: r.querySelector('.xd').value.trim(), nom: r.querySelector('.xn').value.trim(), note: r.querySelector('.xo').value.trim()
    })).filter(x => x.nom).map(x => { const o = {dose: x.dose, nom: x.nom}; if (x.note) o.note = x.note; return o; })
  })).filter(b => b.ex.length);
}
const isBlank = () => readBlocs().length === 0;

function openEditor(s, copy) {
  editingSe = s && !copy ? s : null;
  $('seEditTitle').textContent = editingSe ? 'Modifier la séance' : copy ? 'Dupliquer la séance' : 'Créer une séance';
  $('seSports').innerHTML = Object.keys(SPORTS).map(k =>
    `<label class="sport"><input type="radio" name="seSport" value="${esc(k)}"${(s ? s.sport : seFilter !== 'Tous' ? seFilter : 'Tricking') === k ? ' checked' : ''}><span>${SPORTS[k].emo} ${esc(k)}</span></label>`).join('');
  const sport = currentSport();
  $('seTitre').value = s ? (copy ? s.titre + ' (copie)' : s.titre).slice(0, 120) : '';
  $('seDuree').value = s && s.duree ? s.duree : '';
  $('seDesc').value = s && s.description ? s.description : '';
  $('seDesc').placeholder = sportOf(sport).desc || 'Niveau, matériel, objectif…';
  fillBlocs(s && s.blocs && s.blocs.length ? s.blocs : Object.keys(sportOf(sport).blocs).map(t => ({titre: t})), sport);
  fillTags(s ? s.tags || [] : []);
  $('seErr').textContent = '';
  $('seEditDlg').showModal();
  if (!s) $('seTitre').focus();
}
$('seNew').onclick = async () => { if (!(await ensureName())) return; openEditor(null, false); };
$('seCancel').onclick = () => $('seEditDlg').close();

// Changer de sport : si rien n'est encore saisi, on propose les blocs de ce sport ; sinon on adapte seulement les aides.
$('seSports').addEventListener('change', () => {
  const sport = currentSport();
  fillTags(readTags());
  $('seDesc').placeholder = sportOf(sport).desc || 'Niveau, matériel, objectif…';
  if (isBlank()) fillBlocs(Object.keys(sportOf(sport).blocs).map(t => ({titre: t})), sport);
  else fillBlocs(readBlocs(), sport);
});
$('seBlocs').addEventListener('click', e => {
  const t = e.target, bloc = t.closest('.blocedit'); if (!bloc) return;
  const dose = blocInfo(currentSport(), bloc.querySelector('.bt').value).dose, box = bloc.querySelector('.exs');
  if (t.matches('.addex')) { const r = exRow({}, dose); box.appendChild(r); r.querySelector('.xd').focus(); }
  else if (t.matches('[data-sugg]')) {
    const empty = [...box.querySelectorAll('.exrow')].find(r => !r.querySelector('.xn').value.trim());
    const r = empty || box.appendChild(exRow({}, dose));
    r.querySelector('.xn').value = t.dataset.sugg; majAide(r);
    if (t.dataset.dose && !r.querySelector('.xd').value) r.querySelector('.xd').value = t.dataset.dose;
    r.querySelector('.xd').focus();
  }
  else if (t.matches('.xdel')) { const r = t.closest('.exrow'); if (box.children.length > 1) r.remove(); else { r.querySelectorAll('input').forEach(i => i.value = ''); majAide(r); } }
  else if (t.matches('.bdel')) { if ($('seBlocs').children.length > 1) bloc.remove(); }
});
$('seBlocs').addEventListener('input', e => {
  if (e.target.matches('.bt')) refreshBloc(e.target.closest('.blocedit'));
  else if (e.target.matches('.xn')) majAide(e.target.closest('.exrow'));
});
$('seAddBloc').onclick = () => { const el = blocEl({titre: ''}, currentSport()); $('seBlocs').appendChild(el); el.querySelector('.bt').focus(); };

$('seForm').onsubmit = async e => {
  e.preventDefault();
  const blocs = readBlocs();
  const titre = $('seTitre').value.trim();
  if (!titre) { $('seErr').textContent = 'Donne un nom à la séance.'; $('seTitre').focus(); return; }
  if (!blocs.length) { $('seErr').textContent = 'Ajoute au moins un exercice.'; return; }
  const d = parseInt($('seDuree').value, 10);
  const body = {sport: currentSport(), titre, duree: d > 0 && d <= 600 ? d : null, description: $('seDesc').value.trim() || null, blocs, tags: readTags()};
  $('seSave').disabled = true;
  try {
    let row;
    if (editingSe) [row] = await api('/ft_seances?id=eq.' + editingSe.id, {method: 'PATCH', body: JSON.stringify(body), headers: {Prefer: 'return=representation'}});
    else [row] = await api('/ft_seances', {method: 'POST', body: JSON.stringify({...body, auteur: me}), headers: {Prefer: 'return=representation'}});
    $('seEditDlg').close();
    toast(editingSe ? 'Séance mise à jour ✅' : 'Séance publiée 🙌');
    seFilter = row.sport; seTag = ''; $('seNew').textContent = '+ Créer une séance de ' + row.sport.toLowerCase();
    await loadSeances();
  } catch (err) { $('seErr').textContent = 'Impossible d’enregistrer pour le moment. Réessaie.'; }
  $('seSave').disabled = false;
};

/* Ouverture : onglet Séances et lien direct vers une séance (#seance-…) */
document.querySelector('.mtabs').addEventListener('click', e => { const b = e.target.closest('[data-view="seances"]'); if (b) loadSeances(); });
document.addEventListener('DOMContentLoaded', async () => {
  const m = location.hash.match(/^#seance-([0-9a-f-]{36})$/);
  if (location.hash === '#seances' || m) { setView('seances'); await loadSeances(); if (m) openSeance(m[1]); }
});

/* Depuis une activité du planning : ouvrir la séance liée */
async function ouvrirSeanceLiee(id) {
  setView('seances');
  if (!seLoaded || !seances.some(s => s.id === id)) await loadSeances();
  if (seances.some(s => s.id === id)) openSeance(id); else toast('Cette séance a été supprimée.');
}
