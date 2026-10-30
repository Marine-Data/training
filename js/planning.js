// Planning : chargement, affichage des cartes, inscriptions, votes et suppression.
/* Suppression avec « Annuler » pendant 6 secondes */
const pendingDel = new Map();
function scheduleDelete(id) {
  const a = activities.find(x => x.id === id); if (!a) return;
  if (!me || norm(me) !== norm(a.organisateur)) { toast('Seule la personne qui a proposé l’activité peut la supprimer.'); return; }
  activities = activities.filter(x => x.id !== id); render();
  const t = setTimeout(async () => {
    pendingDel.delete(id);
    try { await api('/ft_activites?id=eq.' + id, {method: 'DELETE'}); } catch (e) { toast('Suppression impossible, réessaie.'); }
    load();
  }, 6000);
  pendingDel.set(id, t);
  toast('Activité supprimée', {label: 'Annuler', fn: () => { clearTimeout(t); pendingDel.delete(id); load(); }}, 6000);
}
// Si on ferme la page pendant les 6 secondes, la suppression est quand même envoyée.
window.addEventListener('pagehide', () => {
  pendingDel.forEach((t, id) => { clearTimeout(t); try { fetch(SB + '/ft_activites?id=eq.' + id, {method: 'DELETE', headers: H, keepalive: true}); } catch (e) {} });
  pendingDel.clear();
});

async function load() {
  try {
    const rows = await api('/ft_activites?select=*,ft_inscriptions(id,prenom,created_at),ft_creneaux(id,date,heure,ft_votes(id,prenom))&order=date.asc.nullslast,heure.asc.nullslast');
    activities = rows.filter(a => !pendingDel.has(a.id));
    render();
  } catch (e) {
    $('list').innerHTML = '<div class="empty">Impossible de charger le planning. Réessaie dans un instant.</div>';
  }
}

const openMore = new Set();
function moreMenu(a, poll) {
  // Seul l'organisateur peut supprimer l'activité.
  const orga = me && norm(a.organisateur) === norm(me);
  const items = [['edit', '✎ Modifier'], ['share', '💬 Partager'],
    ...(poll ? [] : [['ics', '📅 Mon agenda'], ['repeat', '🔁 Refaire']]), ...(orga ? [['del', '🗑 Supprimer']] : [])];
  return `<details class="more" data-id="${a.id}"${openMore.has(a.id) ? ' open' : ''}><summary>Plus d’options</summary><div class="menu">${
    items.map(([k, l]) => `<button class="btn small${k === 'del' ? ' danger' : ''}" data-act="${k}" data-id="${a.id}">${l}</button>`).join('')}</div></details>`;
}
function lieuHtml(a) {
  return a.lieu
    ? `<div class="meta"><button class="edit" data-act="edit" data-focus="lieu" data-id="${a.id}">${esc(a.lieu)}</button> <a class="map" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.lieu)}" target="_blank" rel="noopener" aria-label="Voir sur la carte">🗺️</a></div>`
    : `<div><button class="tbd lieu" data-act="edit" data-focus="lieu" data-id="${a.id}">Lieu à confirmer ✎</button></div>`;
}
function timeHtml(a) {
  return a.heure
    ? `<button class="edit time" data-act="edit" data-focus="heure" data-id="${a.id}">${esc(timeLabel(a))}</button>`
    : `<button class="tbd" data-act="edit" data-focus="heure" data-id="${a.id}">Horaire à confirmer ✎</button>`;
}
function titreHtml(a) {
  return `<h3><button class="edit" data-act="edit" data-focus="titre" data-id="${a.id}">${esc(a.titre)}</button></h3>`;
}
function descHtml(a) {
  return a.description
    ? `<p class="desc"><button class="edit" data-act="edit" data-focus="desc" data-id="${a.id}">${esc(a.description)}</button></p>`
    : `<div><button class="tbd lieu" data-act="edit" data-focus="desc" data-id="${a.id}">+ Ajouter des détails</button></div>`;
}

