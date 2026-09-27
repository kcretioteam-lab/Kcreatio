# Kcreatio — E2E Test Results

**Plan:** [`TEST_PLAN.md`](./TEST_PLAN.md) · **Suite:** [`qa/`](./qa)

## Fix round — 27 Sep 2026 (re-run after fixes)

| | Count | Share |
|---|---:|---:|
| Test cases executed | **75** | 100% |
| PASS | **74** | 98.7% |
| FAIL | **1** | 1.3% |

The only failure is **INV-10**. It needs a database change, not code: run `backend/migrations/019_invoice_client_request_id.sql` in the Supabase SQL Editor. The backend now warns about this at every startup:

```
[SCHEMA] invoices.client_request_id is missing — run 019_invoice_client_request_id.sql (retried invoice saves create duplicate invoices)
```

The re-run found one more bug, **BUG-13**, which is now fixed:

- **What:** For Basic users, the dashboard, tax planner, income and expenses pages and the onboarding checklist called Pro/Starter-only endpoints.
- **Impact:** The dashboard used `Promise.all`, so the 403 blanked everything on it: TDS summary, deadlines, recent invoices and deals. The other pages showed a "Failed to load" error toast behind the upgrade gate.
- **Fix:** These pages now skip calls the plan can't use, and the dashboard loads each section independently.
- **Verification:** the new UI-SWEEP-basic-desktop/-mobile cases.

Backend unit tests: 78/78, including 16 new tests for the classifier, TDS figures and email escaping. Frontend: 37/37. No new lint errors in any touched file (compared against HEAD).

### How each finding was fixed and verified

| Finding | Fix | Verified by |
|---|---|---|
| BUG-01 PDF fallback crash | `pdfService.ts` registers pdfmake's font VFS and awaits the promise-based `getBuffer()`. The type file now matches pdfmake 0.3. The fallback adds the Basic watermark and the Rule 46 lines. A process-level `unhandledRejection` handler logs instead of exiting | INV-08-FALLBACK (backend started with a bogus `CHROME_PATH`: both PDFs 200, server up, Basic watermarked, Pro clean) |
| BUG-02 Smart Inbox accept saved nothing | One shared `applyDetection()` (`services/detectionService.ts`) replaces the two copies. It drops the non-existent `extracted_data` column, uses the TDS the email states, logs unmatched payments at the taxable value plus a TDS row, and throws instead of marking a detection accepted without its record (API returns 422 and the detection stays pending) | INB-ACCEPT, INB-ACCEPT-TDS |
| BUG-03 Non-idempotent saves | Startup schema check warns about missing migrations. **Still needs migration 019 run on the DB** | INV-10 (fails until migrated) |
| BUG-04 Orphan TDS after deleting a paid deal | Deal delete removes the deal's own income and TDS rows (not ones tied to an invoice) | DEAL-07 |
| BUG-05 Duplicate TDS | `POST /tds` returns 409 `DUPLICATE` for the same invoice or the same brand/amount/TDS/date. The TDS page asks before saving a second copy (`allowDuplicate`) | TDS-05 |
| BUG-06 Payment wording missed | Classifier recognises NEFT/IMPS/RTGS/UTR and "processed / released / transferred ₹X" (not for SaaS receipts), and works out TDS from "after N% TDS" | INB-02 + unit tests |
| BUG-07 Form 16A mention hid the TDS | Form 16A only wins when the email isn't reporting a deduction. TDS amount and taxable value are read by context. The review form gains a "TDS deducted" field | INB-01 + unit tests |
| BUG-08 HTML injection in emails | `escapeHtml()` (`lib/html.ts`) applied to every dynamic value in every email template and the invoice-send email | SEC-08 (`emailService.test.ts`, which fails on the old code) |
| BUG-09 SAC field | New `format="sac"` (digits only, 6, starts with 99). No phantom default, "SAC code is required" when empty, every line validated, previews show "—" | INV-12, INV-04 |
| BUG-10 Missing Form 16A reminder | Added under the net-in-hand box | INV-06 |
| BUG-11 Files left after account deletion | `removeUserFiles()` deletes `<userId>/…`, `<userId>/docs/…` and the avatar before the user row; the whole request fails (safe to retry) if storage can't be cleared | ACC-DEL |
| BUG-12 Landing formatting / state order | `tabular-nums` and tokens on the calculator; states sorted by code | LND-05, INV-12 |
| O-1 Dev bypass | Honoured only when `NODE_ENV === 'development'` | SEC-06 |
| O-2 CORS 500 | Rejected origins get 403 and are no longer logged as unhandled errors | SEC-07 |
| O-3 Approve via GET | GET shows a confirm page; the grant happens on POST from its button (routes mounted outside CORS: token-authorised, and the form posts with `Origin: null`). `API_URL` added to `render.yaml` | PRM-02 (opening the link changes nothing) |
| O-4 Stale plan claim | `/auth/me` re-issues the session when the stored plan differs from the token | PRM-02 (same session gets Pro without re-login) |
| O-5 PDF cache ignores plan | Plan is part of the cache key (invoice PDF and CA export) | code |
| O-6 Reminder lookup | `tax_payments` lookup scoped to this FY and `advance_tax` | code |
| O-7 Quick estimate | Input clamped to the widget's limits (₹10 Cr/month, 50 brands); "brands" plural fixed in both engine copies | LND-04 |
| O-8 Stale-deal nudge | README corrected to describe the badge that exists (no scheduled nudge is built) | docs |
| O-9 IGST before state chosen | Tax box says "Pick the brand's state — GST shown as IGST until then" | manual |
| O-10 Chrome on Windows | `getChromePath()` finds Chrome/Edge under Program Files / LocalAppData | local runs used Puppeteer without `CHROME_PATH` |
| O-11 Unsanitised storage | By design (escape on output); covered by BUG-08 | SEC-01 |

