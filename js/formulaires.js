// Formulaires : modifier une activité et proposer une nouvelle activité.
/* Compléter date / heure / lieu */
let editing = null;
function openEdit(id, focus) {
  const a = activities.find(x => x.id === id); if (!a) return;
  editing = a;
  const poll = a.statut === 'sondage';
  $('eWhen').hidden = poll;
  $('eMulti').checked = false; $('eSlots').hidden = true; $('eSlotRows').innerHTML = ''; $('eMultiWrap').hidden = poll;
  $('eDate').required = !poll; $('eDate').min = todayStr();
  $('eDate').value = a.date || ''; $('eHeure').value = a.heure ? a.heure.slice(0, 5) : '';
  lieuChoisi = a.lieu_id || null; renderLieuxSugg();
  seanceLiee = a.seance_id || null;
  $('ePlaces').value = a.places || '';
  $('eLieu').value = a.lieu || ''; $('eTitre').value = a.titre; $('eDesc').value = a.description || ''; $('eErr').textContent = '';
  $('eSeance').hidden = true;
  prepSeanceSelect('eSeance');
  $('eDel').hidden = !(me && norm(a.organisateur) === norm(me));
  $('editDlg').showModal();
  const target = {titre: 'eTitre', desc: 'eDesc', lieu: 'eLieu', heure: 'eHeure', date: 'eDate'}[focus] || 'eTitre';
  $(poll && (target === 'eHeure' || target === 'eDate') ? 'eLieu' : target).focus();
}
$('eCancel').onclick = () => $('editDlg').close();
$('eDel').onclick = async () => {
  if (!editing) return;
  $('editDlg').close(); scheduleDelete(editing.id);
};
$('eMulti').onchange = e => {
  const on = e.target.checked;
  $('eSlots').hidden = !on; $('eWhen').hidden = on; $('eDate').required = !on;
  if (on && !$('eSlotRows').children.length) {
    addSlotRow(editing.date || '', editing.heure ? editing.heure.slice(0, 5) : '', $('eSlotRows'));
    addSlotRow('', '', $('eSlotRows'));
  }
};
$('eAddSlot').onclick = () => addSlotRow('', '', $('eSlotRows'));
$('editForm').onsubmit = async e => {
  e.preventDefault();
  const a = editing, poll = a.statut === 'sondage', multi = $('eMulti').checked;
  const pl = parseInt($('ePlaces').value, 10);
  const body = {titre: $('eTitre').value.trim(), lieu: $('eLieu').value.trim() || null, lieu_id: lieuChoisi, places: pl > 0 && pl <= 200 ? pl : null, seance_id: seanceLiee, description: $('eDesc').value.trim() || null};
  if (!poll && !multi) { body.date = $('eDate').value; body.heure = $('eHeure').value || null; }
  let slots = [];
  if (multi) {
    slots = readSlots($('eSlotRows'));
    if (slots.length < 2) { $('eErr').textContent = 'Propose au moins deux dates différentes.'; return; }
    Object.assign(body, {statut: 'sondage', date: null, heure: null});
  }
  $('eSubmit').disabled = true;
  try {
    if (multi) {
      const cr = await api('/ft_creneaux', {method: 'POST', body: JSON.stringify(slots.map(s => ({...s, activite_id: a.id}))), headers: {Prefer: 'return=representation'}});
      const orig = c => c.date === a.date && (c.heure ? c.heure.slice(0, 5) : null) === (a.heure ? a.heure.slice(0, 5) : null);
      const origSlot = cr.find(orig);
      const votes = origSlot ? (a.ft_inscriptions || []).map(i => ({creneau_id: origSlot.id, prenom: i.prenom})) : [];
      if (votes.length) await api('/ft_votes', {method: 'POST', body: JSON.stringify(votes), headers: {Prefer: 'return=minimal'}});
      await api('/ft_inscriptions?activite_id=eq.' + a.id, {method: 'DELETE'});
    }
    await api('/ft_activites?id=eq.' + a.id, {method: 'PATCH', body: JSON.stringify(body), headers: {Prefer: 'return=minimal'}});
    $('editDlg').close(); toast('C’est à jour ✅'); load();
  } catch (err) { $('eErr').textContent = 'Impossible d’enregistrer pour le moment. Réessaie.'; }
  $('eSubmit').disabled = false;
};

/* Ajout */
const SUGGS = ['Natation 🏊', 'Running 🏃', 'Street workout 💪', 'Salle de sport', 'Yoga 🧘', 'Gym suédoise', 'Escalade 🧗'];
$('sugg').innerHTML = SUGGS.map(s => `<button type="button">${esc(s)}</button>`).join('');
$('sugg').onclick = e => { const b = e.target.closest('button'); if (b) { $('fTitre').value = b.textContent; $('fTitre').focus(); } };

