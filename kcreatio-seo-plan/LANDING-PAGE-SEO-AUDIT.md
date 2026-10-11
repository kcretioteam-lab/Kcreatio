# Landing page SEO audit — kcreatio.com (29 Sep 2026)

Checked against the live site with `curl` and against the source code. This file tracks what's left of Phase 1 in `IMPLEMENTATION-ROADMAP.md` and adds the issues found since.

## Executive summary

The foundations are in place: HTTPS, a single host (`www` and `http` both 301 to `https://kcreatio.com`, and `kcretio.netlify.app` 301s too), build-time prerendered HTML for `/`, `/privacy` and `/terms`, a canonical tag, robots.txt, sitemap.xml, SoftwareApplication JSON-LD and a 1200×630 OG image.

The biggest remaining problems:
1. **Soft 404s.** Every unknown URL returns **200** with the homepage HTML and a canonical of `/`.
2. **`/llms.txt` is fake.** It returns 200 with the homepage HTML (`text/html`), so AI crawlers get a web page.
3. **Only one page can rank.** The only indexable page with real content is `/`, so every keyword competes for one URL.
4. **The prerendered HTML is written by hand**, separately from the React page, so it drifts from the copy people see. The FAQ isn't in the raw HTML at all.

## Shipped with the copy rewrite (this change)

| Item | Before | After |
|---|---|---|
| `<title>` | `Kcreatio — GST invoices, TDS & advance tax for Indian creators` (brand first) | `GST invoices, TDS & advance tax for Indian creators \| Kcreatio` (keyword first, 62 chars) |
| Meta description | Feature list, 162 chars, no reason to click | Benefit + "Free" + audience, 152 chars |
| H1 that people see | "Create. Everything else flows." (no keywords; flagged by the earlier audit) | "GST, TDS & advance tax for Indian creators", the same as the prerendered H1 |
| Prerendered H1 vs. the page | Different | Identical, plus the display line "Brand deal to tax return, sorted." |
| H2s | "Not features. Life improvements.", "Your dashboard. In 3 months." | "What changes after your first month.", "Income, TDS and tax deadlines. One screen.", "The GST invoice your brand's finance team receives." |
| Trust copy | "Join 200+ Indian creators" (unverified), "30s avg send time", "Q3" on a Sep 15 deadline, absolute "Rule 46 compliant" claim, cards implying GST filing | Removed or corrected |
| `index.html` defaults | Old title and description | Match `seo.config.js` |

## Findings and fixes

### Critical

**1. Unknown URLs return 200 (soft 404)**
- **Evidence:** `curl -I https://kcreatio.com/this-page-does-not-exist` returns `200` with the homepage title and `canonical=/`. Cause: the catch-all `/* → /index.html 200` in `netlify.toml`. `/404.html`, which the `/api/*` rule points to, isn't in `dist/` either.
- **Impact:** High. Google treats junk URLs as copies of the homepage and spends crawl budget on them, and Search Console fills up with "Soft 404".
- **Fix:**
  1. In `seo.config.js`, also write `dist/404.html`: the SPA template plus `<meta name="robots" content="noindex">`. React boots and shows `NotFoundPage`.
  2. In `netlify.toml`, replace the `/*` catch-all with a 200 rewrite for each real SPA route in `App.jsx`: `/login`, `/register`, `/auth`, `/forgot-password`, `/reset-password`, `/confirm-payment/*`, `/dashboard`, `/invoices`, `/invoices/*`, `/tds`, `/tax-planner`, `/deals`, `/income`, `/expenses`, `/settings`. Then end with `/* → /404.html 404`.
  3. Add a QA check that requests every route above and expects 200, so a route added later can't silently 404 in production.
- **How to verify:** an unknown URL returns `404`, and `/dashboard` returns `200`.

**2. `/llms.txt` serves the homepage HTML**
- **Evidence:** `Content-Type: text/html` on `/llms.txt`.
- **Fix:** add `frontend/public/llms.txt` (plain text): one paragraph on what Kcreatio is and who it's for, then links to `/`, `/privacy`, `/terms`, and to the guides and tools as they ship. It gets fixed by itself once finding 1 ships, because the file then exists before the fallback applies.

### High

**3. Auth pages are indexable copies of the homepage**
- **Evidence:** `/register` and `/login` return the homepage `<title>` and `canonical=/`, with no `robots` meta tag.
- **Fix:** add `/login`, `/register`, `/forgot-password` and `/reset-password` to `PAGES` in `seo.config.js` with their own title, `<meta name="robots" content="noindex, follow">` and a self-canonical. Keep them out of the sitemap. Leave them allowed in robots.txt, because Google has to crawl a page to see its `noindex`.

