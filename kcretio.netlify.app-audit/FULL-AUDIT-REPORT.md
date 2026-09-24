# SEO Audit — kcretio.netlify.app
Date: 2026-09-24 · Pages crawled: 1 real page (homepage) + 4 SPA routes (/privacy, /terms, /login, /register) · Business type: SaaS (B2C fintech for Indian creators)

## SEO Health Score: 50 / 100

| Category | Weight | Score |
|---|---|---|
| Technical SEO | 22% | 45 |
| Content Quality | 23% | 55 |
| On-Page SEO | 20% | 60 |
| Schema / Structured Data | 10% | 10 |
| Performance (CWV, lab estimate only) | 10% | 65 |
| AI Search Readiness | 10% | 35 |
| Images | 5% | 80 |

## What works
- HTTPS with HSTS preload; http → https 301.
- Good `<title>` (54 chars) and meta description (128 chars), both keyword-led ("GST, TDS & Advance Tax for Indian Creators").
- Open Graph / Twitter title + description present.
- One H1, logical H2/H3 flow; ~7.7k chars of substantive, India-specific copy (Rule 46, 194J/194C, Form 16A, 26AS, SAC 998399).
- FAQ section with genuinely specific answers — strong for AI citation once it's visible in HTML.
- No console errors; main JS ~105 KB brotli.

## Technical SEO (45)
- **CRITICAL — Content is client-rendered only.** Raw HTML is an empty `<div id="root">`. Google renders JS (with delay), but Bing, most AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and social scrapers see no content. Fix: prerender the landing, privacy and terms routes at build time, or serve the marketing pages as static HTML.
- **HIGH — robots.txt and sitemap.xml don't exist.** The `/* → /index.html 200` rule in `netlify.toml` returns the app HTML for both. Add `frontend/public/robots.txt` and `sitemap.xml`.
- **HIGH — Soft 404s.** `/this-does-not-exist` returns 200 with the homepage shell. Any typo URL is indexable duplicate content. Add a noindex 404 route in React and/or explicit Netlify redirects so unknown paths return 404.
- **HIGH — No canonical tag.** Critical because the site is reachable on netlify.app and (planned) kcretio.com. Add `<link rel="canonical">` pointing to the production domain.
- **MEDIUM — Same title/description on every route.** /privacy, /terms, /login, /register all inherit the homepage title. Set per-route title and description; add `noindex` to /login and /register.
- **MEDIUM — Production domain not live.** kcretio.com didn't respond. Launch it, 301 netlify.app → kcretio.com, and verify in Google Search Console.
- **LOW — Missing security headers:** CSP, X-Content-Type-Options, Referrer-Policy (add via `[[headers]]` in netlify.toml).

## Content Quality (55)
- **HIGH — Unverifiable social proof.** "2,400+ creators managing ₹42Cr+", "Real numbers. Real creators." and "Your CA calls it the cleanest file of the season" read as factual claims for a pre-launch product. That's a trust (E-E-A-T) and consumer-protection risk. Use real numbers, or rephrase as illustrative.
- **MEDIUM — Real brand names as examples** (Mamaearth, Boat) in scenario copy could read as endorsements. Use fictional brands or label the scenario as illustrative.
- **MEDIUM — Comparison table claims** ("Not in any competitor", Zoho ₹1,200/mo) need a sourced date, or should be softened.
- **MEDIUM — No company identity.** No About page, founder names, registered entity or address. For a finance/tax product (YMYL), that's a significant E-E-A-T gap.
- **MEDIUM — Thin site.** One indexable content page. There's no content for what creators actually search ("GST for YouTubers", "TDS 194J influencer", "advance tax due dates for freelancers").

## On-Page SEO (60)
- H1 "Create. Everything else flows." contains no keyword. Work a phrase such as "GST invoicing & tax for Indian creators" into the H1.
- Many H2s are slogan-style ("Not features. Life improvements.") and carry no topic signal.
- Internal links: only /, /login, /register, /privacy, /terms. There are no feature, pricing or guide pages to link to.
- Missing `og:image`, `og:url`, `og:site_name`. `twitter:card=summary_large_image` has no image, so shares render without a preview.

## Schema (10)
- No JSON-LD at all. Add `Organization` (name, logo, email, sameAs), `WebSite`, and `SoftwareApplication` (applicationCategory FinanceApplication, offers ₹0 Basic / ₹299 Starter / ₹599 Pro, INR).
- FAQPage: Google retired FAQ rich results (May 2026), so it isn't worth adding for SERP gain. The visible FAQ is still valuable content.

## Performance (65 — lab estimate, no field data)
- Rendered in ~5.9 s headless. The LCP element (the H1) only appears after the JS boots. Prerendering fixes LCP as well as crawlability.
- Preload the above-the-fold Anek Latin woff2 and use `font-display: swap`.
- Confirm hashed `/assets/*` files get `Cache-Control: public, max-age=31536000, immutable`.
- Get real numbers with PageSpeed Insights / `/seo google` once on kcretio.com.

## Images (80)
- Only 2 `<img>` (logo, alt="Kcretio", width/height set). Good.
- 2 icon-only buttons (`<button><svg>`) have no accessible name. Add `aria-label`.
- No OG share image (see On-Page).

## AI Search Readiness (35)
- AI crawlers don't execute JS, so the page is effectively blank to them (see Technical).
- No llms.txt (optional, but cheap). No robots.txt means no explicit policy for GPTBot, ClaudeBot or PerplexityBot.
- The FAQ and tax explanations (194J 10%, 194C 1–2%, ₹20L GST threshold) are highly citable once served as static HTML.
- No brand footprint: no sameAs links and no social profiles.
