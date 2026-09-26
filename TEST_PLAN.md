# Kcreatio — End-to-End Test Plan

Scope: every feature listed as "Completed" in `README.md`, exercised through the real UI (Chrome via Playwright) and the REST API (`/api/v1`), with database state checked afterwards.

Results for the latest run are in [`TEST_RESULTS.md`](./TEST_RESULTS.md). The automated suite lives in [`qa/`](./qa).

---

## 1. Environment

| Component | How it runs for the suite |
|-----------|---------------------------|
| Backend | `cd backend && npm run build && node -r dotenv/config dist/server.js` on `:4000`, `NODE_ENV=development`, `ENABLE_JOBS` off, no `RESEND_API_KEY` (emails and OTPs are written to the server log) |
| Frontend (real auth) | Production build (`VITE_API_URL=/api/v1 vite build`) served by `vite preview` on `:5174`. `/api` is proxied to `:4000`, so cookies are first-party |
| Frontend (dev bypass) | `vite` dev server on `:5173` (sends `X-Dev-User-Id: dev-bypass-user`) |
| Database | The Supabase project configured in `backend/.env`. Tests only write rows owned by a dedicated QA account and delete the account at the end |
| Browser | Chromium (Playwright 1.58), headless, desktop 1440×900 and mobile 390×844 |

### Test data

- **QA creator**: `qa.e2e+<timestamp>@kcreatio.com`, registered through the real OTP flow, then given the GSTIN `29AAACK1234A1Z5` (Karnataka, state code 29).
- **Intra-state brand**: Karnataka (state code 29).
- **Inter-state brand**: Maharashtra (state code 27), GSTIN `27AAACB1234C1Z2`.
- **Plans**: The account starts on Basic. It moves to `trial` (the same level as Pro) through the premium-request approval link, so both Basic and Pro behaviour are tested on the same account.

### Rate limits the suite must respect

The backend allows 150 requests per 15 minutes per IP globally, 10 per 15 minutes on `/auth/*`, and 20 PDFs per hour per user. Express trusts one proxy hop, so the suite gives each test group its own `X-Forwarded-For` value. That only works because nothing sits in front of the local backend (see SEC-06).

### Interpretation of spec amounts

The brief quotes "₹15,000,000" (₹1.5 Cr) and "₹12,000,000" (₹1.2 Cr) as annual incomes. The product's documented refund threshold is ₹12,00,000 (₹12 L, the Section 87A limit), so the plan tests **₹15 L and ₹12 L** as the intended values. It also runs the literal ₹1.5 Cr figure as an extra surcharge case. The public calculator takes **monthly** income, so the widget receives the annual figure ÷ 12.

---

## 2. Test cases

Priority: **P1** = money/tax correctness, security, or data loss; **P2** = core workflow; **P3** = visual/UX.

### 2.1 Landing page, public tax calculator & onboarding

