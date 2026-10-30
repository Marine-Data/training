// Mode séance : on coche les exercices, on lance les récups et les exercices chronométrés.
// L'écran reste allumé pendant la séance quand le téléphone l'accepte.

let run = null;      // {s, items: [{bloc, x, done}]}
let tick = null;     // intervalle du chrono
let chrono = null;   // {mode: 'down'|'up', fin, debut, label, total}
let wakeLock = null;
let audio = null;

/* Lire une durée dans un texte : « 1 min 30 » → 90, « 45 s » → 45, « 2 min » → 120 */
function lireDuree(txt) {
  const t = String(txt || '');
  let m = t.match(/(\d+)\s*min(?:utes?)?(?:\s*(\d+)\s*(?:s|sec|secondes)?\b)?/i);
  const m2 = t.match(/(\d+)\s*(?:s|sec|secondes)\b/i);
  if (m && (!m2 || m.index <= m2.index)) return +m[1] * 60 + (m[2] ? +m[2] : 0);
  return m2 ? +m2[1] : null;
}
// Récup indiquée dans la consigne : « Récup 1 min 30 », « récup 45 s ».
function recupDe(x) {
  const m = String(x.note || '').match(/r[ée]cup[^.]*/i);
  return m ? lireDuree(m[0]) : null;
}
// Exercice chronométré : quantité en temps, « 30 s », « 3 × 20 s », « 5 min ».
function dureeEx(x) {
  const m = String(x.dose || '').match(/^(?:\d+\s*×\s*)?(\d+)\s*(s|min)\b/i);
  return m ? +m[1] * (m[2].toLowerCase() === 'min' ? 60 : 1) : null;
}
const mmss = s => Math.floor(s / 60) + ':' + String(Math.max(0, Math.floor(s % 60))).padStart(2, '0');

async function garderEcranAllume() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (run && !document.hidden) garderEcranAllume(); });

function bip() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(d => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.25, audio.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + d + 0.2);
      o.start(audio.currentTime + d); o.stop(audio.currentTime + d + 0.2);
    });
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) {}
}

/* Chrono : compte à rebours (récup, exercice) ou chrono libre */
function lancerChrono(mode, secondes, label, quandFini) {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {}
  clearInterval(tick);
  chrono = mode === 'down' ? {mode, fin: Date.now() + secondes * 1000, total: secondes, label, quandFini} : {mode, debut: Date.now(), label};
  majChrono();
  tick = setInterval(majChrono, 250);
}
function arreterChrono() { clearInterval(tick); tick = null; chrono = null; majChrono(); }
function majChrono() {
  const box = $('runTimer');
  if (!chrono) { box.className = 'runtimer'; box.innerHTML = `<span class="tlabel">La récup se lance quand tu touches « Fait »</span><span class="tbig">–:––</span>
      <button type="button" class="btn small" data-run="libre">⏱ Chrono libre</button>`; return; }
  if (chrono.mode === 'down') {
    const reste = Math.max(0, (chrono.fin - Date.now()) / 1000);
    box.className = 'runtimer on' + (reste <= 3 ? ' fin' : '');
    box.innerHTML = `<span class="tlabel">${esc(chrono.label)}</span><span class="tbig">${mmss(Math.ceil(reste))}</span>
      <span class="tbtns"><button type="button" class="btn small" data-run="moins15" aria-label="Enlever 15 secondes">−15 s</button><button type="button" class="btn small" data-run="plus15" aria-label="Ajouter 15 secondes">+15 s</button><button type="button" class="btn small" data-run="stop" aria-label="Arrêter">✕</button></span>`;
    if (reste <= 0) {
      const cb = chrono.quandFini;
      clearInterval(tick); tick = null; bip(); chrono = null;
      if (cb) { cb(); return; }   // fin d'un exercice chronométré : la série est validée et la récup démarre
      setTimeout(majChrono, 1500); box.querySelector('.tlabel').textContent = 'C’est reparti !';
    }
  } else {
    const ecoule = (Date.now() - chrono.debut) / 1000;
    box.className = 'runtimer on';
    box.innerHTML = `<span class="tlabel">${esc(chrono.label)}</span><span class="tbig">${mmss(ecoule)}</span>
      <button type="button" class="btn small" data-run="stop">Arrêter</button>`;
  }
}