---

# Original run — 26 Sep 2026

**Branch:** `fix/domain-kcreatio-com` (`c691f70`)

## 1. Executive summary

| | Count | Share |
|---|---:|---:|
| Test cases executed | **73** | 100% |
| PASS | **61** | 83.6% |
| FAIL | **12** | 16.4% |
| BLOCKED | 0 | 0% |

**Bug severity:** 2 Critical · 7 Major · 3 Minor (12 bugs, one per failed case). Section 4 lists 11 further observations that didn't fail a case.

The core money path works. GST maths (CGST/SGST vs IGST), Rule 46 labels, the net-in-hand figures, mark-paid → income/TDS, the tax engine (both regimes, surcharge with marginal relief, 4% cess, 15/45/75/100% instalments), plan gates, the premium request/approve flow, cookie-based auth and tenant isolation are all correct. The UI renders cleanly on all 9 app pages at desktop and mobile widths.

The two critical problems are elsewhere:

1. **One PDF request can take the whole backend down.** When Chrome isn't available to Puppeteer, the pdfmake fallback throws an uncaught error and the Node process exits (BUG-01).
2. **Smart Inbox "Accept" loses data silently.** Accepted TDS, payment and expense detections are marked accepted, but no record is created, because the inserts target a column that doesn't exist (BUG-02). The classifier also misses common payment wording (BUG-06, BUG-07).

### Environment

- Backend: `backend/dist/server.js` on :4000 (`NODE_ENV=development`, jobs off, no Resend key, so emails and OTPs go to the server log).
- Frontend: production build via `vite preview` on :5174 with an `/api` proxy (real cookie auth). Your own Vite dev server on :5173 was used for the dev-bypass check.
- Database: the Supabase project in `backend/.env`.
- Browser: Playwright 1.58 / Chromium, headless.
- All writes were confined to a throwaway account (`qa.e2e+1790444877331@kcreatio.com`) registered through the real OTP flow. It was deleted through `DELETE /auth/account` at the end, and its OTP logs and one leftover storage file were removed. Nothing else in the database was modified.
- After BUG-01 crashed the server, the backend was restarted with `CHROME_PATH` pointing at the installed Chrome, so the primary Puppeteer path could be tested.

### Spec interpretation

