# Implementation Roadmap

Each item lists how to know it failed, so you can check without re-running an audit.

## Phase 1 — Foundation (weeks 1–4)
**Goal:** every marketing URL returns full HTML, and Google can discover and index it.

| # | Task | Where | Depends on | Failure check |
|---|---|---|---|---|
| 1 | Launch kcreatio.com, 301 netlify.app → kcreatio.com | Netlify DNS | — | `curl -I netlify.app` not 301 |
| 2 | Build-time prerender/SSG for marketing routes | `frontend/` Vite config | — | `curl -s kcreatio.com/ \| grep "<h1"` empty |
| 3 | Per-route head tags (title, description, canonical, OG, robots) | shared `<Seo>` component | 2 | Duplicate titles in the Search Console page report |
| 4 | robots.txt + sitemap generation | `frontend/public/`, build script | 2 | `/robots.txt` content-type not text/plain |
| 5 | Real 404 status + app routes noindex | `netlify.toml`, `NotFoundPage.jsx` | 2 | Unknown URL returns 200 |
| 6 | JSON-LD: Organization, WebSite, SoftwareApplication | Home + /pricing | 3 | Rich Results Test errors |
| 7 | OG image 1200×630 | `frontend/public/` | — | Missing preview when pasted into WhatsApp or X |
| 8 | Fix trust copy (unverified stats, real-brand examples) | landing pages | — | — |
| 9 | Search Console + Bing Webmaster + analytics | — | 1 | No data after 7 days |
| 10 | /about, /editorial-policy, /pricing, first 2 feature pages | new pages | 2 | Not indexed after 3 weeks |
| 11 | Sign up the CA reviewer | — | — | Blocks Phase 2 tax content |

**Exit criteria:** ≥15 URLs indexed, 0 soft-404s, raw HTML contains the content, audit score ≥ 75.

## Phase 2 — Expansion (weeks 5–12)
- MDX guides pipeline (`/guides/*`) with author, reviewer, `dateModified` and breadcrumbs, from frontmatter to JSON-LD.
- Publish the 4 pillars + ~16 cluster articles (see CONTENT-CALENDAR).
- Free tools: invoice generator, advance-tax calculator, tax-risk calculator on its own URL.
- Internal linking: pillar ↔ cluster ↔ tool ↔ feature; footer mega-links.
- `/for/*` audience pages (YouTubers, Instagram).
- llms.txt; robots.txt allows AI crawlers.
- Local SEO: not applicable (national online product).

**Exit criteria:** 60+ indexed URLs, 3,000 impressions/week, first 10 top-10 keywords.

## Phase 3 — Scale (weeks 13–24)
- Remaining tools (TDS calculator, GSTIN validator), templates and comparison pages.
- Link outreach: tool pages to creator newsletters, CA YouTubers, Product Hunt / G2 / SaaSworthy listings, podcast guesting.
- GEO: answer-first rewrites of the top 20 pages; track 20 AI prompts monthly.
- Performance: field CWV from CrUX; fix any page outside the "Good" range.
- Budget 2027 content sprint (Feb).

**Exit criteria:** 50 referring domains, 3,000 organic clicks/month, 200 organic signups/month.

## Phase 4 — Authority (months 7–12)
- "State of Creator Taxes India" annual report + PR push.
- Expand `/for/*` and templates only where Search Console shows demand.
- Refresh cycle: quarterly advance-tax updates, Budget updates, and monthly top-page refreshes.
- Consider a Hindi version (`/hi/`) of the top 10 guides if data shows Hindi query demand (hreflang then required).

## Resources
- Dev: ~5–7 days for Phase 1 (prerender is the largest item), ~3 days for the MDX pipeline, ~2 days per tool.
- Content: 2 pieces/week (writer + CA review turnaround ≤ 3 days).
- Tools: Search Console, Bing Webmaster Tools, Plausible/GA4. Optional: DataForSEO for keyword volumes.

## Next commands
- `/claude-seo:seo-cluster "gst for content creators"` to finalise the cluster topics per pillar.
- `/claude-seo:seo-content-brief <topic>` for each piece.
- `/claude-seo:seo-drift baseline https://kcreatio.com` once live.
