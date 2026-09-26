// FRONTEND_URL is deliberately a comma-separated list on Render (e.g.
// "https://kcreatio.com,https://kcretio.netlify.app") so server.ts's CORS
// whitelist can allow more than one origin. Anything that needs to BUILD a
// single link (password reset emails, payment confirmation links, OAuth
// redirects, onboarding emails) must not use the raw env var directly — it
// would concatenate the whole comma list into one broken URL. Use this
// instead; it always resolves to exactly one origin.
export function getFrontendUrl(): string {
  const primary = process.env.PRIMARY_FRONTEND_URL;
  if (primary) return primary.trim().replace(/\/$/, '');

  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  return raw.split(',')[0].trim().replace(/\/$/, '');
}
