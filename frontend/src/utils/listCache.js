// Last-loaded copies of list pages, so a revisit shows data instantly while a fresh copy
// loads (the backend can take several seconds to wake up). Session-only and per user.
const PREFIX = 'kcretio:cache:';
let owner = null;

function storage() {
  try { return window.sessionStorage; } catch { return null; }
}

export function setCacheOwner(userId) {
  if (userId === owner) return;
  owner = userId || null;
  const s = storage();
  if (!s) return;
  // A different (or no) user — drop everything cached for the previous one
  try {
    Object.keys(s).filter(k => k.startsWith(PREFIX) && !k.startsWith(`${PREFIX}${owner}:`)).forEach(k => s.removeItem(k));
  } catch { /* storage unavailable */ }
}

export function readCache(key) {
  const s = storage();
  if (!s || !owner) return null;
  try { return JSON.parse(s.getItem(`${PREFIX}${owner}:${key}`) || 'null'); } catch { return null; }
}

export function writeCache(key, data) {
  const s = storage();
  if (!s || !owner) return;
  try { s.setItem(`${PREFIX}${owner}:${key}`, JSON.stringify(data)); } catch { /* quota or private mode */ }
}
