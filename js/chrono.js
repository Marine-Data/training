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
  if (!chrono) { box.className = 'runtimer'; box.innerHTML = `<span class="tlabel">Touche ⏱ sur un exercice pour lancer sa récup</span><span class="tbig">–:––</span>
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

/* Écran de séance */
function demarrerSeance(s) {
  run = {s, items: (s.blocs || []).flatMap(b => (b.ex || []).map(x => ({bloc: b.titre, x, done: false})))};
  $('runTitre').textContent = s.titre;
  renderRun();
  majChrono();
  $('runDlg').showModal();
  garderEcranAllume();
}
function renderRun() {
  const faits = run.items.filter(i => i.done).length;
  $('runProg').textContent = faits + ' / ' + run.items.length;
  $('runBar').style.width = (run.items.length ? faits / run.items.length * 100 : 0) + '%';
  let bloc = null;
  $('runList').innerHTML = run.items.map((it, i) => {
    const head = it.bloc !== bloc ? `<h3>${esc(bloc = it.bloc || 'Bloc')}</h3>` : '';
    const d = dureeEx(it.x), r = recupDe(it.x);
    return head + `<div class="runex${it.done ? ' done' : ''}">
      <label><input type="checkbox" data-i="${i}"${it.done ? ' checked' : ''}><span><b>${esc(it.x.dose || '')}</b> ${esc(it.x.nom)}${it.x.note ? `<small>${esc(it.x.note)}</small>` : ''}${typeof allureExHtml === 'function' ? allureExHtml(it.x) : ''}</span></label>
      ${d || r ? `<div class="runbtns">${d ? `<button type="button" class="btn small" data-run="ex" data-s="${d}" data-l="${esc(it.x.nom)}">▶ ${mmss(d)}</button>` : ''}${r ? `<button type="button" class="btn small" data-run="recup" data-s="${r}">⏱ Récup ${mmss(r)}</button>` : ''}</div>` : ''}
    </div>`;
  }).join('');
  $('runFin').textContent = faits === run.items.length && faits ? '✓ Séance terminée, je l’enregistre' : '✓ J’ai fini la séance';
}
$('runList').addEventListener('change', e => {
  const c = e.target.closest('[data-i]'); if (!c) return;
  run.items[+c.dataset.i].done = c.checked; renderRun();
});
$('runDlg').addEventListener('click', e => {
  const b = e.target.closest('[data-run]'); if (!b) return;
  const a = b.dataset.run;
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
