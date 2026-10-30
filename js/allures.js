// Calculateur d'allures : à partir de ta VMA (km/h), le temps à viser sur chaque distance.
// La VMA est gardée sur ce téléphone seulement.

let vma = null;
try { vma = parseFloat(localStorage.getItem('ft_vma')) || null; } catch (e) {}

function setVma(v) {
  vma = v >= 6 && v <= 30 ? Math.round(v * 10) / 10 : null;
  try { vma ? localStorage.setItem('ft_vma', String(vma)) : localStorage.removeItem('ft_vma'); } catch (e) {}
}

// Temps pour courir `m` mètres à `pct` % de la VMA, en secondes.
const secondesPour = (m, pct) => m / (vma * pct / 100 / 3.6);
function fmtTemps(s) {
  s = Math.round(s);
  if (s < 60) return s + ' s';
  return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0');
}

// Pourcentage de VMA indiqué dans un exercice : « 80 à 90 % de la VMA », « 95 % VMA », ou « Allure VMA » (100 %).
function pctVma(x) {
  const txt = (x.nom || '') + ' ' + (x.note || '');
  let m = txt.match(/(\d{2,3})\s*(?:à|-|–)\s*(\d{2,3})\s*%\s*(?:de (?:la |ta )?)?VMA/i);
  if (m) return [+m[1], +m[2]];
  m = txt.match(/(\d{2,3})\s*%\s*(?:de (?:la |ta )?)?VMA/i);
  if (m) return [+m[1]];
  if (/^allure vma/i.test(x.nom || '')) return [100];
  return null;
}
// Distance d'une répétition : « 10 × 400 m » → 400, « 1 000 m » → 1000.
function distanceRep(dose) {
  const m = String(dose || '').match(/(\d[\d\s]*)\s*m$/);
  return m ? parseInt(m[1].replace(/\s/g, ''), 10) : null;
}

// Ligne ajoutée sous un exercice quand on peut calculer son temps.
function allureExHtml(x) {
  if (!vma) return '';
  const pct = pctVma(x), d = distanceRep(x.dose);
  if (!pct || !d) return '';
  const t = pct.map(p => fmtTemps(secondesPour(d, p)));
  const temps = t.length > 1 ? t[1] + ' à ' + t[0] : t[0];
  return `<small class="allure">⏱ ${d.toLocaleString('fr-FR')} m en ${temps} (${pct.join(' à ')} % de ta VMA)</small>`;
}

// Encadré en haut des séances de course : saisie de la VMA et tableau des temps.
function alluresBoxHtml() {
  const champ = `<label for="vmaInput">Ta VMA</label>
    <div class="vmarow"><input id="vmaInput" type="number" inputmode="decimal" min="6" max="30" step="0.5" placeholder="13" value="${vma || ''}"><span>km/h</span></div>`;
  if (!vma) return `<div class="allures">${champ}
    <p class="hint">Entre ta VMA pour voir tes temps de passage. Tu ne la connais pas ? Fais la séance « Test VMA + fartlek ».</p></div>`;
  const pcts = [80, 90, 100], dist = [200, 400, 1000];
  return `<div class="allures">${champ}
    <table class="tallures"><tr><th>Distance</th>${pcts.map(p => `<th>${p} %</th>`).join('')}</tr>
      ${dist.map(d => `<tr><td>${d.toLocaleString('fr-FR')} m</td>${pcts.map(p => `<td>${fmtTemps(secondesPour(d, p))}</td>`).join('')}</tr>`).join('')}
    </table>
    <p class="hint">Temps calculés à partir de ta VMA. Gardée sur ce téléphone.</p></div>`;
}