- The brief's "₹15,000,000 / ₹12,000,000" annual incomes were tested as ₹15 L / ₹12 L (the 87A threshold). The literal ₹1.5 Cr was also run as a surcharge case.
- The Rule 46 panel has **9** checks, not the "x/7" in the brief. The Kanban uses "Move to …" buttons rather than drag-and-drop. Neither was treated as a failure.

---

## 2. Detailed test matrix

### Landing page, public calculator, auth & premium

| ID | Status | Result |
|----|--------|--------|
| RES-02 | PASS | `GET /api/health` → 200 `{status:"ok"}` |
| LND-01 | PASS | ₹1,25,000/month: API and widget agree. Annual ₹15,00,000, TDS ₹1,50,000, receive ₹13,50,000, tax ₹1,09,200, refund ₹40,800 |
| LND-02 | PASS | ₹12 L/yr: tax ₹0 (87A), green "₹1,20,000 refund when you file ITR" banner, no advance-tax liability shown |
| LND-03 | PASS | ₹1.5 Cr: tax ₹48,79,680 (slab + 15% surcharge + 4% cess); owed ₹33,79,680; Q2 cumulative ₹15,20,856 (45%) |
| LND-04 | PASS | `abc` / negative / empty input → zeros, no 5xx. Minor: no upper bound (`1e12` accepted); copy reads "~1 of 3 **brand** likely late" |
| LND-05 | **FAIL** | Dark default, `--accent #e8921a`, ChaosHero scroll error-free, no mobile overflow. But the calculator's ₹ figures lack `tabular-nums` → BUG-12 |
| AUTH-01 | PASS | Registered via UI: Verify email → OTP → Confirm → password → terms → 201 → `/dashboard`; DB `plan=basic`, `is_email_verified=true` |
| AUTH-02 | PASS | `access_token` and `refresh_token` are `HttpOnly`, `SameSite=Strict` (Secure in production only); `document.cookie` is `""` |
| AUTH-03 | PASS | Logout clears both cookies; `/auth/me` → 401; the old refresh token → 401; wrong password 401; login 200; `/invoices` redirects to `/login` |
| AUTH-04 | PASS | Disposable email 422, duplicate 409, wrong OTP 400, weak password 422, forged verification token 422; no rows created |
| PRM-01 | PASS | Tax Planner gate → "Request premium access" modal → 201; `premium_requests` row pending; admin email with Approve link logged |
| PRM-02 | PASS | Approve link → "Approved ✓"; `plan=trial`, `trial_ends_at` +28 days; request approved; re-open → "Already approved ✓" |
| PRM-03 | PASS | Second request while pending → 409; forged token → 400; a session JWT used as an approve token → 400 |

### GST invoices

| ID | Status | Result |
|----|--------|--------|
| INV-01 | PASS | Karnataka → Karnataka ₹1,00,000: CGST ₹9,000 + SGST ₹9,000 = ₹1,18,000, `intrastate` (DB verified) |
| INV-02 | PASS | Karnataka → Maharashtra: IGST ₹18,000, total ₹1,18,000, `interstate` |
| INV-03 | PASS | Sticky action-bar pill: "RULE 46 5/9" → "✓ COMPLIANT" as fields are filled; checklist popover lists all 9 checks |
| INV-04 | PASS | Clearing SAC → 8/9 and Save disabled. The field still *displays* 998399 → see BUG-09 |
| INV-05 | PASS | UI: 14-char, bad-checksum and wrong-state GSTINs keep Save disabled. API: all three → 422 (INV-05-API) |
| INV-05-API | PASS | Bad checksum / 14 chars / state mismatch → 422 |
| INV-06 | **FAIL** | Figures correct (CGST/SGST ₹9,000 each, brand pays ₹1,18,000, TDS −₹10,000, you receive ₹1,08,000, amount in words). The promised Form 16A reminder is missing → BUG-10 |
| INV-07 | PASS | Picker shows 7 templates; on Basic, professional/vintage/evergreen/genz are locked; Modern selectable; 2nd line ₹50,000 → ₹1,77,000 |
| INV-07-API | PASS | Basic: classic/modern/compact → 201; the other four → 403 `PLAN_REQUIRED` |
| INV-SAVE-UI | PASS | Two-line invoice saved from the editor → 201; DB total ₹1,77,000, template modern, CGST/SGST ₹13,500 each |
| INV-08 | PASS | Basic PDF (Puppeteer) has the "Made with ease on kcreatio.com" footer; PDF text has CGST @ 9%, SGST @ 9%, amount in words, Reverse Charge, SAC |
| INV-08-FALLBACK | **FAIL** | Backend process crashes → BUG-01 |
| INV-09 | PASS | After approval (plan `trial`): no watermark footer; the "professional" template is accepted |
| INV-10 | **FAIL** | Retried save with the same `clientRequestId` creates a duplicate invoice → BUG-03 |
| INV-11 | PASS | Numbers sequential per FY: `INV/2627/0001…0004` → next `0005` |
| INV-12 | **FAIL** | SAC input: phantom default, no filter, UI/API mismatch → BUG-09 |
| JOB-01 | PASS | Sent invoice due 31 Aug → the overdue job's query flips it to `overdue`; not-yet-due invoices untouched (job has no manual trigger, so its exact query was replayed for the QA user) |

