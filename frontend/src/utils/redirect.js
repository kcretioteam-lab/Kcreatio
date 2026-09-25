// Where to send a user after they sign in: the page they originally asked for, if it's
// a safe in-app path, otherwise the dashboard. Blocks open redirects like //evil.com.
const AUTH_PAGES = ['/login', '/register', '/signup', '/forgot-password', '/reset-password'];

export function safeNextPath(candidate, fallback = '/dashboard') {
  if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return fallback;
  if (AUTH_PAGES.some(p => candidate === p || candidate.startsWith(p + '?') || candidate.startsWith(p + '/'))) return fallback;
  return candidate;
}

export function nextPathFrom(location, searchParams) {
  const from = location?.state?.from;
  const fromPath = from ? `${from.pathname || ''}${from.search || ''}${from.hash || ''}` : null;
  return safeNextPath(fromPath || searchParams?.get('next'));
}