**4. Only one URL can rank**
- **Evidence:** the sitemap has 3 URLs, and only `/` has content.
- **Fix (already Phase 1 #10 in the roadmap):** in this order:
  1. `/tools/tax-calculator`: move the Tax Risk Calculator to its own prerendered URL. It needs no account, targets "advance tax calculator for creators" / "TDS refund calculator", and is your best link magnet. Keep the landing-page version, linking to it.
  2. `/pricing`
  3. `/features/gst-invoicing`, `/features/tds-tracking`, `/features/advance-tax`
  4. `/about`: founders, the legal entity, a contact address. Tax content is YMYL, so this is needed for E-E-A-T.

**5. The prerendered HTML is maintained by hand**
- **Evidence:** the `body` in `seo.config.js` is a separate copy of the page. The FAQ, invoice showcase and calculator text aren't in the raw HTML.
- **Impact:** crawlers that don't run JavaScript (most AI crawlers, and link previews) see less than people do, and the copy drifts after every edit.
- **Fix:** move the landing copy (hero, `FAQ_ITEMS`, `INVOICE_POINTS`, `JOURNEY`) into `src/content/landing.js`, which both the components and `seo.config.js` import. Render the FAQ questions and answers into the prerendered body. Visible FAQs are what AI answers quote. Don't add FAQPage JSON-LD: Google retired that rich result.

### Medium

**6. JSON-LD is missing Organization and WebSite**
- **Fix:** next to the existing SoftwareApplication, add `Organization` (name, url, logo `https://kcreatio.com/logo/...`, `email: hello@kcreatio.com`, and `sameAs` once the brand's social profiles exist) and `WebSite` (name, url). Keep the single `price: 0` offer until paid plans launch; listing ₹299 and ₹599 now would advertise plans nobody can buy.

**7. Mobile performance (Core Web Vitals)**
- **Evidence (code):** the hero `FlowCanvas` is rendered with `active` always true, so its `requestAnimationFrame` loop keeps running after the hero scrolls off-screen. `CursorGlow`, a scroll listener that sets state every frame in the hero, and the How it works scroll listener all run as well. Fonts are self-hosted, but none is preloaded.
- **Impact:** medium, and rising. The audience is mid-range Android, where INP and battery suffer first.
- **Fix:** pause `FlowCanvas` with an IntersectionObserver when it's off-screen, and skip it on `(hover: none)`. Add `<link rel="preload" as="font" type="font/woff2" href="/fonts/inter-variable.woff2" crossorigin>` to `index.html`. Then measure with PageSpeed Insights (mobile). Target: LCP < 2.5s, INP < 200ms, CLS < 0.1.

**8. Footer "Product" links point at blocked app routes**
- **Evidence:** the footer links to `/dashboard`, `/invoices`, `/tds`, `/tax-planner` and `/deals`. All are disallowed in robots.txt and redirect logged-out visitors to login.
- **Fix:** link to the landing sections now (`#invoice`, `#tax-calculator`, `#how`, `#pricing`), then to `/features/*` and `/tools/*` as they ship. This is the start of the internal-linking plan in Phase 2.

### Low

**9. Search Console and Bing Webmaster Tools.** Confirm `kcreatio.com` is verified in both, and submit `sitemap.xml`. There's no way to measure anything in this plan without them.

**10. OG image subline.** "Invoices, brand deals and taxes — in one place." could become "Brand deal to tax return, sorted." to match the hero. Cosmetic.

## Prioritised action plan

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | Real 404: `404.html` + explicit SPA rewrites + route QA check | ½ day | Critical |
| 2 | `public/llms.txt` | 15 min | High for AI search |
| 3 | `noindex` + own titles for auth pages | 1 hr | High |
| 4 | Verify Search Console + Bing, submit sitemap | 30 min | Needed to measure everything else |
| 5 | Shared `src/content/landing.js`; FAQ in prerendered HTML | ½ day | High |
| 6 | `/tools/tax-calculator` as its own URL | 1 day | High (first page that can rank beyond the brand name) |
| 7 | Organization + WebSite JSON-LD | 1 hr | Medium |
| 8 | Pause off-screen canvas, preload font, PSI baseline | ½ day | Medium |
| 9 | Footer links → landing sections | 15 min | Medium |
| 10 | `/pricing`, `/features/*`, `/about` | per the roadmap | High, long term |

After items 1–5 ship, run `/claude-seo:seo-drift baseline https://kcreatio.com` so regressions show up after each deploy.