### TDS

| ID | Status | Result |
|----|--------|--------|
| TDS-01 | PASS | Deal ₹50,000 → Mark paid dialog (suggests TDS ₹5,000 / received ₹45,000) → income ₹50,000 (taxable value), TDS ₹5,000 "awaiting", deal paid |
| TDS-02 | PASS | Manual ₹45,000 @ 10% → TDS ₹4,500, received ₹40,500, Q2, FY 2026-27 |
| TDS-03 | PASS | "Mark requested" → upload Form 16A → received. Summary received ₹0 → ₹4,500, pending ₹13,500 → ₹9,000; stat cards update without reload |
| TDS-04 | PASS | Banner "₹13,500 claimable at ITR" = DB sum of the FY's rows, plus "Collect Form 16A…" reminder |
| TDS-05 | **FAIL** | Identical entry accepted twice → BUG-05 |
| TDS-06 | PASS | Basic: entries up to 10 accepted; 11th → 403 `QUOTA_EXCEEDED` |
| TDS-07 | PASS | TDS above taxable value → 422; negative amount → 422 |

### Advance tax planner

| ID | Status | Result |
|----|--------|--------|
| TAX-01 | PASS | ₹15 L professional income: `standardDeduction` 0, taxable ₹15,00,000, tax ₹1,09,200 |
| TAX-02 | PASS | Old regime ₹2,62,500 + cess ₹10,500 = ₹2,73,000; new regime ₹1,05,000 + ₹4,200 = ₹1,09,200 |
| TAX-03 | PASS | ₹1.5 Cr: slab ₹40,80,000 + 15% surcharge ₹6,12,000 + cess ₹1,87,680; at ₹50.1 L marginal relief caps surcharge at ₹7,000 |
| TAX-04 | PASS | Net ₹2,98,500 → Jun 15 ₹44,775 · Sep 15 ₹1,34,325 · Dec 15 ₹2,23,875 · Mar 15 ₹2,98,500 (15/45/75/100%) |
| TAX-05 | PASS | Basic → 403 `SUBSCRIPTION_REQUIRED` |
| TAX-06 | PASS | `/tax/deadlines` lists GSTR-1/3B and Q3 advance tax. The reminder job can't be triggered locally; reviewed in code (see observation O-6) |
| TAX-07 | PASS | Backend vitest 62/62, frontend 37/37, both checked against `taxCases.json` |
| TAX-UI | PASS | Planner renders the instalment schedule; the Old toggle re-queries `?regime=old` and updates the figures |

### Brand deals