/* ---------- Outils : doses, reps, poids ---------- */
// « 4 × 10 » → 4 séries de « 10 » ; « 30 s » → 1 série de « 30 s ».
function lireDose(dose) {
  const m = String(dose || '').match(/^\s*(\d+)\s*[×x*]\s*(.+)$/i);
  return m ? {series: +m[1], reps: m[2].trim()} : {series: 1, reps: String(dose || '').trim()};
}
const estTemps = reps => /^\d+\s*(s|min)\b/i.test(reps);
const nombre = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };
const fmtKg = n => String(Math.round(n * 100) / 100).replace('.', ',');
const cleEx = nom => String(nom || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const doseTxt = it => (it.series > 1 ? it.series + ' × ' : '') + it.reps;
const complet = it => it.sets.length >= it.series;
const traite = it => complet(it) || it.passe;
// Récup choisie pour chaque exercice : gardée sur ce téléphone pour les prochaines fois.
const RECUPS_KEY = 'ft_recups';
function lireRecups() { try { return JSON.parse(localStorage.getItem(RECUPS_KEY) || '{}'); } catch (e) { return {}; } }
function garderRecup(it) {
  const r = lireRecups(); r[cleEx(it.x.nom)] = it.recup;
  try { localStorage.setItem(RECUPS_KEY, JSON.stringify(r)); } catch (e) {}
}
const RESSENTIS = [['facile', 'Facile'], ['ok', 'OK'], ['dur', 'Dur'], ['douleur', 'Douleur']];

/* ---------- Historique des charges : sur ce téléphone et dans la base (avec la séance faite) ---------- */
const HISTO_KEY = 'ft_historique';
function lireHistoLocal() { try { return JSON.parse(localStorage.getItem(HISTO_KEY) || '{}'); } catch (e) { return {}; } }
// Toutes les fois où on a fait cet exercice, de la plus récente à la plus ancienne : [{d, s: [[reps, kg]], r}]
function histoEx(nom) {
  const k = cleEx(nom), vus = new Set(), out = [];
  const ajoute = e => { const id = e.d + JSON.stringify(e.s); if (!vus.has(id)) { vus.add(id); out.push(e); } };
  (lireHistoLocal()[k] || []).forEach(ajoute);
  (typeof realisations !== 'undefined' ? realisations : []).forEach(r => ((r.details && r.details.exos) || [])
    .filter(x => cleEx(x.nom) === k).forEach(x => ajoute({d: r.fait_le, s: x.s || [], r: x.r || '', rc: x.rc})));
  return out.sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
}
const kgMax = e => Math.max(-Infinity, ...e.s.map(([, kg]) => nombre(kg)).filter(n => n !== null));
function resumeSets(sets) {
  if (!sets.length) return '';
  const same = sets.every(([r, k]) => r === sets[0][0] && k === sets[0][1]);
  const un = ([r, k]) => r + (k ? ' à ' + k + ' kg' : '');
  return same ? (sets.length > 1 ? sets.length + ' × ' : '') + un(sets[0]) : sets.map(un).join(' · ');
}
function ilYa(d) {
  const j = Math.round((new Date(todayStr() + 'T12:00:00') - new Date(d + 'T12:00:00')) / 864e5);
  return j <= 0 ? 'aujourd’hui' : j === 1 ? 'hier' : 'il y a ' + j + ' j';
}
// Petite courbe du poids max, séance après séance.
function courbe(h) {
  const pts = h.slice(0, 8).reverse().map(kgMax).filter(isFinite);
  if (pts.length < 2) return '';
  const min = Math.min(...pts), max = Math.max(...pts), W = 84, Ht = 24, dx = W / (pts.length - 1);
  const y = v => max === min ? Ht / 2 : Ht - 3 - (v - min) / (max - min) * (Ht - 6);
  const P = pts.map((v, i) => (i * dx).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  return `<svg class="courbe" viewBox="-3 0 ${W + 6} ${Ht}" width="${W + 6}" height="${Ht}" role="img" aria-label="Poids max : ${pts.map(fmtKg).join(', ')} kg">
    <polyline points="${P}"/><circle cx="${((pts.length - 1) * dx).toFixed(1)}" cy="${y(pts[pts.length - 1]).toFixed(1)}" r="3"/></svg>`;
}
// Repère « la dernière fois » + conseil de charge.
function derniereFoisHtml(it) {
  const h = histoEx(it.x.nom); if (!h.length) return '';
  const e = h[0], km = kgMax(e), cible = nombre(it.reps);
  let conseil = '';
  if (e.r === 'douleur') conseil = `<span class="alerte">Tu avais signalé une douleur : vas-y doucement.</span>`;
  else if (isFinite(km) && cible !== null && !estTemps(it.reps) && e.s.length >= it.series && e.r !== 'dur'
    && e.s.every(([r]) => (nombre(r) ?? 0) >= cible)) {
    const nv = fmtKg(km + (km < 10 ? 1 : 2.5));
    if (nombre(it.kg) === null || nombre(it.kg) <= km) conseil = `<button type="button" class="lien" data-run="prendre" data-kg="${nv}">Tout réussi : essayer ${nv} kg ?</button>`;
  }
  return `<div class="dfois"><span>Dernière fois (${ilYa(e.d)}) : <b>${esc(resumeSets(e.s))}</b>${e.r ? ' · ' + esc((RESSENTIS.find(r => r[0] === e.r) || [, ''])[1]) : ''}</span>${courbe(h)}${conseil}</div>`;
}

/* ---------- Séance en cours : gardée sur ce téléphone pour quitter et reprendre (12 h max) ---------- */
const RUN_KEY = 'ft_seance_en_cours2';
function sauverRun() {
  if (!run) return;
  try { localStorage.setItem(RUN_KEY, JSON.stringify({id: run.s.id, t: Date.now(), cur: run.cur,
    items: run.items.map(i => ({p: i.passe, n: i.series, r: i.reps, k: i.kg, s: i.sets, f: i.ressenti, rc: i.recup}))})); } catch (e) {}
}
function oublierRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} }
function lireRun(s, L) {
  try {
    const r = JSON.parse(localStorage.getItem(RUN_KEY) || 'null');
    if (r && r.id === s.id && Date.now() - r.t < 12 * 3600e3 && r.items.length === L) return r;
  } catch (e) {}
  return null;
}

