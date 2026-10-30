// Programmes sur plusieurs semaines : une suite de séances d'un même sport, semaine par semaine.
// On commence un programme sur son téléphone ; l'appli met en avant la semaine en cours et coche les séances faites.

let programmes = [];
let progVu = null, progEdite = null;

async function loadProgrammes() {
  try { programmes = await api('/ft_programmes?select=*&order=titre.asc'); } catch (e) { programmes = []; }
}
const debutProg = id => { try { return localStorage.getItem('ft_prog_' + id) || ''; } catch (e) { return ''; } };
function setDebutProg(id, d) { try { d ? localStorage.setItem('ft_prog_' + id, d) : localStorage.removeItem('ft_prog_' + id); } catch (e) {} }
function semaineEnCours(p) {
  const d = debutProg(p.id); if (!d) return 0;
  const n = Math.floor((new Date(todayStr() + 'T12:00:00') - new Date(d + 'T12:00:00')) / (7 * 864e5)) + 1;
  return Math.min(Math.max(n, 1), p.semaines.length);
}
const faiteDepuis = (seanceId, depuis) => realisations.some(r => r.seance_id === seanceId && r.fait_le >= depuis);

/* Dans la vue d'un sport : les programmes en tête */
function programmesHtml(sport) {
  const list = programmes.filter(p => p.sport === sport);
  return `<section class="progs">${list.map(p => {
    const s = semaineEnCours(p);
    return `<button type="button" class="disc prog" data-prog="${p.id}">
      <span class="emo" aria-hidden="true">📆</span>
      <span class="dtxt"><b>${esc(p.titre)}</b><small>Programme · ${p.semaines.length} semaines${s ? ' · tu es en semaine ' + s : ''}</small></span>
      <span class="go" aria-hidden="true">→</span></button>`;
  }).join('')}<button type="button" class="lien" data-prognew="1">+ Créer un programme de ${esc(sport.toLowerCase())}</button></section>`;
}

/* Fiche d'un programme */
function openProgramme(id) {
  const p = programmes.find(x => x.id === id); if (!p) return;
  progVu = p;
  const debut = debutProg(p.id), cur = semaineEnCours(p);
  $('prView').innerHTML = `
    <span class="badge">📆 Programme · ${esc(p.sport)}</span>
    <h2>${esc(p.titre)}</h2>
    <p class="meta">${p.semaines.length} semaines · proposé par ${esc(p.auteur)}</p>
    ${p.objectif ? `<p class="desc">${esc(p.objectif)}</p>` : ''}
    ${debut ? `<p class="hint">Commencé le ${new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: 'long'}).format(new Date(debut + 'T12:00:00'))} : tu es en semaine ${cur}.</p>` : ''}
    ${p.semaines.map((w, i) => {
      const ses = (w.seances || []).map(id => seances.find(s => s.id === id)).filter(Boolean);
      return `<section class="semaine${cur === i + 1 ? ' courante' : ''}"><h3>Semaine ${i + 1}${cur === i + 1 ? ' <span>cette semaine</span>' : ''}</h3>
        ${w.note ? `<p class="meta">${esc(w.note)}</p>` : ''}
        ${ses.map(s => `<button type="button" class="pse${debut && faiteDepuis(s.id, debut) ? ' fait' : ''}" data-pse="${s.id}">${debut && faiteDepuis(s.id, debut) ? '✓ ' : ''}${esc(s.titre)}</button>`).join('') || '<p class="meta">Repos ou séance libre</p>'}
      </section>`;
    }).join('')}`;
  $('prStart').textContent = debut ? 'Arrêter le programme' : '▶ Commencer cette semaine';
  $('prDel').hidden = !(me && norm(me) === norm(p.auteur));
  if (!$('prDlg').open) $('prDlg').showModal();
}
$('prView').addEventListener('click', e => {
  const b = e.target.closest('[data-pse]'); if (!b) return;
  $('prDlg').close(); openSeance(b.dataset.pse);
});
$('prStart').onclick = () => {
  const p = progVu; if (!p) return;
  if (debutProg(p.id)) { setDebutProg(p.id, ''); toast('Programme arrêté'); }
  else { setDebutProg(p.id, todayStr()); toast('C’est parti : semaine 1 💪'); }
  openProgramme(p.id); renderSeances();
};
$('prClose').onclick = () => $('prDlg').close();
$('prEdit').onclick = async () => { if (!(await ensureName())) return; $('prDlg').close(); openProgEditor(progVu); };
$('prDel').onclick = async () => {
  const p = progVu; if (!p || !(await ensureCode())) return;
  if (await supprimerProtege('ft_supprimer_programme', {p_id: p.id})) { $('prDlg').close(); toast('Programme supprimé'); await loadProgrammes(); renderSeances(); }
};