| ID | Status | Result |
|----|--------|--------|
| DEAL-01 | PASS | Created ₹75,000 deal in the UI; inquiry → negotiating → active → delivered (each PUT 200). No drag-and-drop (by design) |
| DEAL-02 | PASS | `PUT {status:'paid'}` → 422 `USE_MARK_PAID` |
| DEAL-03 | PASS | Second mark-paid → 409; still one income row |
| DEAL-04 | PASS | "Create invoice" → `/invoices/new?deal_id=…`; brand name, email, ₹75,000 and SAC 998399 pre-filled |
| DEAL-05 | PASS | Saving that invoice links `deal_id`, and the deal moves to `invoiced` |
| DEAL-06 | PASS | A deal aged 20 days shows a "20d in stage" badge. No scheduled nudge exists (observation O-8) |
| DEAL-07 | **FAIL** | Deleting a paid deal leaves its TDS credit behind → BUG-04 |

### Smart Inbox

| ID | Status | Result |
|----|--------|--------|
| INB-01 | **FAIL** | Review card, timestamp and provenance reasons work, but a TDS email mentioning "Form 16A" is misclassified → BUG-07 |
| INB-02 | **FAIL** | "We have processed ₹45,000 … after 10% TDS" → `other`, confidence 0 → BUG-06 |
| INB-03 | PASS | "we want to collaborate…" → `deal_inquiry` (0.4), never `deal_confirmed` |
| INB-04 | PASS | Bell badge 3 = 3 pending; after rejecting one → 2 |
| INB-05 | PASS | Basic → 403 `PLAN_REQUIRED` |
| INB-ACCEPT | **FAIL** | Accept → HTTP 200 and "accepted", but no TDS or income row is created → BUG-02 |

### Security, resilience, UI health

