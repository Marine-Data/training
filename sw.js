// Service worker Freestyle Tricks : notifications push et fonctionnement hors ligne.
// - Pages, styles, scripts, icônes : servis depuis le cache, mis à jour en arrière-plan.
// - Données (Supabase) et météo : réseau d'abord, dernière version en cache si pas de réseau.
const CACHE = 'ft-v5';
const BASE = ['./', './index.html', './manifest.webmanifest', './icon-192.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

async function reseauDabord(req) {
  const c = await caches.open(CACHE);
  try {
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch (e) {
    const m = await c.match(req, {ignoreSearch: req.mode === 'navigate'});
    if (m) return m;
    if (req.mode === 'navigate') { const p = await c.match('./'); if (p) return p; }
    throw e;
  }
}
async function cacheDabord(req) {
  const c = await caches.open(CACHE), m = await c.match(req);
  const maj = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  return m || (await maj) || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.mode === 'navigate') { e.respondWith(reseauDabord(req)); return; }
  if (u.origin === self.location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) { e.respondWith(cacheDabord(req)); return; }
  if (/supabase\.co$/.test(u.hostname) && u.pathname.startsWith('/rest/v1/') || /open-meteo\.com$/.test(u.hostname)) { e.respondWith(reseauDabord(req)); return; }
});

self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(self.registration.showNotification(d.title || 'Freestyle Tricks', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const existing = list.find(c => c.url.startsWith(self.registration.scope));
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  }));
});