/* ---------- Écran de séance ---------- */
// Toute la séance reste visible ; l'exercice en cours est mis en avant. On valide série par série.
function demarrerSeance(s) {
  const recups = lireRecups();
  run = {s, cur: 0, recap: false, items: (s.blocs || []).flatMap(b => (b.ex || []).map(x => {
    const d = lireDose(x.dose), h = histoEx(x.nom), km = h.length ? kgMax(h[0]) : -Infinity;
    const rc = recups[cleEx(x.nom)] ?? (h.find(e => e.rc != null) || {}).rc ?? recupDe(x) ?? 0;
    return {bloc: b.titre, x, passe: false, series: d.series, reps: d.reps, kg: isFinite(km) ? fmtKg(km) : '', sets: [], ressenti: '', recup: rc};
  }))};
  const prec = lireRun(s, run.items.length);
  if (prec && prec.items.some(i => i.p || (i.s || []).length)) {
    prec.items.forEach((i, k) => Object.assign(run.items[k], {passe: !!i.p, series: i.n || 1, reps: i.r ?? '', kg: i.k ?? '', sets: i.s || [], ressenti: i.f || '', ...(i.rc != null ? {recup: i.rc} : {})}));
    run.cur = Math.min(prec.cur || 0, run.items.length - 1);
    run.repris = true;
  } else oublierRun();
  $('runTitre').textContent = s.titre;
  renderRun();
  majChrono();
  $('runDlg').showModal();
  garderEcranAllume();
}
// Exercice suivant à faire : après celui-ci d'abord, puis ceux restés en arrière.
function suivant(depuis) {
  const L = run.items.length;
  for (let k = 1; k <= L; k++) { const i = (depuis + k) % L; if (!traite(run.items[i])) return i; }
  return -1;
}
function stepper(f, label, val, extra) {
  return `<div class="stp"><span class="stl">${label}</span><div class="stc">
    <button type="button" class="btn small" data-run="pas" data-f="${f}" data-d="-1" aria-label="${label} moins">−</button>
    ${f === 'series' || f === 'recup' ? `<b class="stv">${esc(val)}</b>` : `<input type="text" ${f === 'kg' ? 'inputmode="decimal" placeholder="–"' : ''} data-f="${f}" value="${esc(val)}" aria-label="${label}" autocomplete="off">`}
    <button type="button" class="btn small" data-run="pas" data-f="${f}" data-d="1" aria-label="${label} plus">+</button>${extra || ''}</div></div>`;
}
function carteActive(it) {
  const tps = estTemps(it.reps), d = dureeEx({dose: it.reps}), r = it.recup;
  const k = Math.min(it.sets.length + 1, it.series), fini = complet(it);
  const dots = Array.from({length: it.series}, (_, i) => `<i class="${i < it.sets.length ? 'ok' : i === it.sets.length ? 'now' : ''}"></i>`).join('');
  const journal = it.sets.length ? `<small class="journal">${it.sets.map(([rp, kg], i) => `S${i + 1} : ${esc(rp)}${kg ? ' × ' + esc(kg) + ' kg' : ''}`).join(' · ')}</small>` : '';
  const prochain = suivant(run.cur);
  return `<div class="runseries"><span class="dots" aria-hidden="true">${dots}</span><b>${fini ? 'Exercice terminé' : 'Série ' + k + ' / ' + it.series}</b></div>
    ${journal}
    <div class="steppers">
      ${stepper('reps', tps ? 'Durée' : 'Reps', it.reps)}
      ${tps ? '' : stepper('kg', 'Poids (kg)', it.kg)}
      ${stepper('series', 'Séries', it.series)}
      ${stepper('recup', 'Récup', it.recup ? mmss(it.recup) : 'Aucune')}
    </div>
    ${it.reps !== lireDose(it.x.dose).reps || it.series !== lireDose(it.x.dose).series ? `<small class="prevu">Prévu : ${esc(it.x.dose || '—')} <button type="button" class="lien" data-run="prevu">remettre</button></small>` : ''}
    ${derniereFoisHtml(it)}
    ${fini ? `<div class="ressenti"><span>Comment c’était ?</span><div>${RESSENTIS.map(([v, l]) => `<button type="button" class="btn small" data-run="ressenti" data-v="${v}" aria-pressed="${it.ressenti === v}">${l}</button>`).join('')}</div></div>` : ''}
    <div class="runbtns">
      ${fini ? `<button type="button" class="btn primary" data-run="suivant">${prochain >= 0 ? 'Exercice suivant →' : 'Voir le récap →'}</button>`
        : `<button type="button" class="btn primary" data-run="serie">✓ Série ${k} faite</button>`}
      ${d && !fini ? `<button type="button" class="btn small" data-run="ex" data-s="${d}" data-l="${esc(it.x.nom)}">▶ ${mmss(d)}</button>` : ''}
      ${r ? `<button type="button" class="btn small" data-run="recup" data-s="${r}">⏱ Récup ${mmss(r)}</button>` : ''}
      ${fini ? `<button type="button" class="btn small" data-run="plusserie">＋ Une série de plus</button>` : ''}
      ${it.sets.length ? `<button type="button" class="btn small" data-run="annulerserie">↶ Annuler la série ${it.sets.length}</button>` : ''}
      ${it.sets.length || it.passe ? `<button type="button" class="btn small" data-run="annuler">Remettre à faire</button>` : `<button type="button" class="btn small" data-run="passer">↷ Passer</button>`}
    </div>`;
}
function renderRun() {
  const faits = run.items.filter(complet).length, passes = run.items.filter(i => i.passe).length;
  const avance = run.items.reduce((a, i) => a + (i.passe ? 1 : Math.min(i.sets.length / i.series, 1)), 0);
  $('runProg').textContent = faits + ' / ' + run.items.length + (passes ? ' · ' + passes + ' passé' + (passes > 1 ? 's' : '') : '');
  $('runBar').style.width = (run.items.length ? avance / run.items.length * 100 : 0) + '%';
  $('runClose').textContent = run.recap ? '← Retour' : 'Quitter';
  $('runFin').textContent = run.recap ? '✓ Enregistrer la séance' : '✓ J’ai fini la séance';
  $('runFin').classList.toggle('pulse', run.recap || (run.items.every(traite) && faits > 0));
  if (run.recap) { $('runList').innerHTML = recapHtml(); sauverRun(); return; }
  let bloc = null;
  $('runList').innerHTML = (run.repris ? `<p class="repris">Séance reprise là où tu en étais. <button type="button" class="lien" data-run="zero">Recommencer à zéro</button></p>` : '') + run.items.map((it, i) => {
    const head = it.bloc !== bloc ? `<h3>${esc(bloc = it.bloc || 'Bloc')}</h3>` : '';
    const actif = i === run.cur;
    const etat = complet(it) ? '✓' : it.passe ? '↷' : it.sets.length ? it.sets.length + '/' + it.series : '';
    return head + `<div class="runex${actif ? ' cur' : ''}${complet(it) ? ' done' : ''}${it.passe ? ' skip' : ''}" data-sel="${i}">
      <div class="rline"><span class="retat" aria-hidden="true">${etat}</span>
        <span class="rtxt"><b>${esc(doseTxt(it))}</b> ${esc(it.x.nom)}<span class="rkg">${it.kg && !estTemps(it.reps) ? ' · ' + esc(it.kg) + ' kg' : ''}</span>
        ${actif && it.x.note ? `<small>${esc(it.x.note)}</small>` : ''}${actif && typeof allureExHtml === 'function' ? allureExHtml(it.x) : ''}</span></div>
      ${actif ? carteActive(it) : ''}
    </div>`;
  }).join('');
  sauverRun();
}

