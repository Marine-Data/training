// Code à 4 chiffres lié au prénom : il protège les suppressions (activités, séances, programmes, lieux).
// Le code est vérifié par la base ; ce téléphone le garde pour ne pas le redemander.

const codeCle = () => 'ft_code_' + norm(me || '');
function codeGarde() { try { return localStorage.getItem(codeCle()) || ''; } catch (e) { return ''; } }
function garderCode(c) { try { c ? localStorage.setItem(codeCle(), c) : localStorage.removeItem(codeCle()); } catch (e) {} }
const rpc = (fn, args) => api('/rpc/' + fn, {method: 'POST', body: JSON.stringify(args)});

// Demande le code (ou le fait créer la première fois). Renvoie le code, ou '' si on annule.
async function ensureCode() {
  if (!(await ensureName())) return '';
  const deja = codeGarde();
  if (deja) return deja;
  let existe = false;
  try { existe = await rpc('ft_code_existe', {p_prenom: me}); } catch (e) { toast('Pas de réseau : réessaie dans un instant.'); return ''; }
  return new Promise(res => {
    const dlg = $('codeDlg'), inp = $('codeInput');
    $('codeTitre').textContent = existe ? 'Ton code' : 'Choisis ton code';
    $('codeAide').textContent = existe
      ? 'Entre le code à 4 chiffres choisi pour « ' + me + ' ».'
      : 'Un code à 4 chiffres protège ce que tu crées : personne d’autre ne pourra le supprimer. Garde-le, il te sera demandé sur un autre téléphone.';
    $('codeErr').textContent = ''; inp.value = '';
    dlg.showModal(); inp.focus();
    const fin = v => { dlg.close(); $('codeForm').onsubmit = null; $('codeCancel').onclick = null; res(v); };
    $('codeForm').onsubmit = async e => {
      e.preventDefault();
      const c = inp.value.trim();
      if (!/^\d{4}$/.test(c)) { $('codeErr').textContent = 'Le code fait 4 chiffres.'; return; }
      try {
        const ok = existe ? await rpc('ft_code_verifier', {p_prenom: me, p_code: c}) : await rpc('ft_code_definir', {p_prenom: me, p_code: c});
        if (!ok) { $('codeErr').textContent = existe ? 'Code incorrect. Après 8 essais, il faut attendre 15 minutes.' : 'Ce prénom a déjà un code. Recharge la page et réessaie.'; return; }
        garderCode(c); toast(existe ? 'Code vérifié 🔒' : 'Code enregistré 🔒'); fin(c);
      } catch (err) { $('codeErr').textContent = 'Pas de réseau : réessaie dans un instant.'; }
    };
    $('codeCancel').onclick = () => fin('');
    dlg.addEventListener('cancel', () => res(''), {once: true});
  });
}

// Suppression protégée : appelle la fonction de la base avec le prénom et le code.
async function supprimerProtege(fn, args) {
  const code = codeGarde();
  try {
    const n = await rpc(fn, {...args, p_prenom: me, p_code: code});
    if (!n) toast('Rien n’a été supprimé : seule la personne qui l’a créé peut le faire.');
    return n;
  } catch (e) {
    if (String(e.message).includes('28000') || String(e.message).includes('"code"')) { garderCode(''); toast('Code incorrect : réessaie.'); return 0; }
    // Tant que la protection n'est pas installée dans la base, on supprime comme avant.
    if (e.status === 404 && ANCIENNE_SUPPRESSION[fn]) {
      try { await api(ANCIENNE_SUPPRESSION[fn](args), {method: 'DELETE'}); return 1; } catch (e2) {}
    }
    toast('Suppression impossible, réessaie.');
    return 0;
  }
}
const ANCIENNE_SUPPRESSION = {
  ft_supprimer_activite: a => '/ft_activites?id=eq.' + a.p_id,
  ft_supprimer_serie: a => '/ft_activites?serie_id=eq.' + a.p_serie + '&date=gte.' + a.p_date,
  ft_supprimer_seance: a => '/ft_seances?id=eq.' + a.p_id
};
// Envoi de dernière minute (page fermée pendant le délai d'annulation)
function supprimerAuDepart(fn, args) {
  try { fetch(SB + '/rpc/' + fn, {method: 'POST', headers: H, keepalive: true, body: JSON.stringify({...args, p_prenom: me, p_code: codeGarde()})}); } catch (e) {}
}
