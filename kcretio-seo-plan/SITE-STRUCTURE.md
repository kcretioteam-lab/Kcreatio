# Site Structure — kcretio.com

```
/                                   Home (prerendered)
├── /pricing                        Basic / Starter / Pro + FAQ
├── /features
│   ├── /gst-invoicing              Rule 46 invoices, CGST/SGST vs IGST, SAC 998399
│   ├── /tds-tracking               TDS ledger, Form 16A, 26AS reconciliation
│   ├── /advance-tax                Quarterly planner + reminders
│   ├── /deal-crm                   Brand deal pipeline
│   └── /ca-export                  ITR-ready ZIP
├── /for                            Audience landing pages
│   ├── /youtubers
│   ├── /instagram-creators
│   ├── /podcasters
│   └── /freelance-creators
├── /tools                          Free, no login (link magnets)
│   ├── /invoice-generator          Free GST invoice for brand deals (watermarked PDF)
│   ├── /tax-risk-calculator        Existing calculator, moved to its own URL
│   ├── /advance-tax-calculator
│   ├── /tds-calculator
│   └── /gstin-validator            GSTIN format + state-code check
├── /templates
│   ├── /influencer-invoice-template
│   └── /brand-deal-contract-template
├── /guides                         Pillar + cluster articles (MDX → static HTML)
│   ├── /gst-for-content-creators   Pillar A
│   ├── /tds-for-content-creators   Pillar C
│   ├── /income-tax-for-youtubers   Pillar D
│   ├── /invoicing-brand-deals      Pillar B
│   └── /<cluster-slug>             Flat URLs, linked to their pillar
├── /glossary/<term>                SAC code, GSTIN, Form 16A, 26AS, AIS… (only if ≥300 useful words each)
├── /compare
│   ├── /zoho-invoice-alternative
│   ├── /refrens-alternative
│   └── /spreadsheet-vs-kcretio
├── /about                          Founders, entity, CA reviewer
├── /authors/<slug>
├── /editorial-policy
├── /contact
├── /privacy  /terms
└── (app) /login /register /dashboard /invoices …   → noindex, disallowed in robots.txt
```

## Rules
- Lowercase, hyphenated slugs; no dates in URLs (update the content, keep the URL).
- Guides use flat `/guides/<slug>` URLs so they can move between pillars without redirects.
- Every cluster article links **up** to its pillar, **across** to 2 siblings, and **down** to 1 tool or feature page.
- Every feature page links to the pricing page and to its top 3 guides.
- Home links to all pillars, the tools hub and pricing (footer mega-links).
- Breadcrumbs on everything below the first level.

## Sitemaps
- `sitemap-index.xml` → `sitemap-pages.xml`, `sitemap-guides.xml`, `sitemap-tools.xml`.
- Only 200-status, indexable, canonical URLs; accurate `lastmod` from git or frontmatter.
- Exclude all app routes.

## robots.txt (draft)
```
User-agent: *
Disallow: /dashboard
Disallow: /invoices
Disallow: /deals
Disallow: /income
Disallow: /expenses
Disallow: /tds
Disallow: /tax-planner
Disallow: /settings
Disallow: /login
Disallow: /register
Allow: /

Sitemap: https://kcretio.com/sitemap-index.xml
```
Match the Disallow lines to the real route paths in `frontend/src/App.jsx` before shipping.