/* ---------- Récap de fin de séance ---------- */
function bilan() {
  let series = 0, volume = 0;
  const records = [], durs = [];
  run.items.forEach(it => {
    series += it.sets.length;
    it.sets.forEach(([r, k]) => { const nr = nombre(r), nk = nombre(k); if (nr !== null && nk !== null && !estTemps(r)) volume += nr * nk; });
    if (it.sets.length) {
      const avant = histoEx(it.x.nom).map(kgMax).filter(isFinite), now = kgMax({s: it.sets});
      if (isFinite(now) && avant.length && now > Math.max(...avant)) records.push([it.x.nom, now, Math.max(...avant)]);
    }
    if (it.ressenti === 'dur' || it.ressenti === 'douleur') durs.push(it);
  });
  return {series, volume, records, durs};
}
function recapHtml() {
  const b = bilan(), faits = run.items.filter(complet).length, partiels = run.items.filter(i => i.sets.length && !complet(i));
  const passes = run.items.filter(i => i.passe || (!i.sets.length && !complet(i)));
  return `<section class="recap"><h3>Récap de la séance</h3>
    <div class="stats">
      <div><b>${faits}/${run.items.length}</b><span>exercices</span></div>
      <div><b>${b.series}</b><span>séries</span></div>
      <div><b>${b.volume ? fmtKg(Math.round(b.volume)) : '–'}</b><span>kg soulevés</span></div>
    </div>
    ${b.records.length ? `<h4>🏆 Nouveaux records</h4><ul>${b.records.map(([n, k, a]) => `<li><b>${esc(n)}</b> : ${fmtKg(k)} kg <small>(avant ${fmtKg(a)})</small></li>`).join('')}</ul>` : ''}
    ${b.durs.length ? `<h4>À surveiller</h4><ul>${b.durs.map(i => `<li><b>${esc(i.x.nom)}</b> : ${i.ressenti === 'douleur' ? 'douleur' : 'dur'}</li>`).join('')}</ul>` : ''}
    ${partiels.length ? `<h4>Pas terminés</h4><ul>${partiels.map(i => `<li>${esc(i.x.nom)} <small>(${i.sets.length}/${i.series} séries)</small></li>`).join('')}</ul>` : ''}
    ${passes.length ? `<h4>Passés ou pas faits</h4><p class="meta">${passes.map(i => esc(i.x.nom)).join(' · ')}</p>` : ''}
    <p class="meta">Tes charges sont enregistrées avec la séance : tu les retrouveras la prochaine fois, sur n’importe quel téléphone.</p>
  </section>`;
}
function detailsSeance() {
  return {exos: run.items.filter(i => i.sets.length).map(i => ({nom: i.x.nom.slice(0, 80), s: i.sets.slice(0, 20), r: i.ressenti, c: doseTxt(i).slice(0, 30), rc: i.recup}))};
}
function garderHistoLocal() {
  const h = lireHistoLocal(), d = todayStr();
  run.items.filter(i => i.sets.length).forEach(i => {
    const k = cleEx(i.x.nom);
    h[k] = [{d, s: i.sets, r: i.ressenti, n: i.x.nom}, ...(h[k] || []).filter(e => e.d !== d)].slice(0, 15);
  });
  try { localStorage.setItem(HISTO_KEY, JSON.stringify(h)); } catch (e) {}
}