| ID | Pri | Scenario | Steps | Expected |
|----|-----|----------|-------|----------|
| LND-01 | P1 | Quick estimate, ₹15 L/yr | `GET /tax/quick-estimate?monthly_income=125000&brand_count=3`; type `125000` into the landing widget | annual ₹15,00,000; TDS ₹1,50,000 (10%); received ₹13,50,000; income tax ₹1,09,200 (new regime, no 87A, 4% cess); refund ₹40,800; advance tax owed ₹0. UI shows the same figures |
| LND-02 | P1 | Refund banner at ≤ ₹12 L | Widget with `100000`/month (₹12 L/yr) | Tax ₹0 (87A rebate); green "₹1,20,000 refund when you file ITR" banner; no advance-tax liability shown |
| LND-03 | P1 | High income (literal ₹1.5 Cr) | `monthly_income=1250000` | Tax = slab + 15% surcharge + 4% cess; advance tax owed > 0; Q2 cumulative = 45% of net payable |
| LND-04 | P2 | Bad input to public endpoint | `monthly_income=abc`, `-5000`, `1e12` | 200 with zeros for garbage/negative; no 500; huge values don't crash |
| LND-05 | P3 | Landing visual | Load `/` on desktop and mobile; scroll through ChaosHero | No console errors; no horizontal scroll on mobile; saffron accent `#E8921A` present; dark theme by default; ₹ figures use `tabular-nums` |
| AUTH-01 | P1 | Register with OTP | `/register` → name, email → Send OTP → enter OTP from server log → Verify → password → accept terms → Create | 201; redirected into the app; `users` row with `plan='basic'`, `is_email_verified=true` |
| AUTH-02 | P1 | httpOnly session cookies | After AUTH-01 inspect cookies and `document.cookie` | `access_token` and `refresh_token` are `HttpOnly`, `SameSite=Strict` (dev); `document.cookie` has neither |
| AUTH-03 | P2 | Login / logout | Log out → log in with email + password | Login 200 sets cookies; logout clears them; protected page redirects to `/login` after logout |
| AUTH-04 | P1 | Register validation | Weak password, disposable email, wrong OTP, duplicate email | 422 / 400 / 409 with a clear message; no user row created |
| PRM-01 | P1 | Request 28 days of Pro | As Basic, open the request modal → pick features, platform, followers → Submit | 201; `premium_requests` row `status='pending'`; server log shows admin email with an Approve link |
| PRM-02 | P1 | Approve link | Open the Approve link | 200 "Approved ✓"; user `plan='trial'`, `trial_ends_at` ≈ now + 28 days; request `status='approved'` |
| PRM-03 | P2 | Duplicate / tampered requests | Second request while pending; approve with a forged token | 409 "already pending"; 400 "Link invalid or expired" |

### 2.2 GST invoice generator & settings

| ID | Pri | Scenario | Steps | Expected |
|----|-----|----------|-------|----------|
| INV-01 | P1 | Intra-state GST | Invoice for a Karnataka brand, ₹1,00,000 @ 18% | CGST ₹9,000 + SGST ₹9,000; total ₹1,18,000; `supply_type` intra; labels "CGST @ 9%" / "SGST @ 9%"; amount in words present |
| INV-02 | P1 | Inter-state GST | Maharashtra brand with GSTIN `27…` | IGST ₹18,000; CGST/SGST 0; total ₹1,18,000 |
| INV-03 | P1 | Rule 46 compliance panel | Open the new-invoice form | Sticky footer shows "RULE 46 x/7" and updates live as fields are filled |
| INV-04 | P1 | SAC code cleared | Clear SAC code | Compliance error shown and save is blocked (UI) |
| INV-05 | P1 | Malformed brand GSTIN | UI: 14 characters / bad checksum. API: `brandGstin` with a bad checksum, or a state code that doesn't match | UI blocks save; API returns 422 |
| INV-06 | P1 | Net-in-hand breakdown | Invoice ₹1,00,000 intra-state | Brand pays ₹1,18,000; TDS ₹10,000 (10% of taxable value); creator receives ₹1,08,000; Form 16A reminder |
| INV-07 | P2 | Templates & extras | Switch templates; add a second service line, bank details, UPI | Preview updates; Basic can save classic/modern/compact only (others → 403 `PLAN_REQUIRED`) |
| INV-08 | P1 | Basic PDF watermark | `GET /invoices/:id/pdf` as Basic | PDF contains the Kcreatio watermark text and the "kcreatio.com" footer |
| INV-09 | P1 | Pro PDF clean | Same after PRM-02 (plan `trial`) | No watermark text in the PDF |
| INV-10 | P2 | Idempotent save | POST the same `clientRequestId` twice | Second call returns 200 with the same invoice id; one DB row |
| INV-11 | P2 | Next invoice number | `GET /invoices/next-number` | `INV/<FY>/NNN` sequential |

### 2.3 TDS tracker

