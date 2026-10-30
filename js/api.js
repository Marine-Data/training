// Accès à la base : toutes les requêtes passent par api().
async function api(path, opts = {}) {
  const r = await fetch(SB + path, {...opts, headers: {...H, ...(opts.headers || {})}});
  if (!r.ok) { const t = await r.text(); const e = new Error(t || r.status); e.status = r.status; throw e; }
  return r.status === 204 ? null : r.json().catch(() => null);
}