/* Éditeur : titre, objectif, et pour chaque semaine une note et des séances du sport */
let progSport = '';
function semaineEl(w, i) {
  const el = document.createElement('fieldset'); el.className = 'blocedit semedit';
  const options = seances.filter(s => s.sport === progSport).map(s => `<option value="${s.id}">${esc(s.titre)}</option>`).join('');
  el.innerHTML = `<div class="bhead"><b class="snum">Semaine ${i + 1}</b><button type="button" class="bdel" data-wdel="1">Retirer</button></div>
    <input class="wnote" maxlength="200" placeholder="Note (optionnel) : ex. ajoute 2 footings lents" value="${esc(w.note || '')}">
    <div class="wses"></div>
    <select class="wadd" aria-label="Ajouter une séance"><option value="">+ Ajouter une séance…</option>${options}</select>`;
  (w.seances || []).forEach(id => ajouterSeanceSemaine(el, id));
  return el;
}
function ajouterSeanceSemaine(el, id) {
  const s = seances.find(x => x.id === id); if (!s) return;
  const c = document.createElement('span'); c.className = 'wchip'; c.dataset.id = id;
  c.innerHTML = `${esc(s.titre)} <button type="button" aria-label="Retirer">✕</button>`;
  el.querySelector('.wses').appendChild(c);
}
function renumeroter() { [...$('prWeeks').children].forEach((el, i) => el.querySelector('.snum').textContent = 'Semaine ' + (i + 1)); }
function openProgEditor(p, sport) {
  progEdite = p || null; progSport = p ? p.sport : sport;
  $('prEditTitle').textContent = p ? 'Modifier le programme' : 'Créer un programme de ' + progSport.toLowerCase();
  $('prTitre').value = p ? p.titre : ''; $('prObj').value = p && p.objectif ? p.objectif : '';
  $('prWeeks').innerHTML = '';
  (p ? p.semaines : [{}, {}, {}, {}]).forEach((w, i) => $('prWeeks').appendChild(semaineEl(w, i)));
  $('prErr').textContent = '';
  $('prEditDlg').showModal();
}
$('prWeeks').addEventListener('change', e => {
  if (!e.target.matches('.wadd') || !e.target.value) return;
  ajouterSeanceSemaine(e.target.closest('.semedit'), e.target.value); e.target.value = '';
});
$('prWeeks').addEventListener('click', e => {
  if (e.target.closest('.wchip button')) e.target.closest('.wchip').remove();
  else if (e.target.closest('[data-wdel]') && $('prWeeks').children.length > 1) { e.target.closest('.semedit').remove(); renumeroter(); }
});
$('prAddWeek').onclick = () => { $('prWeeks').appendChild(semaineEl({}, $('prWeeks').children.length)); };
$('prCancel').onclick = () => $('prEditDlg').close();
$('prForm').onsubmit = async e => {
  e.preventDefault();
  const titre = $('prTitre').value.trim();
  const semaines = [...$('prWeeks').children].map(el => ({note: el.querySelector('.wnote').value.trim(), seances: [...el.querySelectorAll('.wchip')].map(c => c.dataset.id)}));
  if (!titre) { $('prErr').textContent = 'Donne un nom au programme.'; return; }
  if (!semaines.some(w => w.seances.length)) { $('prErr').textContent = 'Ajoute au moins une séance.'; return; }
  const body = {titre, objectif: $('prObj').value.trim() || null, semaines};
  try {
    if (progEdite) await api('/ft_programmes?id=eq.' + progEdite.id, {method: 'PATCH', body: JSON.stringify(body), headers: {Prefer: 'return=minimal'}});
    else await api('/ft_programmes', {method: 'POST', body: JSON.stringify({...body, sport: progSport, auteur: me}), headers: {Prefer: 'return=minimal'}});
    $('prEditDlg').close(); toast(progEdite ? 'Programme mis à jour ✅' : 'Programme publié 🙌');
    await loadProgrammes(); renderSeances();
  } catch (err) { $('prErr').textContent = 'Impossible d’enregistrer pour le moment. Réessaie.'; }
};
document.addEventListener('click', async e => {
  const o = e.target.closest('[data-prog]'); if (o) { openProgramme(o.dataset.prog); return; }
  const n = e.target.closest('[data-prognew]'); if (n) { if (!(await ensureName())) return; openProgEditor(null, seFilter); }
});
