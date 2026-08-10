# Kcreatio — Frontend

React 18 + Vite app for Indian content creators to manage GST invoices, TDS, brand deals, and advance tax planning.

---

## Tech Stack

- **React 18** + **Vite 8** (Rolldown)
- **React Router v6** — file-based routing via `App.jsx`
- **Lucide React** — icons
- **date-fns** — date formatting
- **Axios** — API client with JWT refresh interceptor
- No component library — pure CSS custom properties

---

## Project Structure

```
src/
├── App.jsx                    # Router, ThemeContext, auth bypass
├── hooks/
│   ├── useAuth.jsx            # Auth context (MOCK_USER for dev bypass)
│   └── useToast.jsx           # Toast notification hook
├── utils/
│   ├── api.js                 # Axios instance (withCredentials, X-Dev-User-Id header)
│   ├── formatINR.js           # Indian rupee formatter
│   └── planConfig.js          # Plan hierarchy, feature gates, limit helpers
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx       # Donezo-style outer card layout, mobile nav
│   │   ├── TopBar.jsx         # Search, theme toggle, bell badge (Smart Inbox count), avatar
│   │   ├── Sidebar.jsx        # Desktop collapsible nav
│   │   └── MobileNav.jsx      # Bottom tab bar (mobile)
│   ├── ui/
│   │   ├── Input.jsx          # Labeled input with error/hint
│   │   ├── Badge.jsx          # Status badge (success/danger/info/muted)
│   │   └── Modal.jsx          # Accessible modal overlay
│   ├── SmartInboxWidget.jsx   # Dashboard email detection review cards (payments/deals/TDS/expenses)
│   ├── ManualPasteModal.jsx   # Manual email paste → classify → confirm flow
│   └── features/
│       └── invoice/
│           └── InvoiceList.jsx # Sortable table + view modal + actions
└── pages/
    ├── LandingPage.jsx         # Public landing with ChaosHero scroll
    ├── InvoicePage.jsx         # Create/edit/list invoices (all 3 views)
    ├── SettingsPage.jsx        # Profile + Invoice Settings + Integrations (Smart Inbox settings)
    ├── DashboardPage.jsx       # Stats + Smart Inbox widget + charts + recent invoices
    ├── TDSPage.jsx
    ├── TaxPlannerPage.jsx
    ├── DealsPage.jsx
    ├── IncomePage.jsx
    └── ExpensesPage.jsx
```

---

## Key Design Decisions

### Theme
- Dark mode default, light mode toggle via `useTheme()` in `App.jsx`
- Persisted in `localStorage`
- Accent color: `#E8921A` (saffron)
- CSS custom properties in `index.css` for all colors/spacing/radius

### Dev Bypass (no auth required for testing)
`useAuth.jsx` exports a `MOCK_USER` that pre-fills all user data. The API utility (`api.js`) sends `X-Dev-User-Id: dev-bypass-user` on every request in dev mode so the backend accepts calls without a real JWT cookie.

```js
// api.js
headers: { 'X-Dev-User-Id': 'dev-bypass-user' }  // only when import.meta.env.DEV
```

The backend `auth.ts` middleware accepts this header when `NODE_ENV !== 'production'`.

### Layout
- **AppShell**: outer `var(--bg)` background + inner rounded card containing sidebar + content — "Donezo" style
- **TopBar**: 3-column grid on desktop (title | search | controls), flex on mobile; hides search on mobile
- Mobile breakpoint: 768px for layout, 640px for TopBar controls

---

## Invoice System

### Templates (7 styles, 3 layouts)

| Template | Layout | Description |
|----------|--------|-------------|
| Classic | `classic` | Dark navy header, two-column parties, right-aligned tax |
| Modern | `corporate` | Full-width colored band, Customer/Invoice split, colored table header |
| Professional | `corporate` | Same structure as Modern, forest green |
| Vintage | `classic` | Warm brown, serif feel |
| Evergreen | `classic` | Deep teal |
| Compact | `minimal` | Company name left, divider, right-aligned tax summary |
| Bold | `minimal` | Purple accent, same clean minimal structure |

Each template object has `{ id, name, headerColor, accentColor, layout }`.

The `InvoicePreview` component dispatches to `ClassicPreview`, `CorporatePreview`, or `MinimalPreview` based on `template.layout`.

PDF generation uses `buildClassicHTML`, `buildCorporateHTML`, or `buildMinimalHTML` — all produce a Blob URL opened in a new tab with `window.print()` auto-triggered.

### PDF Print Quality
All 3 PDF builders include:
```css
@page { margin: 0; size: A4 portrait; }
* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
@media print { body { padding: 16px 24px; } }
```
This ensures header background colors print correctly and browser date/URL watermarks are suppressed.

### GST Compliance (Rule 46 CGST)
Mandatory fields enforced via `getErrors()`:
- Supplier GSTIN, PAN, business address
- Brand name, address, state code
- Place of supply
- SAC/HSN code (default 998399 for content creation)
- Service description (min 5 chars)

All monetary calculations use **integer paise** to avoid floating point errors.