function addSlotRow(date = '', heure = '', box = $('slotRows')) {
  const r = document.createElement('div'); r.className = 'srow';
  r.innerHTML = `<input type="date" class="sd" min="${todayStr()}" value="${date}" aria-label="Date"><input type="time" class="sh" value="${heure}" aria-label="Heure"><button type="button" aria-label="Retirer cette date">✕</button>`;
  r.querySelector('button').onclick = () => { if (box.children.length > 2) r.remove(); };
  box.appendChild(r);
}
function readSlots(box) {
  const seen = new Set(), slots = [];
  [...box.children].forEach(r => {
    const d = r.querySelector('.sd').value, h = r.querySelector('.sh').value || null;
    if (d && !seen.has(d + '|' + h)) { seen.add(d + '|' + h); slots.push({date: d, heure: h}); }
  });
  return slots;
}
let slotPrefill = null, pendingEnd = null; // utilisés quand on « refait » une activité
let seanceLiee = null; // séance liée à l'activité (bouton « Proposer au planning » ou choix dans le formulaire)

// Sport deviné d'après le nom et le lieu de l'activité, pour proposer ses séances en premier.
const SPORT_MOTS = [['Renfo', /neoness|salle|renfo|muscu|fitness|basic.?fit|crossfit/i], ['Natation', /piscine|natation|nage|swim/i],
  ['Running', /course|run|footing|fractionn|piste|10 ?km|semi|marathon|vma/i], ['Tricking', /trick|flip|salto|acro|trampo|capoeira/i],
  ['Street workout', /street|calisth|barres?\b|traction/i], ['Yoga', /yoga/i], ['Gym suédoise', /gym su/i]];
const sportDevine = texte => (SPORT_MOTS.find(([, re]) => re.test(texte || '')) || [])[0] || '';