| ID | Status | Result |
|----|--------|--------|
| SEC-01 | PASS | `<img onerror>`/`<script>` in brand name, address and notes: rendered as text in the list, editor preview and PDF; no dialog fired |
| SEC-01-API | PASS | Payload stored verbatim (no server-side sanitising; output escaping holds in UI and PDF) |
| SEC-02 | PASS | `' OR '1'='1'; DROP TABLE…` stored literally; injected query params return only the user's own rows |
| SEC-03 | PASS | 10 protected endpoints → 401 without cookies |
| SEC-04 | PASS | Another user's invoice/PDF/delete → 404; foreign TDS update → 404, unchanged; foreign deal mark-paid → 404 |
| SEC-05 | PASS | Wrong-secret, `alg=none`, expired and 2FA-challenge tokens → 401 |
| SEC-06 | PASS | Works as designed in non-production, but `X-Dev-User-Id: <any uuid>` grants full access as that user with plan "pro" (observation O-1) |
| SEC-07 | PASS | Helmet headers present, no `X-Powered-By`, the foreign origin gets no CORS header. It comes back as HTTP 500, though (observation O-2) |
| SEC-08 | **FAIL** | Invoice email HTML is not escaped → BUG-08 (code review) |
| RES-01 | PASS | Dev server: all 9 pages render as MOCK_USER with no page errors; backend stays up (56 API calls 5xx because `dev-bypass-user` isn't a UUID; the UI degrades gracefully) |
| UI-CONSOLE-INVOICE | PASS | Invoice session: 0 page errors, 0 console errors, no unexpected failed calls |
| UI-CONSOLE-DEALS-TDS | PASS | Deals/TDS session: 0 page/console errors |
| UI-SWEEP-desktop | PASS | 9 pages at 1440 px: no errors, no failed calls, no overflow |
| UI-SWEEP-mobile | PASS | 9 pages at 390 px: no errors, no failed calls, no overflow |
| ACC-DEL | **FAIL** | Account and all rows deleted, but uploaded files stay in storage → BUG-11 |

---

## 3. Bug reports

### BUG-01 · Critical · PDF fallback crashes the backend process (INV-08-FALLBACK)

**Steps**
1. Run the backend where Puppeteer can't launch Chrome. Locally on Windows this is the default: `getChromePath()` returns `'google-chrome'`. On Render it happens whenever Chromium fails to start or is OOM-killed.
2. `GET /api/v1/invoices/:id/pdf` as any user.

**Expected:** The pdfmake fallback returns a PDF (watermarked for Basic).
**Actual:** Node exits. Every user is offline until Render restarts the service. The next PDF request repeats the crash.

```
Puppeteer PDF failed, falling back to pdfmake: Error: Browser was not found at the configured executablePath (google-chrome)
D:\Kcreatio\backend\node_modules\pdfmake\build\pdfmake.js:8961
      throw new Error(`File '${normalizedFilename}' not found in virtual file system`);
Error: File 'Roboto-Medium.ttf' not found in virtual file system
    at VirtualFileSystem.readFileSync (pdfmake.js:8961:13) … at DocMeasure.measureNode
Node.js v24.14.0          ← process exited (background task "failed with exit code 1")
```

**Cause:**
- `backend/src/services/pdfService.ts:1` imports `pdfmake/build/pdfmake.js` but never loads `vfs_fonts`, so the Roboto fonts don't exist.
- `pdf.getBuffer()` (line 180) throws inside an async callback that the surrounding `try/catch` can't catch.
- `generateInvoicePdf()` has no watermark logic, so even a working fallback would hand Basic users clean PDFs.

**Network:** The request never completes (socket hang-up); all later requests get `ECONNREFUSED` (`fetch failed` × 15 in the suite log).

### BUG-02 · Critical · Accepting Smart Inbox detections never creates the record (INB-ACCEPT)

**Steps**
1. As Starter/Pro, `POST /email-detections/paste`:
   - subject "TDS deducted on invoice INV/2627/0001"
   - body "TDS of Rs. 10,000 has been deducted under Section 194J on your invoice of Rs. 1,00,000. TAN: BLRM12345C."
2. `PUT /email-detections/:id/accept`.
3. Repeat with "Rs. 45,000 has been credited … after deducting TDS of Rs. 5,000." (no matching invoice).

**Expected:** A `tds_records` row (TDS ₹10,000 on ₹1,00,000) and an `income` row (₹45,000), linked from the detection.
**Actual:** Both return **HTTP 200**, and the detection's `status='accepted'`, but `linked_tds_id` and `linked_income_id` are `null` and no rows exist. The user believes the TDS and income were logged.

**Cause:** The inserts write `extracted_data`, but `tds_records`, `income` and `expenses` have no such column (no migration adds one), and the insert error is ignored:

```
Could not find the 'extracted_data' column of 'tds_records' in the schema cache
```

Affected code:
- `routes/emailDetections.ts:331` (TDS) and `:350` (expense)
- `services/paymentService.ts:95` (income)
- the Gmail auto-apply job at `jobs/scheduledJobs.ts:217, 230`

**Also wrong even once the insert works:** for the TDS email, the classifier's `amount` is the TDS (10,000). `emailDetections.ts:311` treats it as the invoice value, so it would log TDS ₹1,000 on a ₹10,000 invoice, understating the credit tenfold.

### BUG-03 · Major · Invoice saves aren't idempotent: migration 019 missing in the configured DB (INV-10)

**Steps:** `POST /invoices` twice with the same `clientRequestId`.
**Expected:** The 2nd call returns 200 with the same invoice (the CLAUDE.md contract).
**Actual:** 201 twice, with two invoice numbers. The configured Supabase project has no `invoices.client_request_id` column (`column invoices.client_request_id does not exist`). `routes/invoices.ts:260/430` silently switches idempotency off and never warns. Every network retry from the editor can mint a duplicate GST invoice number.
**Fix:** Apply `019_invoice_client_request_id.sql`, and log loudly (or fail the health check) when the column is missing.

### BUG-04 · Major · Deleting a paid deal leaves its TDS credit behind (DEAL-07)

**Steps:** Create a ₹50,000 deal → Mark paid (received ₹45,000, TDS ₹5,000) → Delete Deal.
**Expected:** The deal's income and TDS go together (or deletion of paid deals is blocked).
**Actual:** Income deleted; the TDS row stays with `deal_id = NULL`. The TDS banner/summary still counts it (₹13,500 total) and it feeds the ITR credit and `/tax/estimate`. `routes/deals.ts:201` deletes `income` only, and `tds_records.deal_id` is `ON DELETE SET NULL`.

### BUG-05 · Major · Duplicate TDS entries accepted (TDS-05)

**Steps:** `POST /tds` twice with identical `{brandName:'Duplicate Brand', invoiceAmount:20000, tdsRate:10, paymentDate, invoiceId}`.
**Expected:** The 2nd is rejected, or the user is warned.
**Actual:** 201 / 201, two rows, and the ₹2,000 credit is counted twice in the banner and the tax estimate. `routes/tds.ts:95` has no duplicate check, not even on `invoice_id`.

### BUG-06 · Major · Classifier misses common payment wording (INB-02)

**Steps:** Paste "We have processed ₹45,000 for campaign X after 10% TDS".
**Expected:** `payment_received` with amount 45,000 and TDS 10%.
**Actual:** `type=other`, confidence 0, reasons `["No patterns matched"]`. Probing `classifyEmail()` directly:
- "transferred INR 45,000 via NEFT" → `other`/0.
- Only "credited" wording is recognised (0.68), and even then the "TDS of Rs. 5,000" in the same sentence isn't extracted.

### BUG-07 · Major · TDS emails that mention Form 16A lose their amounts (INB-01)

**Steps:** Paste "TDS of Rs. 10,000 has been deducted under Section 194J on your invoice of Rs. 1,00,000. TAN: BLRM12345C. Form 16A will be issued quarterly."
**Expected:** `tds_deduction` with the amount, rate and TAN.
**Actual:** `form_16a` (0.75), extracted `{brand_name, contact_email}` only. The same text without the last sentence → `tds_deduction` 0.9. The Form 16A rule wins over the TDS rule, and its extraction drops everything else.

### BUG-08 · Major · HTML injection in invoice emails (SEC-08, code review)

**Location:** `routes/invoices.ts:744`. `POST /invoices/:id/send` builds the email with raw `${inv.brand_name}` and `${user.business_name || user.name}`. SEC-01 confirmed brand names are stored verbatim (`<img src=x onerror=…>` saved as-is).
**Impact:** Any creator can make Kcreatio's sending domain (or a connected Gmail) deliver arbitrary links, images and styled content to any `brand_email`. That's a phishing vector that rides on Kcreatio's sender reputation.
**Why not executed:** `RESEND_API_KEY` is unset locally, so only the subject line is logged.
**Fix:** Reuse the existing `esc()` helper from `premiumRequests.ts`.

### BUG-09 · Minor · SAC field: phantom default, no input filter, UI/API mismatch (INV-12, INV-04)

**Location:** `frontend/src/pages/InvoicePage.jsx:1739`, `value={line.sacCode || '998399'}`.
**Behaviour:**
1. Clearing the field sets state to `''` but still *shows* 998399, so the Rule 46 pill drops to 8/9 with no visible cause.
2. Typing then appends to the phantom text (`998399` + `998399` → `998399998399`).
3. Letters and symbols are accepted (`…12345678abc!`).
4. With 12 digits the pill shows "✓ COMPLIANT" and Save is enabled, but `POST /invoices` → **422** "Sac code is too long (max 10 characters)".

**Fix:** Controlled empty value, digits only, max length matching the Zod `.max(10)` (SAC is 6 digits). This is the project's own `<Input format>` rule.

### BUG-10 · Minor · Net-in-hand box has no Form 16A reminder (INV-06)

The README promises "…net creator receives, with a Form 16A reminder". The box ends with "TDS credit at ITR: +₹10,000.00 — not lost, claimable when you file" (`InvoicePage.jsx:1000`) and never mentions collecting Form 16A. All the figures are correct.

### BUG-11 · Major · Account deletion leaves uploaded documents in storage (ACC-DEL)

**Steps:** Upload a Form 16A on `/tds` → Settings → delete account.
**Expected:** The user's files are removed along with their data.
**Actual:** All DB rows cascade correctly, but `invoice-signatures/<userId>/docs/form16a_….pdf` stays in the bucket. That file carries PAN and income data. The same applies to avatars, signatures and UPI QR images under `<userId>/`. `DELETE /auth/account` (`routes/auth.ts:636`) never touches storage. This is a privacy/DPDP exposure for a product that stores tax documents. (The suite removed its own file afterwards.)

### BUG-12 · Minor · Landing calculator formatting and state-list order (LND-05)

- None of the 4 ₹ figures in the landing calculator use `font-variant-numeric: tabular-nums` (README: "All ₹ values use tabular-nums"). They also use hard-coded `#e53e3e` / `#48bb78` instead of tokens.
- Every state dropdown lists 10 → 38, 97, then **01–09** (J&K … Uttar Pradesh) at the bottom. `INDIAN_STATES = Object.entries(STATE_CODES)` (`frontend/src/utils/gst.js:18`) puts integer-like keys first.

---

## 4. Observations (no failed case, worth fixing)

| # | Area | Observation |
|---|------|-------------|
| O-1 | Security | `X-Dev-User-Id` impersonates **any** user id, with plan defaulting to `pro`, whenever `NODE_ENV !== 'production'`. Any staging or preview deploy that forgets `NODE_ENV=production` while pointed at real data is fully open. Consider an explicit `DEV_BYPASS=1` opt-in as well |
| O-2 | API | A disallowed CORS origin returns **HTTP 500** `INTERNAL_ERROR` and logs "Unhandled error", because the CORS callback's `Error` falls into the global handler (`server.ts:64`) |
| O-3 | Premium | Approval is a `GET` with side effects. Email link scanners (Outlook Safe Links, corporate gateways) that pre-fetch URLs can approve requests before the admin clicks |
| O-4 | Plans | After approval the user's session keeps its `basic` JWT claim until the token refreshes (≤15 min): `/tax/estimate` → 403 until re-login or refresh |
| O-5 | PDF | The PDF cache key is `invoice.id:updated_at`, not the plan. A user who upgrades can get the watermarked copy for up to 5 min (not reproduced in this run) |
| O-6 | Jobs | The advance-tax reminder looks up `tax_payments` by `user_id + quarter` with `.maybeSingle()` and no FY/type filter (`scheduledJobs.ts:58`). From a user's second year it errors and the email says "Check app". Jobs have no manual trigger, which makes them hard to test |
| O-7 | Tax widget | `quick-estimate` has no upper bound (`monthly_income=1e12` accepted); copy says "~1 of 3 **brand** likely late" (`taxEngine.ts:170` pluralises on `lateCount`, not `brandCount`) |
| O-8 | Deals | README's "Deal stale alerts — scheduled nudge" is only a client-side "Nd in stage" badge; no job exists |
| O-9 | Invoice | Before a brand state is chosen, the live tax box defaults to "INTERSTATE — IGST" |
| O-10 | Local dev | `getChromePath()` has no Windows candidates, so on Windows every PDF request trips BUG-01 unless `CHROME_PATH` is set |
| O-11 | Security | Brand name, address and notes are stored unsanitised. The UI and PDF escape them correctly today; BUG-08 shows what happens where they don't |

---

## 5. How to re-run

```bash
# backend, writing stdout to a log the suite reads OTPs and approve links from (Chrome is found automatically)
cd backend && npm run build && node -r dotenv/config dist/server.js > ../qa/out/backend.log 2>&1
# production build with same-origin API, served on :5174 (in Git Bash prefix MSYS_NO_PATHCONV=1)
cd frontend && VITE_API_URL=/api/v1 npx vite build --outDir ../qa/.dist-prod && npx vite preview --outDir ../qa/.dist-prod --port 5174
# suite — pauses before 09-pdf-fallback so you can restart the backend with CHROME_PATH=C:/does-not-exist/chrome.exe
cd qa && npm install && BACKEND_LOG=out/backend.log npm run e2e
```

- Screenshots, PDFs and `results.json` land in `qa/out/`, which is git-ignored.
- Every case is now asserted by the scripts (the original run recorded INV-08-FALLBACK, INV-10 and INV-12 by hand). SEC-08 is covered by `backend/src/services/__tests__/emailService.test.ts`.
- The suite gives each API client its own `X-Forwarded-For` to stay under the 150-per-15-min rate limit. That only works because nothing sits in front of the local backend.
