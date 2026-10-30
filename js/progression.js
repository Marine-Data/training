// Favoris (sur ce téléphone), séances faites et hexagone de progression.

/* Favoris */
let favoris = new Set();
try { favoris = new Set(JSON.parse(localStorage.getItem('ft_favoris') || '[]')); } catch (e) {}
function toggleFavori(id) {
  favoris.has(id) ? favoris.delete(id) : favoris.add(id);
  try { localStorage.setItem('ft_favoris', JSON.stringify([...favoris])); } catch (e) {}
  return favoris.has(id);
}

/* Séances faites : enregistrées dans la base, avec le sport et le titre au moment où on la fait */
let realisations = [];
async function loadRealisations() {
  if (!me) { realisations = []; return; }
  try {
    realisations = await api('/ft_realisations?select=*&prenom=ilike.' + encodeURIComponent(me.replace(/[*,()]/g, '')) + '&order=fait_le.desc,created_at.desc&limit=300');
  } catch (e) { /* hors ligne : on garde l'historique déjà chargé */ }
}
async function marquerFaite(s, details) {
  if (!(await ensureName())) return false;
  try {
    await api('/ft_realisations', {method: 'POST', body: JSON.stringify({seance_id: s.id, sport: s.sport, titre: s.titre.slice(0, 120), prenom: me, ...(details && details.exos.length ? {details} : {})}), headers: {Prefer: 'return=minimal'}});
    toast('Bravo, c’est noté 💪');
    if (typeof loadDefi === 'function') loadDefi();
    await loadRealisations();
    if (seFilter === 'Tous') renderSeances();
    return true;
  } catch (e) { toast('Impossible d’enregistrer pour le moment. Réessaie.'); return false; }
}
async function supprimerRealisation(id) {
  try { await api('/ft_realisations?id=eq.' + id, {method: 'DELETE'}); } catch (e) { toast('Suppression impossible, réessaie.'); }
  await loadRealisations(); renderSeances();
}

/* Hexagone : séances faites ces 30 derniers jours, une branche par famille de sport */
const AXES = ['Tricking', 'Running', 'Natation', 'Renfo', 'Street workout', 'Gym et yoga'];
const axeDe = sport => AXES.includes(sport) ? sport : 'Gym et yoga';
function hexagoneSvg(counts) {
  const max = Math.max(4, ...Object.values(counts));
  const cx = 150, cy = 128, R = 88;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const poly = r => AXES.map((_, i) => pt(i, r).map(v => v.toFixed(1)).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map(k => `<polygon points="${poly(R * k)}" class="ring"/>`).join('');
  const spokes = AXES.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="ring"/>`; }).join('');
  const vals = AXES.map((a, i) => pt(i, R * (counts[a] || 0) / max));
  const shape = `<polygon points="${vals.map(v => v.map(n => n.toFixed(1)).join(',')).join(' ')}" class="val"/>`;
  const dots = vals.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="dot"/>`).join('');
  const labels = AXES.map((a, i) => {
    const [x, y] = pt(i, R + 16), anc = i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end';
    return `<text x="${x.toFixed(1)}" y="${(y + (i === 0 ? -2 : i === 3 ? 12 : 4)).toFixed(1)}" text-anchor="${anc}" class="lab">${esc(a)} · ${counts[a] || 0}</text>`;
  }).join('');
  return `<svg viewBox="-50 0 400 262" role="img" aria-label="Séances faites ces 30 derniers jours, par sport">${rings}${spokes}${shape}${dots}${labels}</svg>`;
}
function progressionHtml() {
  if (!me || !realisations.length) return '';
  const depuis = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const mois = realisations.filter(r => r.fait_le >= depuis);
  const counts = {};
  mois.forEach(r => { const a = axeDe(r.sport); counts[a] = (counts[a] || 0) + 1; });
  const dates = r => new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: 'short'}).format(new Date(r.fait_le + 'T12:00:00'));
  return `<section class="progress">
    <h3>Ma progression</h3>
    <p class="meta">${mois.length} séance${mois.length > 1 ? 's' : ''} ces 30 derniers jours</p>
    <div class="hex">${hexagoneSvg(counts)}</div>
    ${chargesHtml()}
    <details class="histo"><summary>Mes dernières séances</summary><ul>${realisations.slice(0, 15).map(r =>
      `<li><span>${esc(dates(r))}</span><b>${esc(r.titre)}</b><button type="button" class="xdel" data-real="${r.id}" aria-label="Retirer de mon historique">✕</button></li>`).join('')}</ul></details>
  </section>`;
}
function favorisHtml() {
  const favs = seances.filter(s => favoris.has(s.id));
  if (!favs.length) return '';
  return `<section class="favs"><h3>⭐ Mes favoris</h3>${favs.map(s => `<button type="button" class="disc se" data-id="${s.id}">
      <span class="emo" aria-hidden="true">${sportOf(s.sport).emo}</span>
      <span class="dtxt"><b>${esc(s.titre)}</b><small>${esc(s.sport)}${s.duree ? ' · ' + s.duree + ' min' : ''}</small></span>
      <span class="go" aria-hidden="true">→</span></button>`).join('')}</section>`;
}

/* Mes charges : dernier poids et courbe pour chaque exercice noté en mode séance */
function chargesHtml() {
  if (typeof histoEx !== 'function') return '';
  const noms = new Map();
  Object.values(lireHistoLocal()).forEach(l => l.forEach(e => { if (e.n && !noms.has(cleEx(e.n))) noms.set(cleEx(e.n), e.n); }));
  realisations.forEach(r => ((r.details && r.details.exos) || []).forEach(x => { if (!noms.has(cleEx(x.nom))) noms.set(cleEx(x.nom), x.nom); }));
  const lignes = [...noms.values()].map(n => [n, histoEx(n)]).filter(([, h]) => h.some(e => isFinite(kgMax(e))));
  if (!lignes.length) return '';
  return `<details class="histo charges"><summary>Mes charges</summary><ul>${lignes.map(([n, h]) => {
    const e = h.find(e => isFinite(kgMax(e)));
    return `<li><b>${esc(n)}</b><span>${fmtKg(kgMax(e))} kg · ${esc(ilYa(e.d))}</span>${courbe(h)}</li>`;
  }).join('')}</ul></details>`;
}