### Multi-Service Lines
Form supports multiple service lines, each with: description, amount, GST%, SAC code. The first line syncs to legacy single-line fields for backward compatibility.

### Invoice Form Layout
- Desktop: 2-column grid — scrollable form (left) + sticky preview (right)
- Action bar (Save Invoice | Save & Download PDF | Discard & Close) is sticky at bottom, outside the scrollable form
- Mobile: single column, collapsible preview above action buttons
- "Creator (Your Details)" section is **collapsible, collapsed by default**

### `Sect` Component
```jsx
<Sect title="..." collapsible defaultOpen={false}>
```
Supports collapsible mode with ChevronUp/Down toggle.

---

## Settings Page

### Layout
- Left nav: sticky card with `position: sticky; top: var(--space-4)` — stays visible while scrolling long content
- Content: flex container, sections render as separate cards

### Profile Section — 3 Cards
1. **Avatar card**: circular avatar (photo or initials), name, plan badge, member since
2. **Personal Information**: Full Name, Email (read-only), Phone Number, Plan — inline Edit/Save
3. **Business & Tax**: Business Name, GSTIN, PAN, Address, State Code, Invoice Prefix — inline Edit/Save

Avatar upload: click camera icon → file input → POST `/auth/avatar` → updates TopBar immediately.

### Invoice Settings Section
Order: **Bank Accounts** → **UPI IDs** → **Terms & Conditions** → **Authorized Signatory**

- Bank Accounts (max 5): saved to API, auto-select on new invoice form
- UPI IDs (max 5): independent of bank, each can have a QR scanner image
- T&C Profiles: named, default auto-fills new invoices
- Signatory: single record, signature image uploads to Supabase Storage

Images (signature, QR scanner) upload to Supabase Storage `invoice-signatures` bucket before saving to DB. Never stored as base64 in the database.

---

## API Integration

Base URL: `VITE_API_URL` env var (default `http://localhost:4000/api/v1`)

All requests use `withCredentials: true` (httpOnly JWT cookies) + `X-Dev-User-Id` header in dev.

401 responses trigger automatic token refresh via `POST /auth/refresh`. If refresh fails, redirects to `/login`.

**Note:** `fetchUser()` only clears the user on 401/403, not on 5xx errors — so MOCK_USER persists even when Supabase isn't configured.

## Smart Inbox

The Smart Inbox is the automation layer for the app. It connects to Gmail, scans for financial emails, and surfaces them as review cards on the dashboard.

### How it works

1. User connects Gmail via Settings → Integrations
2. Backend scans inbox every 6 hours (or on manual refresh)
3. Each email is classified by `emailClassifier.ts` using keyword rules
4. Detections appear in `SmartInboxWidget` on the dashboard as review cards
5. User accepts (creates the record) or dismisses each card

### Detection types

| Type | What triggers it | What gets created |
|------|-----------------|------------------|
| `payment_received` | "amount credited", "NEFT credit", UPI/bank senders | Income entry + marks invoice paid |
| `deal_confirmed` | "PO attached", "brief confirmed", "let's proceed" + amount | Deal in CRM at `inquiry` stage |
| `deal_inquiry` | "collab opportunity", "brand deal" (soft interest only) | Shown as awareness card — user manually promotes |
| `tds_deduction` | "TDS deducted", TAN number, "194J/C/H" | TDS record |
| `expense` | Known SaaS domains, "subscription renewed" | Expense entry |
| `form_16a` | "Form 16A attached", "TDS certificate for FY" | Updates existing TDS record status |

### Key design decisions

- **`deal_inquiry` is never auto-applied** — soft outreach (collab requests) is always shown as "Possible Interest", not a real deal. Users must manually promote to pipeline.
- **`email_received_at`** (the email's original Date header) is always shown on cards — never the scan time.
- **ℹ info icon** on every card opens a provenance popover: sender, subject, timestamp, and the exact keywords that triggered detection.
- **Manual paste** (`ManualPasteModal`) runs the same classifier on pasted text — same 3-field form (subject, body, optional sender).
- **Plan gating**: Smart Inbox is Starter+. Basic users see a blurred widget with a real count ("3 payments detected — upgrade to review"). Auto-apply mode is Pro only.

### Bell badge

`TopBar` fetches `GET /email-detections?status=pending_review` on every route change and shows a numeric count badge on the bell icon. Clicking the bell scrolls to `#smart-inbox` on the dashboard.

### API Integration

- `GET /api/v1/email-detections` — list pending detections (returns `plan_locked: true` for Basic with count only)
- `POST /api/v1/email-detections/scan-now` — manual trigger (rate-limited 1/min per user)
- `POST /api/v1/email-detections/paste` — classify a pasted email
- `PUT /api/v1/email-detections/:id/accept` — create linked record
- `PUT /api/v1/email-detections/:id/reject` — dismiss

---

## Running Locally

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Backend must be running on port 4000. See root `SETUP.md`.

---

## Environment Variables

```bash
# frontend/.env.local
VITE_API_URL=http://localhost:4000/api/v1
```
