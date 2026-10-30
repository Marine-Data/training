// Appli installable (PWA) et notifications push.
/* Appli installable + notifications push */
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
const pushOK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
let deferredInstall = null, pushOn = false;

function b64ToBytes(s) {
  const p = '='.repeat((4 - s.length % 4) % 4), b = (s + p).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b), c => c.charCodeAt(0));
}
function renderAppBar() {
  const needIOS = isIOS && !isStandalone;
  const parts = [];
  if (!isStandalone && (deferredInstall || needIOS)) parts.push('<button class="btn small" data-bar="install">📲 Installer l’appli</button>');
  if (pushOK && !needIOS) parts.push(pushOn
    ? '<button class="btn small" data-bar="push-off">🔔 Notifications activées · désactiver</button>'
    : '<button class="btn small in" data-bar="push-on">🔔 Activer les notifications</button>');
  $('appbar').innerHTML = parts.length
    ? `<div class="appbar">${parts.join('')}</div><p class="hint">${needIOS
        ? 'Sur iPhone, installe d’abord l’appli pour recevoir les notifications.'
        : 'Une alerte quand une activité est proposée ou modifiée, et un rappel 2 h avant celles où tu es inscrit·e.'}</p>`
    : '';
}
async function registerSub(sub) {
  const j = sub.toJSON();
  await api('/rpc/ft_push_register', {method: 'POST', body: JSON.stringify({p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_prenom: me})});
}
async function refreshPushState() {
  pushOn = false;
  if (pushOK && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.getSubscription();
      pushOn = !!s;
      if (s && me) registerSub(s).catch(() => {});
    } catch (e) {}
  }
  renderAppBar();
}
async function enablePush() {
  if (!(await ensureName())) return;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notifications bloquées : autorise-les dans les réglages du navigateur'); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC)}));
    await registerSub(sub);
    pushOn = true; renderAppBar(); toast('Notifications activées 🔔');
  } catch (e) { toast('Impossible d’activer les notifications sur cet appareil'); }
}
async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const s = await reg.pushManager.getSubscription();
    if (s) { await api('/rpc/ft_push_unregister', {method: 'POST', body: JSON.stringify({p_endpoint: s.endpoint})}).catch(() => {}); await s.unsubscribe(); }
    pushOn = false; renderAppBar(); toast('Notifications désactivées');
  } catch (e) { toast('Oups, réessaie.'); }
}
$('appbar').addEventListener('click', async e => {
  const b = e.target.closest('[data-bar]'); if (!b) return;
  const a = b.dataset.bar;
  if (a === 'install') {
    if (deferredInstall) { deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) {} deferredInstall = null; renderAppBar(); }
    else $('iosDlg').showModal();
  } else if (a === 'push-on') enablePush();
  else if (a === 'push-off') disablePush();
});
$('iosClose').onclick = () => $('iosDlg').close();
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; renderAppBar(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; renderAppBar(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
renderAppBar();
refreshPushState();
