// Météo des activités en extérieur, prévisions Open-Meteo (gratuit, sans clé).
// Au lieu enregistré de l'activité quand il en a un, sinon à Paris. Jusqu'à 16 jours, à l'heure prévue.

const PARIS = {lat: 48.8566, lon: 2.3522, nom: 'Paris'};
const meteos = new Map();  // "lat,lon" → {data, t}

// Activités en intérieur : pas de météo.
const INTERIEUR = /piscine|natation|nage|salle|neoness|basic.?fit|fitness|indoor|intérieur|escalade|bloc|yoga|gymnase/i;
const enExterieur = a => !INTERIEUR.test((a.titre || '') + ' ' + (a.lieu || ''));
function pointMeteo(a) {
  const l = typeof lieuDe === 'function' ? lieuDe(a) : null;
  return l && l.lat != null ? {lat: l.lat, lon: l.lon, nom: l.nom} : PARIS;
}
const cleMeteo = p => p.lat.toFixed(2) + ',' + p.lon.toFixed(2);

// Codes météo OMM → pictogramme et mot court
function tempsDe(code) {
  if (code === 0) return ['☀️', 'Soleil'];
  if (code <= 2) return ['🌤️', 'Éclaircies'];
  if (code === 3) return ['☁️', 'Couvert'];
  if (code <= 48) return ['🌫️', 'Brouillard'];
  if (code <= 57) return ['🌦️', 'Bruine'];
  if (code <= 67) return ['🌧️', 'Pluie'];
  if (code <= 77) return ['🌨️', 'Neige'];
  if (code <= 82) return ['🌧️', 'Averses'];
  if (code <= 86) return ['🌨️', 'Neige'];
  return ['⛈️', 'Orage'];
}

async function chargerMeteo() {
  const today = todayStr(), fin = addDays(today, 15);
  const points = new Map();
  activities.filter(a => a.date && a.date >= today && a.date <= fin && enExterieur(a)).forEach(a => { const p = pointMeteo(a); points.set(cleMeteo(p), p); });
  let neuf = false;
  await Promise.all([...points].map(async ([k, p]) => {
    const c = meteos.get(k); if (c && Date.now() - c.t < 30 * 60e3) return;
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lon +
        '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
        '&timezone=Europe%2FParis&forecast_days=16');
      if (r.ok) { meteos.set(k, {data: await r.json(), t: Date.now()}); neuf = true; }
    } catch (e) {}
  }));
  if (neuf) render();
}

function meteoHtml(a) {
  if (!a.date || a.statut === 'sondage' || !enExterieur(a)) return '';
  const p = pointMeteo(a), c = meteos.get(cleMeteo(p)); if (!c) return '';
  const m = c.data, ou = p === PARIS ? 'Paris' : p.nom;
  if (a.heure) {
    const i = m.hourly.time.indexOf(a.date + 'T' + a.heure.slice(0, 2) + ':00');
    if (i >= 0) {
      const [ico, mot] = tempsDe(m.hourly.weather_code[i]);
      const pluie = m.hourly.precipitation_probability[i], vent = Math.round(m.hourly.wind_speed_10m[i]);
      return `<div class="meteo" title="Prévision pour ${esc(ou)} à ${a.heure.slice(0, 2)}h">${ico} ${mot} · ${Math.round(m.hourly.temperature_2m[i])}° · pluie ${pluie ?? '?'} %${vent >= 30 ? ' · vent ' + vent + ' km/h' : ''}${p === PARIS ? ' <small>(Paris)</small>' : ''}</div>`;
    }
  }
  const j = m.daily.time.indexOf(a.date);
  if (j < 0) return '';
  const [ico, mot] = tempsDe(m.daily.weather_code[j]);
  return `<div class="meteo" title="Prévision pour ${esc(ou)} sur la journée">${ico} ${mot} · ${Math.round(m.daily.temperature_2m_min[j])}° à ${Math.round(m.daily.temperature_2m_max[j])}° · pluie ${m.daily.precipitation_probability_max[j] ?? '?'} %${p === PARIS ? ' <small>(Paris)</small>' : ''}</div>`;
}