| ID | Pri | Scenario | Steps | Expected |
|----|-----|----------|-------|----------|
| TDS-01 | P1 | TDS from a payment | Deal ₹50,000 → mark paid: received ₹45,000, TDS ₹5,000 | `income` row = ₹50,000 (taxable value); `tds_records` row ₹5,000, `form_16a_status='awaiting'` |
| TDS-02 | P1 | Manual TDS entry | `POST /tds` taxable ₹45,000 @ 10% | tds_amount ₹4,500, received ₹40,500, quarter set |
| TDS-03 | P1 | Form 16A status | `PUT /tds/:id {form16aStatus:'received'}`; reload TDS page | Summary `form16aReceived` rises and `pending` falls by the same amount; UI reflects it |
| TDS-04 | P2 | ITR claimable banner | Open `/tds` | Green banner total = sum of this FY's `tds_amount` |
| TDS-05 | P2 | Duplicate TDS entry | POST an identical entry twice (same brand, amount, date, invoice) | User warned or duplicate rejected |
| TDS-06 | P2 | Basic plan quota | 11th entry on Basic | 403 `QUOTA_EXCEEDED` (limit 10) |
| TDS-07 | P1 | TDS > taxable value | `tdsAmount` above `invoiceAmount` | 422 |

### 2.4 Advance tax planner

| ID | Pri | Scenario | Steps | Expected |
|----|-----|----------|-------|----------|
| TAX-01 | P1 | No standard deduction on professional income | `GET /tax/estimate?annualEstimate=1500000&regime=new` | `standardDeduction=0`, `taxableIncome=1500000` |
| TAX-02 | P1 | Old vs new regime | Same income, `regime=old` vs `new`; toggle in the UI | Old: ₹2,73,000 (slabs 5/20/30 + cess); new: ₹1,09,200; UI updates on toggle |
| TAX-03 | P1 | Surcharge & cess | `annualEstimate=15000000` | 15% surcharge over ₹1 Cr (marginal relief applied), then 4% cess |
| TAX-04 | P1 | Instalment schedule | Any income where net payable ≥ ₹10,000 | Q1 Jun 15 15%, Q2 Sep 15 45%, Q3 Dec 15 75%, Q4 Mar 15 100% (cumulative) |
| TAX-05 | P2 | Basic plan gate | `/tax/estimate` as Basic | 403 `SUBSCRIPTION_REQUIRED` |
| TAX-06 | P2 | Deadline reminders (14-day / 2-day) | Inspect the job logic; `GET /tax/deadlines` | Deadlines listed; reminder fires when days-until equals the user's preference or 2 |
| TAX-07 | P1 | Frontend/backend parity | Run `taxCases.json` through both engines (`npm test`) | All cases agree |

### 2.5 Brand deal CRM & smart pre-fill

| ID | Pri | Scenario | Steps | Expected |
|----|-----|----------|-------|----------|
| DEAL-01 | P2 | Pipeline lifecycle | Create a deal; move inquiry → negotiating → active → delivered → invoiced (UI and API) | Status saved at each step; card shows in the right column |
| DEAL-02 | P1 | Paid only via Mark paid | `PUT /deals/:id {status:'paid'}` | 422 `USE_MARK_PAID` |
| DEAL-03 | P1 | Mark paid logs income | `POST /deals/:id/mark-paid` | Deal `paid`; income auto-logged on the taxable value; second call → 409 |
| DEAL-04 | P2 | Pre-fill from deal | `/invoices/new?deal_id=<id>` | Brand name, amount and contact email pre-filled; SAC 998399 default |
| DEAL-05 | P2 | Invoice from deal flips status | Save the pre-filled invoice | Deal status → `invoiced` |
| DEAL-06 | P2 | Stale deal badge | Deal with `updated_at` > 14 days ago | Card shows "Nd in stage"; README also promises a scheduled nudge |
| DEAL-07 | P1 | Deleting a paid deal | Delete a deal that was marked paid | Linked income removed; TDS and payment rows don't become orphans |

### 2.6 Smart Inbox

