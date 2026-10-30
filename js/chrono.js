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
// Reps et poids notés pendant la séance : gardés sur ce téléphone, par exercice, pour la prochaine fois.
const CHARGES_KEY = 'ft_charges';
const cleEx = nom => String(nom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
function lireCharges() { try { return JSON.parse(localStorage.getItem(CHARGES_KEY) || '{}'); } catch (e) { return {}; } }
function garderCharge(it) {
  const c = lireCharges(), k = cleEx(it.x.nom), v = {};
  if (it.dose !== (it.x.dose || '')) v.dose = it.dose;
  if (it.kg) v.kg = it.kg;
  if (Object.keys(v).length) c[k] = v; else delete c[k];
  try { localStorage.setItem(CHARGES_KEY, JSON.stringify(c)); } catch (e) {}
}
const doseDe = it => it.dose;
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
function lancerChrono(mode, secondes, label) {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {}
  clearInterval(tick);
  chrono = mode === 'down' ? {mode, fin: Date.now() + secondes * 1000, total: secondes, label} : {mode, debut: Date.now(), label};
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
      <button type="button" class="btn small" data-run="stop">Arrêter</button>`;
    if (reste <= 0) { clearInterval(tick); tick = null; bip(); chrono = null; setTimeout(majChrono, 1500); box.querySelector('.tlabel').textContent = 'C’est reparti !'; }
  } else {
    const ecoule = (Date.now() - chrono.debut) / 1000;
    box.className = 'runtimer on';
    box.innerHTML = `<span class="tlabel">${esc(chrono.label)}</span><span class="tbig">${mmss(ecoule)}</span>
      <button type="button" class="btn small" data-run="stop">Arrêter</button>`;
  }
}

/* Écran de séance : toute la séance reste visible ; l'exercice en cours est mis en avant.
   On peut le faire (la récup se lance seule), le refaire, le passer, ou toucher n'importe quel autre exercice. */
function demarrerSeance(s) {
  const charges = lireCharges();
  run = {s, cur: 0, items: (s.blocs || []).flatMap(b => (b.ex || []).map(x => {
    const g = charges[cleEx(x.nom)] || {};
    return {bloc: b.titre, x, n: 0, passe: false, dose: g.dose || x.dose || '', kg: g.kg || ''};
  }))};
  $('runTitre').textContent = s.titre;
  renderRun();
  majChrono();
  $('runDlg').showModal();
  garderEcranAllume();
}
const traite = it => it.n > 0 || it.passe;
// Exercice suivant à faire : après celui-ci d'abord, puis ceux restés en arrière.
function suivant(depuis) {
  const L = run.items.length;
  for (let k = 1; k <= L; k++) { const i = (depuis + k) % L; if (!traite(run.items[i])) return i; }
  return -1;
}
function renderRun() {
  const faits = run.items.filter(i => i.n > 0).length, passes = run.items.filter(i => i.passe).length;
  $('runProg').textContent = faits + ' / ' + run.items.length + (passes ? ' · ' + passes + ' passé' + (passes > 1 ? 's' : '') : '');
  $('runBar').style.width = (run.items.length ? (faits + passes) / run.items.length * 100 : 0) + '%';
  let bloc = null;
  $('runList').innerHTML = run.items.map((it, i) => {
    const head = it.bloc !== bloc ? `<h3>${esc(bloc = it.bloc || 'Bloc')}</h3>` : '';
    const d = dureeEx({dose: doseDe(it)}), r = recupDe(it.x), actif = i === run.cur;
    const etat = it.n > 1 ? '✓ ×' + it.n : it.n ? '✓' : it.passe ? '↷' : '';
    return head + `<div class="runex${actif ? ' cur' : ''}${it.n ? ' done' : ''}${it.passe ? ' skip' : ''}" data-sel="${i}">
      <div class="rline"><span class="retat" aria-hidden="true">${etat}</span>
        <span class="rtxt"><b>${esc(doseDe(it))}</b> ${esc(it.x.nom)}${it.kg ? ` <span class="rkg">· ${esc(it.kg)} kg</span>` : ''}
        ${actif && it.x.note ? `<small>${esc(it.x.note)}</small>` : ''}${actif && typeof allureExHtml === 'function' ? allureExHtml(it.x) : ''}</span></div>
      ${actif ? `<div class="runedit">
        <label>Séries × reps<input type="text" data-f="dose" value="${esc(it.dose)}" placeholder="4 × 10" autocomplete="off"></label>
        ${d ? '' : `<label>Poids<span class="kgbox"><input type="text" inputmode="decimal" data-f="kg" value="${esc(it.kg)}" placeholder="–" autocomplete="off"><span>kg</span></span></label>`}
        ${it.dose !== (it.x.dose || '') ? `<small class="prevu">Prévu : ${esc(it.x.dose || '—')} <button type="button" class="lien" data-run="prevu">remettre</button></small>` : ''}
      </div>
      <div class="runbtns">
        ${d ? `<button type="button" class="btn small" data-run="ex" data-s="${d}" data-l="${esc(it.x.nom)}">▶ ${mmss(d)}</button>` : ''}
        ${r ? `<button type="button" class="btn small" data-run="recup" data-s="${r}">⏱ Récup ${mmss(r)}</button>` : ''}
        <button type="button" class="btn primary" data-run="fait">✓ Fait</button>
        ${it.n ? `<button type="button" class="btn small" data-run="encore">↻ Encore une fois</button>` : ''}
        ${it.n || it.passe ? `<button type="button" class="btn small" data-run="annuler">Remettre à faire</button>` : `<button type="button" class="btn small" data-run="passer">↷ Passer</button>`}
      </div>` : ''}
    </div>`;
  }).join('');
  const fini = run.items.every(traite);
  $('runFin').textContent = fini && faits ? '✓ Séance terminée, je l’enregistre' : '✓ J’ai fini la séance';
  $('runFin').classList.toggle('pulse', fini && faits > 0);
}
function allerA(i) {
  run.cur = i; renderRun();
  const el = $('runList').querySelector('.runex.cur');
  if (el) el.scrollIntoView({block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}
// Modifier les reps ou le poids de l'exercice en cours : enregistré tout de suite, sans redessiner l'écran.
$('runList').addEventListener('input', e => {
  const f = e.target.dataset.f; if (!f || !run) return;
  const it = run.items[run.cur];
  it[f] = f === 'kg' ? e.target.value.replace(/[^\d.,]/g, '').replace('.', ',') : e.target.value;
  if (f === 'kg' && e.target.value !== it.kg) e.target.value = it.kg;
  garderCharge(it);
  const b = e.target.closest('.runex').querySelector('.rtxt>b'); if (b && f === 'dose') b.textContent = it.dose;
});
$('runList').addEventListener('change', e => { if (e.target.dataset.f && run) renderRun(); });
$('runList').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.f) e.target.blur(); });
// Toucher un exercice le met en avant (on fait dans l'ordre qu'on veut).
$('runList').addEventListener('click', e => {
  if (e.target.closest('button, input, label')) return;
  const el = e.target.closest('[data-sel]'); if (el && +el.dataset.sel !== run.cur) allerA(+el.dataset.sel);
});
function action(a) {
  const it = run.items[run.cur], r = recupDe(it.x);
  if (a === 'fait' || a === 'encore') {
    it.n++; it.passe = false;
    if (r) lancerChrono('down', r, 'Récup');
    if (a === 'fait') { const nx = suivant(run.cur); nx >= 0 ? allerA(nx) : renderRun(); } else renderRun();
  } else if (a === 'passer') { it.passe = true; const nx = suivant(run.cur); nx >= 0 ? allerA(nx) : renderRun(); }
  else if (a === 'annuler') { it.n = 0; it.passe = false; renderRun(); }
}
$('runDlg').addEventListener('click', e => {
  const b = e.target.closest('[data-run]'); if (!b) return;
  const a = b.dataset.run;
  if (['fait', 'encore', 'passer', 'annuler'].includes(a)) { action(a); return; }
  if (a === 'prevu') { const it = run.items[run.cur]; it.dose = it.x.dose || ''; garderCharge(it); renderRun(); return; }
  if (a === 'ex') lancerChrono('down', +b.dataset.s, b.dataset.l);
  else if (a === 'recup') lancerChrono('down', +b.dataset.s, 'Récup');
  else if (a === 'libre') lancerChrono('up', 0, 'Chrono libre');
  else if (a === 'stop') arreterChrono();
});
$('runFin').onclick = async () => { if (run && await marquerFaite(run.s)) $('runDlg').close(); };
$('runClose').onclick = () => $('runDlg').close();
$('runDlg').addEventListener('close', () => {
  clearInterval(tick); tick = null; chrono = null; run = null;
  try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null;
});
