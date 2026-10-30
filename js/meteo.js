// Météo des activités en extérieur, prévisions Open-Meteo (gratuit, sans clé) pour Paris.
// Affichée sur les activités des 16 prochains jours, à l'heure prévue quand elle est connue.

const METEO_LIEU = {lat: 48.8566, lon: 2.3522}; // Paris
let meteo = null, meteoCharge = 0;

// Activités en intérieur : pas de météo.
const INTERIEUR = /piscine|natation|nage|salle|neoness|basic.?fit|fitness|indoor|intérieur|escalade|bloc|yoga|gymnase/i;
const enExterieur = a => !INTERIEUR.test((a.titre || '') + ' ' + (a.lieu || ''));

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
  if (meteo && Date.now() - meteoCharge < 30 * 60e3) return;
  try {
    const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + METEO_LIEU.lat + '&longitude=' + METEO_LIEU.lon +
      '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=Europe%2FParis&forecast_days=16';
    const r = await fetch(u);
    if (!r.ok) return;
    meteo = await r.json(); meteoCharge = Date.now();
    render();
  } catch (e) {}
}

function meteoHtml(a) {
  if (!meteo || !a.date || a.statut === 'sondage' || !enExterieur(a)) return '';
  if (a.heure) {
    const h = a.date + 'T' + a.heure.slice(0, 2) + ':00';
    const i = meteo.hourly.time.indexOf(h);
    if (i >= 0) {
      const [ico, mot] = tempsDe(meteo.hourly.weather_code[i]);
      const pluie = meteo.hourly.precipitation_probability[i], vent = Math.round(meteo.hourly.wind_speed_10m[i]);
      return `<div class="meteo" title="Prévision pour Paris à ${a.heure.slice(0, 2)}h">${ico} ${mot} · ${Math.round(meteo.hourly.temperature_2m[i])}° · pluie ${pluie ?? '?'} %${vent >= 30 ? ' · vent ' + vent + ' km/h' : ''}</div>`;
    }
  }
  const j = meteo.daily.time.indexOf(a.date);
  if (j < 0) return '';
  const [ico, mot] = tempsDe(meteo.daily.weather_code[j]);
  return `<div class="meteo" title="Prévision pour Paris sur la journée">${ico} ${mot} · ${Math.round(meteo.daily.temperature_2m_min[j])}° à ${Math.round(meteo.daily.temperature_2m_max[j])}° · pluie ${meteo.daily.precipitation_probability_max[j] ?? '?'} %</div>`;
}