| ID | Pri | Scenario | Steps | Expected |
|----|-----|----------|-------|----------|
| INB-01 | P2 | Payment / TDS detection card | `POST /email-detections/paste` with payment and TDS emails; open the inbox UI | Detection `pending_review` with confidence, reasons (provenance) and timestamp; card rendered |
| INB-02 | P1 | Paste classifier extraction | "We have processed ₹45,000 for campaign X after 10% TDS" | Type payment/TDS; amount 45,000; TDS rate 10; brand extracted where given |
| INB-03 | P1 | Outreach is never a confirmed deal | "Hey, we want to collaborate…" | Classified as outreach (or low confidence); never auto-applied as `deal_confirmation` |
| INB-04 | P3 | Bell badge | Pending detections exist → TopBar bell; accept/reject one | Count equals pending items and changes after accept/reject |
| INB-05 | P2 | Basic plan gate | Paste as Basic | 403 `PLAN_REQUIRED` |

### 2.7 Jobs, security & resilience

| ID | Pri | Scenario | Steps | Expected |
|----|-----|----------|-------|----------|
| JOB-01 | P1 | Invoice auto-overdue | Sent invoice with a past due date → run the job's update (scoped to the QA user) | Status → `overdue` |
| SEC-01 | P1 | XSS in brand name / notes | Save `<script>alert(1)</script>` / `<img src=x onerror=…>` in brand name and notes; view the list, preview and PDF | Stored as text; never executed (no dialog); escaped in the PDF HTML |
| SEC-02 | P1 | SQL-injection strings | `' OR '1'='1` in brand name and query params | Stored literally; no data from other users; no 500 |
| SEC-03 | P1 | Unauthenticated access | `GET /invoices`, `/tds`, `/deals`, `/income`, `/tax/estimate` without cookies | 401 |
| SEC-04 | P1 | Tenant isolation | QA user fetches another user's invoice id / updates a foreign TDS id | 404; no change |
| SEC-05 | P1 | Forged / expired JWT | Cookie signed with a wrong secret; a 2FA challenge token used as an access token | 401 |
| SEC-06 | P2 | Dev bypass header | `X-Dev-User-Id: <QA uuid>` with no cookie (local, non-production) | Documents the behaviour: full access as that user. Must be impossible in production |
| SEC-07 | P2 | Security headers & CORS | Inspect response headers; request from `Origin: https://evil.example` | Helmet headers present; CORS rejects the foreign origin (and not with a 500) |
| RES-01 | P2 | Dev bypass UI | Load the dev server (`:5173`) pages | App renders with MOCK_USER; no uncaught errors; backend stays up |
| RES-02 | P2 | Health | `GET /api/health` | 200 `{status:'ok'}` |

### 2.8 Cases added during execution

| ID | Pri | Scenario | Expected |
|----|-----|----------|----------|
| INV-08-FALLBACK | P1 | PDF request when Puppeteer can't start Chrome | pdfmake fallback returns a (watermarked) PDF; the server stays up |
| INV-12 | P2 | SAC field input rules | Only digits, max 6–10 characters; clearing it shows an empty field; UI validation mirrors the backend |
| INV-SAVE-UI | P1 | Save a two-line invoice from the editor | 201; DB total matches the preview |
| INB-ACCEPT | P1 | Accept a TDS / payment detection | Linked `tds_records` / `income` row created with the amounts the email states |
| TAX-UI | P2 | Tax planner page | Instalments shown; regime toggle re-queries and updates figures |
| SEC-08 | P1 | Invoice email HTML | User-controlled fields are HTML-escaped in outbound email (code review) |
| ACC-DEL | P1 | Delete account | All rows and uploaded files removed |
| UI-SWEEP-desktop / -mobile | P2 | All 9 app pages at 1440 px and 390 px | No console/page errors, failed calls or horizontal overflow |

### 2.9 Cross-cutting UI checks (applied to every page visited)

- No uncaught exceptions or `console.error` in the browser.
- No failed network requests (4xx/5xx) other than those a test expects.
- Nothing overflows horizontally at 390 px width.

---

## 3. Exit criteria

- Every P1 case passes, or has a bug report with severity.
- The QA account and all its rows are removed (`DELETE /auth/account`).
