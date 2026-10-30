// Actions sur une activité : refaire la semaine suivante, partager sur WhatsApp, ajouter à l'agenda.
/* Refaire la semaine suivante (même activité, +7 jours, à la demande) */
async function repeatActivity(id) {
  const a = activities.find(x => x.id === id); if (!a || !a.date) return;
  if (!(await ensureName())) return;
  const today = todayStr();
  let d = addDays(a.date, 7); while (d < today) d = addDays(d, 7);
  const hh = a.heure ? a.heure.slice(0, 5) : '';
  // On rouvre le formulaire pré-rempli : une date (la semaine suivante) ou plusieurs dates (sondage).
  slotPrefill = {date: d, heure: hh}; pendingEnd = a.duree_fin || null;
  $('addTitle').textContent = 'Refaire cette activité';
  $('addForm').reset(); $('slotRows').innerHTML = ''; setMulti(false);
  $('fTitre').value = a.titre; $('fDate').min = today; $('fDate').value = d; $('fHeure').value = hh;
  $('fLieu').value = a.lieu || ''; $('fDesc').value = a.description || ''; $('addErr').textContent = '';
  $('addDlg').showModal();
}

/* Partager sur WhatsApp */
const pageUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
function shareActivity(id) {
  const a = activities.find(x => x.id === id); if (!a) return;
  const L = ['🤸 *' + a.titre + '*'];
  if (a.statut === 'sondage') {
    const ds = (a.ft_creneaux || []).slice().sort((x, y) => (x.date + (x.heure || '')).localeCompare(y.date + (y.heure || '')))
      .map(s => '• ' + dayLabel(s.date) + (s.heure ? ' à ' + hm(s.heure) : ''));
    L.push('📅 Date à choisir :', ...ds);
  } else {
    L.push('📅 ' + dayLabel(a.date) + (a.heure ? ' · ' + timeLabel(a) : ' · horaire à confirmer'));
  }
  if (a.lieu) L.push('📍 ' + a.lieu);
  L.push('', (a.statut === 'sondage' ? 'Vote et inscris-toi ici : ' : 'Inscris-toi ici : ') + pageUrl());
  window.open('https://wa.me/?text=' + encodeURIComponent(L.join('\n')), '_blank', 'noopener');
}

/* Ajouter au calendrier (.ics : Google Agenda, Apple Calendrier, Outlook…) */
function parisToUtc(d, t) {
  const [y, m, da] = d.split('-').map(Number), [h, mi] = t.split(':').map(Number);
  const fmt = new Intl.DateTimeFormat('en-US', {timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'});
  const offset = ms => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x => [x.type, +x.value]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - ms;
  };
  const guess = Date.UTC(y, m - 1, da, h, mi);
  let ms = guess - offset(guess);
  ms = guess - offset(ms);
  return new Date(ms);
}
const icsStamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function icsFold(line) { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); } out.push(line); return out.join('\r\n'); }
function downloadIcs(id) {
  const a = activities.find(x => x.id === id); if (!a || !a.date) return;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Freestyle Tricks//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:' + a.id + '@freestyle-tricks', 'DTSTAMP:' + icsStamp(new Date())];
  if (a.heure) {
    const start = parisToUtc(a.date, a.heure.slice(0, 5));
    let end = a.duree_fin ? parisToUtc(a.date, a.duree_fin.slice(0, 5)) : new Date(start.getTime() + 3600000);
    if (end <= start) end = new Date(start.getTime() + 3600000);
    lines.push('DTSTART:' + icsStamp(start), 'DTEND:' + icsStamp(end));
  } else {
    const next = new Date(a.date + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
    lines.push('DTSTART;VALUE=DATE:' + a.date.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + next.toISOString().slice(0, 10).replace(/-/g, ''));
  }
  lines.push('SUMMARY:' + icsEsc(a.titre));
  if (a.lieu) lines.push('LOCATION:' + icsEsc(a.lieu));
  lines.push('DESCRIPTION:' + icsEsc([a.description, 'Planning : ' + pageUrl()].filter(Boolean).join('\n')));
  lines.push('END:VEVENT', 'END:VCALENDAR');
  const blob = new Blob([lines.map(icsFold).join('\r\n') + '\r\n'], {type: 'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob), el = document.createElement('a');
  el.href = url; el.download = (a.titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'activite') + '.ics';
  document.body.appendChild(el); el.click(); el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Ouvre le fichier pour l’ajouter à ton agenda 📅');
}