const seanceBtn = a => a.seance_id ? `<button class="btn small" data-act="seance" data-id="${a.seance_id}">📋 Voir la séance</button>` : '';
function card(a) {
  const ins = (a.ft_inscriptions || []).slice().sort((x, y) => x.created_at.localeCompare(y.created_at));
  const mine = me && ins.find(i => norm(i.prenom) === norm(me));
  const people = ins.length
    ? ins.map(i => `<span class="chip ${me && norm(i.prenom) === norm(me) ? 'me' : ''}">${esc(i.prenom)}</span>`).join('')
    : '<span class="none">Personne pour l’instant, sois le premier·ère !</span>';
  const lieu = lieuHtml(a);
  return `<article class="card ${mine ? 'me' : ''}">
    ${timeHtml(a)}
    ${titreHtml(a)}
    ${lieu}
    <div class="meta">Proposé par ${esc(a.organisateur)}</div>
    ${descHtml(a)}
    <div class="people">${people}</div>
    <div class="row">
      <button class="btn small ${mine ? '' : 'in'}" data-act="${mine ? 'leave' : 'join'}" data-id="${a.id}">${mine ? 'Je ne viens plus' : '✋ Je viens'}</button>
      ${seanceBtn(a)}
    </div>
    ${moreMenu(a, false)}
  </article>`;
}