/* ---------- Actions ---------- */
function allerA(i) {
  run.cur = i; renderRun();
  const el = $('runList').querySelector('.runex.cur');
  if (el) el.scrollIntoView({block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}
function avancer() { const nx = suivant(run.cur); if (nx >= 0) allerA(nx); else { run.recap = true; renderRun(); $('runDlg').scrollTop = 0; } }
// Toucher un exercice le met en avant (on fait dans l'ordre qu'on veut).
$('runList').addEventListener('click', e => {
  if (e.target.closest('button, input, label')) return;
  const el = e.target.closest('[data-sel]'); if (el && +el.dataset.sel !== run.cur) allerA(+el.dataset.sel);
});
// Saisie au clavier des reps ou du poids : enregistrée tout de suite, sans redessiner l'écran.
$('runList').addEventListener('input', e => {
  const f = e.target.dataset.f; if (!f || !run) return;
  const it = run.items[run.cur];
  if (f === 'kg') { const v = e.target.value.replace(/[^\d.,]/g, '').replace('.', ','); if (v !== e.target.value) e.target.value = v; it.kg = v; }
  else it.reps = e.target.value;
  const ex = e.target.closest('.runex');
  ex.querySelector('.rtxt>b').textContent = doseTxt(it);
  ex.querySelector('.rkg').textContent = it.kg && !estTemps(it.reps) ? ' · ' + it.kg + ' kg' : '';
  sauverRun();
});
$('runList').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.f) e.target.blur(); });
function pas(it, f, d) {
  if (f === 'recup') { it.recup = Math.max(0, Math.min(600, (it.recup || 0) + d * 15)); return; }
  if (f === 'series') it.series = Math.max(Math.max(1, it.sets.length), Math.min(20, it.series + d));
  else if (f === 'kg') {
    const n = nombre(it.kg);
    if (n === null) { it.kg = d > 0 ? '5' : ''; return; }
    const nv = n + d * ((d > 0 ? n < 10 : n <= 10) ? 1 : 2.5);
    it.kg = nv <= 0 ? '' : fmtKg(nv);
  }
  else {
    const m = String(it.reps).match(/^(\d+)(.*)$/); if (!m) return;
    const st = estTemps(it.reps) && /s/i.test(m[2]) ? 5 : 1;
    it.reps = Math.max(st, +m[1] + d * st) + m[2];
  }
}
function action(a, b) {
  const it = run.items[run.cur], r = it.recup;
  if (a === 'serie') {
    it.sets.push([String(it.reps).trim(), estTemps(it.reps) ? '' : it.kg]); it.passe = false;
    if (r) {
      const nx = complet(it) ? suivant(run.cur) : -1;
      lancerChrono('down', r, complet(it) ? (nx >= 0 ? 'Récup · ensuite : ' + run.items[nx].x.nom : 'Récup · dernier exercice fait') : 'Récup · série ' + (it.sets.length + 1));
    }
    renderRun();
  } else if (a === 'plusserie') { it.series++; renderRun(); }
  else if (a === 'annulerserie') { it.sets.pop(); renderRun(); }
  else if (a === 'ressenti') { it.ressenti = it.ressenti === b.dataset.v ? '' : b.dataset.v; avancer(); }
  else if (a === 'suivant') avancer();
  else if (a === 'passer') { it.passe = true; avancer(); }
  else if (a === 'annuler') { it.sets = []; it.passe = false; it.ressenti = ''; renderRun(); }
  else if (a === 'pas') { pas(it, b.dataset.f, +b.dataset.d); if (b.dataset.f === 'recup') { garderRecup(it); if (chrono && chrono.mode === 'down' && /^Récup/.test(chrono.label)) { chrono.fin += +b.dataset.d * 15000; majChrono(); } } renderRun(); }
  else if (a === 'prendre') { it.kg = b.dataset.kg; renderRun(); }
  else if (a === 'prevu') { const d = lireDose(it.x.dose); it.series = Math.max(d.series, it.sets.length); it.reps = d.reps; renderRun(); }
}
$('runDlg').addEventListener('click', e => {
  const b = e.target.closest('[data-run]'); if (!b || !run) return;
  const a = b.dataset.run;
  if (a === 'zero') { run.items.forEach(i => { i.sets = []; i.passe = false; i.ressenti = ''; }); run.cur = 0; run.repris = false; renderRun(); return; }
  if (a === 'ex') {
    // Exercice en temps : à la fin du compte à rebours, la série est validée toute seule.
    const idx = run.cur;
    lancerChrono('down', +b.dataset.s, b.dataset.l + ' · série ' + (run.items[idx].sets.length + 1), () => {
      if (run && run.cur === idx && !complet(run.items[idx])) action('serie'); else majChrono();
    });
  }
  else if (a === 'recup') lancerChrono('down', +b.dataset.s, 'Récup');
  else if (a === 'libre') lancerChrono('up', 0, 'Chrono libre');
  else if (a === 'stop') arreterChrono();
  else if (a === 'plus15' || a === 'moins15') { if (chrono && chrono.mode === 'down') { chrono.fin += (a === 'plus15' ? 15 : -15) * 1000; majChrono(); } }
  else if (b.closest('#runList')) action(a, b);
});
$('runFin').onclick = async () => {
  if (!run) return;
  if (!run.recap) { run.recap = true; renderRun(); $('runDlg').scrollTop = 0; return; }
  garderHistoLocal();
  if (await marquerFaite(run.s, detailsSeance())) { oublierRun(); $('runDlg').close(); }
};
$('runClose').onclick = () => {
  if (run && run.recap) { run.recap = false; renderRun(); return; }
  sauverRun(); $('runDlg').close();
};
$('runDlg').addEventListener('cancel', e => { if (run && run.recap) { e.preventDefault(); run.recap = false; renderRun(); } });
$('runDlg').addEventListener('close', () => {
  clearInterval(tick); tick = null; chrono = null; run = null;
  try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null;
});
