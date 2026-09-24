# Action Plan — kcretio.netlify.app

## Critical (this week)
1. **Prerender marketing routes** (/, /privacy, /terms) to static HTML at build. Verify: `curl -s <site>/ | grep "Questions creators ask"` returns a match.
2. **Add a real `robots.txt`** in `frontend/public/`: allow all, disallow app routes, /login and /register, and include a `Sitemap:` line. Verify: it's served as `text/plain`.

## High (1–2 weeks)
3. Add `sitemap.xml` (/, /privacy, /terms, plus future guides).
4. Canonical tag → production domain; launch kcretio.com, 301 netlify.app → it, and verify in Search Console.
5. Return a real 404 for unknown routes (at minimum `noindex` on the React 404 view).
6. Replace or qualify the unverified stats ("2,400+ creators", "₹42Cr+", "Real creators") and the real-brand examples.
7. Add og:image (1200×630), og:url and og:site_name.

## Medium (month 1)
8. JSON-LD: Organization + WebSite + SoftwareApplication with INR offers.
9. Per-route titles/descriptions; `noindex` on /login and /register.
10. Keyword in the H1; more descriptive H2s.
11. About page with the team or company identity and contact details.
12. Security headers in netlify.toml; preload the hero font; aria-labels on icon buttons.

## Content & authority (month 2)
13. Guides hub: "GST for YouTubers", "TDS under 194J for influencers", "Advance tax dates FY 2026-27", "Invoice format for brand deals" — each linking to the free invoice tool.
14. A public Tax Risk Calculator page (it's already built and needs no account).
15. Add llms.txt; set up the brand's social profiles and link them with `sameAs`.

## Monitoring
- Search Console coverage and queries weekly; re-run `/seo audit` after the prerender ships; baseline with `/seo drift baseline`.