function slotLabel(s) {
  const d = new Date(s.date + 'T12:00:00');
  const j = new Intl.DateTimeFormat('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}).format(d);
  return `${esc(j)}${s.heure ? ` <small>· ${esc(hm(s.heure))}</small>` : ''}`;
}
function pollCard(a, today) {
  const slots = (a.ft_creneaux || []).filter(s => s.date >= today)
    .sort((x, y) => (x.date + (x.heure || '')).localeCompare(y.date + (y.heure || '')));
  const best = Math.max(0, ...slots.map(s => s.ft_votes.length));
  const isOrga = me && norm(a.organisateur) === norm(me);
  const lieu = lieuHtml(a);
  const rows = slots.map(s => {
    const mine = me && s.ft_votes.some(v => norm(v.prenom) === norm(me));
    const names = s.ft_votes.map(v => `<span class="chip ${me && norm(v.prenom) === norm(me) ? 'me' : ''}">${esc(v.prenom)}</span>`).join('');
    return `<div class="slot ${best > 0 && s.ft_votes.length === best ? 'best' : ''}">
      <button class="vote ${mine ? 'on' : ''}" data-act="vote" data-id="${s.id}" aria-pressed="${!!mine}">
        <span class="d">${mine ? '✓ ' : ''}${slotLabel(s)}</span><span class="n">${s.ft_votes.length}</span>
      </button>
      <div class="who2">${names}${isOrga ? `<button class="fix" data-act="fix" data-id="${s.id}" data-aid="${a.id}">Valider cette date</button>` : ''}</div>
    </div>`;
  }).join('');
  return `<article class="card poll">
    <span class="badge">📅 Date à choisir</span>
    ${titreHtml(a)}
    ${lieu}
    <div class="meta">Proposé par ${esc(a.organisateur)}</div>
    ${descHtml(a)}
    ${a.seance_id ? `<div class="row">${seanceBtn(a)}</div>` : ''}
    <p class="hint">Touche les dates où tu es dispo.</p>
    ${rows}
    ${moreMenu(a, true)}
  </article>`;
}

function render() {
  const today = todayStr();
  const polls = activities.filter(a => a.statut === 'sondage' && (a.ft_creneaux || []).some(s => s.date >= today));
  const fixed = activities.filter(a => a.statut !== 'sondage');
  const upcoming = fixed.filter(a => a.date >= today);
  const past = fixed.filter(a => a.date < today).reverse();
  let html = '';
  if (polls.length) html += `<section class="day"><h2>📅 À caler ensemble</h2>${polls.map(a => pollCard(a, today)).join('')}</section>`;
  if (!upcoming.length && !polls.length) html += '<div class="empty">Rien de prévu pour le moment.<br>Lance-toi, propose la première activité ! 💪</div>';
  const byDay = {};
  upcoming.forEach(a => (byDay[a.date] = byDay[a.date] || []).push(a));
  Object.keys(byDay).sort().forEach(d => {
    html += `<section class="day"><h2>${esc(dayLabel(d))}${d === today ? '<span class="today">aujourd’hui</span>' : ''}</h2>${byDay[d].map(card).join('')}</section>`;
  });
  if (past.length) html += `<details class="past"><summary>Activités passées (${past.length})</summary>${past.map(card).join('')}</details>`;
  $('list').innerHTML = html;
  $('who').innerHTML = me ? `Tu es <button id="chg" title="Changer de prénom">${esc(me)} ✎</button>` : '';
  const chg = $('chg'); if (chg) chg.onclick = () => askName().then(v => v && refreshPushState());
}

function askName() {
  return new Promise(res => {
    const dlg = $('nameDlg'), inp = $('nameInput');
    inp.value = me; dlg.showModal(); inp.focus();
    const done = v => { dlg.close(); $('nameForm').onsubmit = null; $('nameCancel').onclick = null; res(v); };
    $('nameForm').onsubmit = e => {
      e.preventDefault();
      const v = inp.value.trim(); if (!v) return;
      me = v; try { localStorage.setItem('ft_prenom', v); } catch (e) {}
      done(v);
    };
    $('nameCancel').onclick = () => done('');
    dlg.addEventListener('cancel', () => res(''), {once: true});
  });
}
async function ensureName() { return me || (await askName()); }

$('list').addEventListener('toggle', e => { const d = e.target; if (d.classList && d.classList.contains('more')) { d.open ? openMore.add(d.dataset.id) : openMore.delete(d.dataset.id); } }, true);
$('list').addEventListener('click', async e => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const id = b.dataset.id, act = b.dataset.act;
  if (act === 'seance') { ouvrirSeanceLiee(id); return; }
  if (act === 'share') { shareActivity(id); return; }
  if (act === 'ics') { downloadIcs(id); return; }
  if (act === 'repeat') { repeatActivity(id); return; }
  if (act === 'edit') { if (!(await ensureName())) return; openEdit(id, b.dataset.focus); return; }
  if (!(await ensureName())) return;
  if (act === 'edit') { openEdit(id, b.dataset.focus); return; }
  b.disabled = true;
  try {
    if (act === 'join') {
      await api('/ft_inscriptions', {method: 'POST', body: JSON.stringify({activite_id: id, prenom: me}), headers: {Prefer: 'return=minimal'}});
      toast('C’est noté, à bientôt ! 🎉');
    } else if (act === 'leave') {
      const a = activities.find(x => x.id === id);
      const i = a.ft_inscriptions.find(x => norm(x.prenom) === norm(me));
      if (i) await api('/ft_inscriptions?id=eq.' + i.id, {method: 'DELETE'});
      toast('Inscription retirée');
    } else if (act === 'vote') {
      const s = activities.flatMap(a => a.ft_creneaux || []).find(x => x.id === id);
      const v = s && s.ft_votes.find(x => norm(x.prenom) === norm(me));
      if (v) await api('/ft_votes?id=eq.' + v.id, {method: 'DELETE'});
      else await api('/ft_votes', {method: 'POST', body: JSON.stringify({creneau_id: id, prenom: me}), headers: {Prefer: 'return=minimal'}});
    } else if (act === 'fix') {
      const aid = b.dataset.aid;
      const a = activities.find(x => x.id === aid);
      const s = a.ft_creneaux.find(x => x.id === id);
      if (!confirm('Valider cette date ? Les ' + s.ft_votes.length + ' personne(s) dispo seront inscrites automatiquement.')) { b.disabled = false; return; }
      await api('/ft_activites?id=eq.' + aid, {method: 'PATCH', body: JSON.stringify({date: s.date, heure: s.heure, statut: 'fixe'}), headers: {Prefer: 'return=minimal'}});
      for (const v of s.ft_votes) {
        try { await api('/ft_inscriptions', {method: 'POST', body: JSON.stringify({activite_id: aid, prenom: v.prenom}), headers: {Prefer: 'return=minimal'}}); } catch (e) {}
      }
      await api('/ft_creneaux?activite_id=eq.' + aid, {method: 'DELETE'});
      toast('Date validée 🎉');
    } else if (act === 'del') {
      scheduleDelete(id);
      return;
    }
  } catch (err) {
    if (err.status !== 409) toast('Oups, ça n’a pas marché. Réessaie.');
  }
  load();
});
