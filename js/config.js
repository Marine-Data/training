// Configuration : connexion à la base Supabase et clé publique des notifications.
// Ces clés sont publiques par conception (clé « publishable »), elles peuvent être dans le code.
const SB = 'https://osqyczwawbbwjwaubtvc.supabase.co/rest/v1';
const KEY = 'sb_publishable_Z4ykq9R8uYhtrAks301TPA_ujR1K2VB';
const H = {apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json'};
// Code de groupe : saisi une fois sur ce téléphone, envoyé avec chaque requête.
// La base refuse toute lecture et écriture sans le bon code. Il n'est écrit nulle part dans le code.
const GROUPE_CLE = 'ft_groupe';
function codeGroupe() { try { return localStorage.getItem(GROUPE_CLE) || ''; } catch (e) { return ''; } }
function garderCodeGroupe(c) { try { c ? localStorage.setItem(GROUPE_CLE, c) : localStorage.removeItem(GROUPE_CLE); } catch (e) {} H['x-code-groupe'] = c || ''; }
H['x-code-groupe'] = codeGroupe();
const VAPID_PUBLIC = 'BAO4cgcv8VL1tm6fKUjmq3g2saho_h5lMdj6tvmatvBF7WAZctesCVaUNZGfpOI9258QeyW3PhFE-EOWPyyLooI';