// Liste des séances du groupe, rangées par sport (le sport deviné en premier), pour l'associer à une activité.
function fillSeanceSelect(id, val) {
  const texte = id === 'eSeance' ? $('eTitre').value + ' ' + $('eLieu').value : $('fTitre').value + ' ' + $('fLieu').value;
  const devine = sportDevine(texte);
  const parSport = {};
  seances.forEach(s => (parSport[s.sport] = parSport[s.sport] || []).push(s));
  const ordre = Object.keys(parSport).sort((a, b) => (b === devine) - (a === devine) || a.localeCompare(b, 'fr'));
  $(id).innerHTML = '<option value="">Aucune séance</option>' + ordre.map(sp =>
    `<optgroup label="${esc(sp)}${sp === devine ? ' (suggéré)' : ''}">${parSport[sp].sort((a, b) => a.titre.localeCompare(b.titre, 'fr', {numeric: true}))
      .map(s => `<option value="${s.id}">${esc(s.titre)}</option>`).join('')}</optgroup>`).join('');
  $(id).value = val && seances.some(s => s.id === val) ? val : '';
  renderSeanceChips(id, devine);
}
// Séances en boutons : les plus utilisées du sport deviné, la séance choisie, « Autre… » pour la liste complète.
function renderSeanceChips(id, devine) {
  const box = $(id + 'Chips'), choisie = seances.find(s => s.id === seanceLiee);
  const usage = s => activities.filter(a => a.seance_id === s.id).length;
  // Sport pas encore deviné (nom vide) : seulement le bouton pour ouvrir la liste.
  let top = !devine ? [] : seances.filter(s => s.sport === devine)
    .sort((a, b) => usage(b) - usage(a) || a.titre.localeCompare(b.titre, 'fr', {numeric: true})).slice(0, 4);
  if (choisie && !top.includes(choisie)) top = [choisie, ...top.slice(0, 3)];
  box.innerHTML = top.map(s => `<button type="button" data-sch="${s.id}" aria-pressed="${s.id === seanceLiee}">${sportOf(s.sport).emo} ${esc(s.titre)}</button>`).join('') +
    (seanceLiee ? `<button type="button" data-sch="">✕ Aucune</button>` : '') +
    `<button type="button" data-sautre="1">${top.length ? 'Autre…' : 'Choisir une séance…'}</button>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-sch],[data-sautre]'); if (!c || !c.parentElement.classList.contains('seancechips')) return;
  const sel = c.parentElement.id.replace('Chips', '');
  if (c.dataset.sautre) { $(sel).hidden = false; $(sel).focus(); return; }
  seanceLiee = c.dataset.sch || null; $(sel).value = seanceLiee || ''; fillSeanceSelect(sel, seanceLiee);
});
async function prepSeanceSelect(id) {
  fillSeanceSelect(id, seanceLiee);
  if (!seLoaded) { await loadSeances(); fillSeanceSelect(id, seanceLiee); }
}
['fSeance', 'eSeance'].forEach(id => $(id).addEventListener('change', e => { seanceLiee = e.target.value || null; fillSeanceSelect(id, seanceLiee); }));
// Le nom ou le lieu change : on remet les séances du bon sport en tête.
[['fTitre', 'fSeance'], ['fLieu', 'fSeance'], ['eTitre', 'eSeance'], ['eLieu', 'eSeance']].forEach(([c, s]) =>
  $(c).addEventListener('input', () => fillSeanceSelect(s, seanceLiee)));
function setMulti(on) {
  $('fixedWhen').hidden = on; $('pollWhen').hidden = !on;
  $('repeatWrap').hidden = on; if (on) { $('fRepeat').checked = false; $('repeatOpts').hidden = true; }
  $('fDate').required = !on;
  if (on && !$('slotRows').children.length) {
    if (slotPrefill) { addSlotRow(slotPrefill.date, slotPrefill.heure); addSlotRow(addDays(slotPrefill.date, 1), slotPrefill.heure); }
    else { addSlotRow(); addSlotRow(); }
  }
}
$('fMulti').onchange = e => setMulti(e.target.checked);
$('addSlot').onclick = () => addSlotRow();
$('fRepeat').onchange = e => { $('repeatOpts').hidden = !e.target.checked; };

$('addBtn').onclick = async () => {
  if (!(await ensureName())) return;
  slotPrefill = null; pendingEnd = null; seanceLiee = null; $('addTitle').textContent = 'Proposer une activité';
  $('addForm').reset(); $('repeatOpts').hidden = true; lieuChoisi = null; renderLieuxSugg(); $('slotRows').innerHTML = ''; setMulti(false);
  $('fDate').min = todayStr(); $('fDate').value = todayStr(); $('addErr').textContent = '';
  $('fSeance').hidden = true; $('addPlus').open = false;
  prepSeanceSelect('fSeance');
  $('addDlg').showModal();
};
$('addCancel').onclick = () => $('addDlg').close();
$('addForm').onsubmit = async e => {
  e.preventDefault();
  const btn = $('addSubmit'); btn.disabled = true; $('addErr').textContent = '';
  const multi = $('fMulti').checked;
  let slots = [];
  if (multi) {
    const seen = new Set();
    [...$('slotRows').children].forEach(r => {
      const d = r.querySelector('.sd').value, h = r.querySelector('.sh').value || null;
      if (d && !seen.has(d + '|' + h)) { seen.add(d + '|' + h); slots.push({date: d, heure: h}); }
    });
    if (slots.length < 2) { $('addErr').textContent = 'Propose au moins deux dates différentes.'; btn.disabled = false; return; }
  }
  const body = {
    titre: $('fTitre').value.trim(), date: multi ? null : $('fDate').value, heure: multi ? null : ($('fHeure').value || null),
    duree_fin: multi ? null : pendingEnd,
    statut: multi ? 'sondage' : 'fixe',
    lieu: $('fLieu').value.trim() || null, description: $('fDesc').value.trim() || null, organisateur: me,
    seance_id: seanceLiee, lieu_id: lieuChoisi,
    places: (p => p > 0 && p <= 200 ? p : null)(parseInt($('fPlaces').value, 10))
  };
  try {
    // Activité récurrente : une activité par semaine, reliées par le même serie_id.
    if (!multi && $('fRepeat').checked) {
      const n = parseInt($('fRepeatN').value, 10) || 8, serie = crypto.randomUUID();
      const rows = await api('/ft_activites', {method: 'POST', headers: {Prefer: 'return=representation'},
        body: JSON.stringify(Array.from({length: n}, (_, k) => ({...body, date: addDays(body.date, 7 * k), serie_id: serie})))});
      await api('/ft_inscriptions', {method: 'POST', body: JSON.stringify(rows.map(r => ({activite_id: r.id, prenom: me}))), headers: {Prefer: 'return=minimal'}});
      $('addDlg').close(); toast(n + ' dates publiées 🔁'); load();
      btn.disabled = false; return;
    }
    const [row] = await api('/ft_activites', {method: 'POST', body: JSON.stringify(body), headers: {Prefer: 'return=representation'}});
    if (multi) {
      // le créateur est dispo sur toutes ses dates par défaut (il peut décocher)
      const cr = await api('/ft_creneaux', {method: 'POST', body: JSON.stringify(slots.map(s => ({...s, activite_id: row.id}))), headers: {Prefer: 'return=representation'}});
      await api('/ft_votes', {method: 'POST', body: JSON.stringify(cr.map(c => ({creneau_id: c.id, prenom: me}))), headers: {Prefer: 'return=minimal'}});
    } else {
      // le créateur est inscrit d'office
      await api('/ft_inscriptions', {method: 'POST', body: JSON.stringify({activite_id: row.id, prenom: me}), headers: {Prefer: 'return=minimal'}});
    }
    $('addDlg').close(); toast('Activité publiée 🙌'); load();
  } catch (err) {
    $('addErr').textContent = 'Impossible de publier pour le moment. Réessaie.';
  }
  btn.disabled = false;
};

