# Kcretio — SEO Strategy (Sept 2026)

## 1. Discovery

| | |
|---|---|
| Business | SaaS, B2C fintech: GST invoicing, TDS tracking, advance tax and a brand-deal CRM for Indian content creators |
| Audience | YouTubers, Instagram/reels creators, podcasters and UGC freelancers earning ₹3L–₹1Cr/yr from brand deals; secondary: their CAs and talent managers |
| Goal | Free Basic signups from organic search, then Pro requests |
| Current state | Pre-launch. 1 indexable page, client-side rendered, no robots/sitemap/schema, audit score 50/100 (see `kcretio.netlify.app-audit/`) |
| Domain | Production `kcretio.com` (not live yet); `kcretio.netlify.app` should become a 301 redirect only |
| Budget/team | Assumed: founders plus Claude, no paid links. Content cadence of 2 posts/week is realistic |

### Positioning for search
Nobody combines "creator" with "Indian tax compliance" well. ClearTax and Quicko own generic tax queries, and Refrens, Zoho and Vyapar own "invoice generator". **Kcretio's wedge is the intersection: creator-specific tax and invoicing queries**, which are low-competition and high-intent:
- "GST on YouTube income", "do influencers need GST registration"
- "TDS on influencer payment", "section 194R barter / gifted products"
- "invoice format for brand collaboration", "influencer invoice template India"
- "advance tax for YouTubers", "ITR for content creators", "44ADA for influencers"

### Important: Income-tax Act, 2025
The new Income-tax Act, 2025 replaces the 1961 Act from 1 April 2026 (the "tax year" concept, and renumbered sections including TDS). The site currently cites "Section 194J / 194C". **Verify the current section references with a CA before publishing any tax content.** This is also an SEO opportunity: "old vs new section numbers for creators" content will be fresh and under-served for FY 2026-27.

## 2. Keyword pillars

| Pillar | Intent | Example head terms | Money page |
|---|---|---|---|
| A. GST for creators | Info → Commercial | GST for YouTubers, GST registration for influencers, SAC 998399 | /features/gst-invoicing |
| B. Invoicing | Commercial/Transactional | influencer invoice template, brand deal invoice format, free GST invoice generator | /tools/invoice-generator |
| C. TDS | Info | TDS on influencer income, 194R gifted products, Form 16A for creators | /features/tds-tracking |
| D. Income tax & advance tax | Info | advance tax due dates, ITR for YouTubers, 44ADA influencer | /features/advance-tax |
| E. Creator business ops | Info (TOFU) | how much to charge for a brand deal, brand deal contract, managing creator finances | /features/deal-crm |
| F. Comparison | BOFU | Zoho Invoice alternative for creators, Refrens vs Kcretio | /compare/* |

## 3. Technical foundation (prerequisite for everything)
1. **Prerender or SSG the marketing pages.** With Vite + React, use `vite-react-ssg` or a build-time prerender of `/`, `/pricing`, `/features/*`, `/guides/*`, `/tools/*`, `/compare/*`, `/about`, `/privacy` and `/terms`. The app routes (`/dashboard`, etc.) stay client-side and `noindex`.
2. Serve guides as **Markdown/MDX compiled to static HTML** (no CMS needed yet).
3. `robots.txt`, auto-generated `sitemap.xml`, canonical tags, a real 404 status, and per-route title, description and OG tags.
4. Launch kcretio.com; 301 from netlify.app; Google Search Console + Bing Webmaster Tools; a privacy-friendly analytics tool (Plausible, or GA4).
5. Core Web Vitals targets: LCP < 2.5s, INP < 200ms, CLS < 0.1 on mid-range Android over 4G (the audience is mobile-first).

## 4. Schema plan

| Page type | JSON-LD |
|---|---|
| Home | Organization, WebSite, SoftwareApplication (FinanceApplication, INR offers) |
| Pricing | SoftwareApplication + Offer ×3 (Basic ₹0, Starter ₹299, Pro ₹599) |
| Features | SoftwareApplication (featureList), BreadcrumbList |
| Guides | Article + author Person (+ reviewedBy the CA), BreadcrumbList, dateModified |
| Tools / calculators | WebApplication, BreadcrumbList |
| About | Organization, Person (founders) |

No HowTo (deprecated). No new FAQPage for Google rich results (retired May 2026). Visible FAQs are fine.

## 5. E-E-A-T plan (critical: tax content is YMYL)
- An **About page** with the founders' real names, why they built Kcretio, the registered entity and a contact address.
- A **CA reviewer**: partner with one practising Chartered Accountant. Show "Reviewed by CA [Name], ICAI membership no. …" and the last-reviewed date on every tax guide.
- **Author pages** (`/authors/<name>`) with credentials and links to social profiles.
- A **sources block** on each guide linking to CBIC, the Income Tax Department and the GST portal.
- **Remove unverifiable claims** (2,400+ creators, ₹42Cr+) until they're real. Replace them with real beta-user quotes (with permission) as they come in.
- An **editorial policy page** covering how content is reviewed and updated each Budget.

## 6. AI search (GEO)
- Every guide starts with a 40–60 word direct answer, followed by a table of rates, dates and thresholds. These are the passages AI Overviews and ChatGPT quote.
- Put numbers inside sentences ("TDS of 10% applies when…"), and date-stamp each one ("as of FY 2026-27").
- `llms.txt` listing the guides and tools; robots.txt allows GPTBot, ClaudeBot and PerplexityBot.
- Consistent brand mentions on YouTube, LinkedIn, X and Reddit (r/IndiaTax, r/IndianYoutubers), plus creator-community newsletters.

## 7. Link acquisition (no paid links)
- **Free tools are the link magnets**: invoice generator, advance tax calculator, TDS calculator, GST registration checker, "brand deal rate calculator".
- Annual data piece: "State of Creator Taxes India 2027" (anonymised, aggregated in-app data once there are users, plus a survey).
- Guest/podcast appearances on creator-economy shows; CA YouTubers; startup listings (Product Hunt, Indie Hackers, SaaSworthy, G2).
- Creator agencies and MCNs: offer co-branded "tax checklist for your roster".

## 8. KPI targets

| Metric | Baseline | 3 mo | 6 mo | 12 mo |
|---|---|---|---|---|
| Indexed pages | 1 | 35 | 70 | 130 |
| Organic clicks / month | 0 | 300 | 3,000 | 15,000 |
| Keywords in top 10 | 0 | 15 | 80 | 250 |
| Referring domains | ~0 | 15 | 50 | 120 |
| Organic signups / month | 0 | 20 | 200 | 1,000 |
| CWV (mobile, field) | n/a | all "Good" | all "Good" | all "Good" |
| AI citations (manual check of 20 prompts) | 0/20 | 2/20 | 6/20 | 10/20 |

These targets are estimates without live keyword-volume data. Re-baseline at month 3 using Search Console.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wrong tax info (YMYL, legal exposure) | CA review, "last reviewed" dates, update sweep after each Budget and GST Council meeting |
| Act renumbering makes content stale | Show old and new section numbers side by side; one owner for tax-law updates |
| SPA prerender breaks | CI check: `curl` each sitemap URL and assert that the H1 is present in the raw HTML |
| Big players (ClearTax) outrank on generic terms | Stay on creator-specific long-tail; build tools rather than articles for head terms |
| Thin programmatic pages | No mass city or state pages. State-code pages only if each has unique GST content |

See `SITE-STRUCTURE.md`, `CONTENT-CALENDAR.md`, `COMPETITOR-ANALYSIS.md` and `IMPLEMENTATION-ROADMAP.md`.
