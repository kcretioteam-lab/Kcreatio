# Kcreatio — Setup Guide

## Prerequisites
- Node.js 20+ 
- A Supabase account (free tier works)
- A Razorpay account (test mode for dev)

---

## 1. Clone & Install

```bash
cd kcreatio
npm run install:all
```

---

## 2. Supabase Setup

1. Create a new project at https://supabase.com
2. Go to SQL Editor — run these migrations **in order**:
   - `backend/migrations/001_initial_schema.sql` — users, invoices, core tables
   - `backend/migrations/002_seed_test_user.sql` — dev user (admin@kcretio.in / admin123)
   - `backend/migrations/003_invoice_settings_and_invoice_extras.sql` — bank accounts, T&C, signatory, extended invoice columns
   - `backend/migrations/004_upi_settings_contact_fields.sql` — UPI setting type, UPI QR scanner, brand email/phone on invoices
   - `backend/migrations/005_user_phone_invoice_contact.sql` — phone, invoice_phone, invoice_email, show_phone_on_invoice, avatar_url on users
   - `backend/migrations/006_rename_free_to_basic.sql` — rename plan value free → basic
   - `backend/migrations/007_auth_upgrade.sql` — Google OAuth, Gmail OAuth, social_links, failed_login_attempts, account lock
   - `backend/migrations/008_otp_log.sql` — otp_logs table for email verification
   - `backend/migrations/009_password_reset_tokens.sql` — password_reset_tokens table
   - `backend/migrations/010_email_detections.sql` — email_detections table (Smart Inbox)
   - `backend/migrations/011_notification_prefs_auto_apply.sql` — gmail_auto_apply, threshold, deal_followup_alerts columns
   - `backend/migrations/012_purchase_order_number.sql`, `013_invoice_discount.sql`, `014_invoice_accent_color.sql` — invoice extras
   - `backend/migrations/015_premium_requests.sql` — premium_requests table (request-based Pro access)
   - `backend/migrations/016_payment_integrity_tax_profile.sql` — atomic mark-paid functions, Tax Profile fields, invoice line items. **Run before deploying the backend** — `/auth/me` reads the new columns.
   - `backend/migrations/017_security_2fa_sessions_audit.sql` — two-factor sign-in, signed-in sessions, invoice audit log
   - `backend/migrations/018_creator_features.sql` — barter deals, foreign income, export invoices, part payments, credit notes, reminders, recurring invoices, TDS/expense fields
   - `backend/migrations/019_invoice_client_request_id.sql` — lets a retried "Save invoice" return the invoice already created instead of making a duplicate

3. Create a Storage bucket named **`invoice-signatures`** (public read):
   - Go to Storage → New bucket → Name: `invoice-signatures` → Public: ON
   - Used for: signature images, UPI QR scanner images, avatar photos

4. Copy your **Project URL** and **service_role key** from Settings → API

---

## 3. Environment Variables

**Backend** — copy `backend/.env.example` to `backend/.env` and fill in:

```bash
# Generate secrets:
openssl rand -hex 32  # for JWT_ACCESS_SECRET
openssl rand -hex 32  # for JWT_REFRESH_SECRET (must be different)

JWT_ACCESS_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from supabase dashboard>
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=<from razorpay dashboard>
RAZORPAY_WEBHOOK_SECRET=<from razorpay webhook settings>
GOOGLE_CLIENT_ID=<from google cloud console>
GOOGLE_CLIENT_SECRET=<from google cloud console>
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/auth/google/callback
GMAIL_REDIRECT_URI=http://localhost:4000/api/v1/auth/gmail/callback
RESEND_API_KEY=re_xxxx       # optional for dev
ADMIN_EMAIL=kcreatioteam@gmail.com   # receives premium access requests
API_URL=http://localhost:4000       # public backend URL, used in the Approve link
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=4000
```

**Frontend** — copy `frontend/.env.example` to `frontend/.env.local`:

```
VITE_API_URL=http://localhost:4000/api/v1
```

---

## 4. Razorpay Plans (for subscriptions)

> **Skip for now** — payments are disabled; premium is granted on request (see README → Pricing). The payments route is commented out in `server.ts`.

Create 2 plans in Razorpay Dashboard → Subscriptions → Plans:
- Starter: ₹299/month
- Pro: ₹599/month
<!-- - Business: ₹1,499/month — Business plan paused -->

Add the plan IDs to `backend/.env`:
```
RAZORPAY_STARTER_PLAN_ID=plan_xxxx
RAZORPAY_PRO_PLAN_ID=plan_yyyy
# RAZORPAY_BUSINESS_PLAN_ID=plan_zzzz   # Business plan paused
```

---

## 5. Run Locally

```bash
# Start both frontend and backend:
npm run dev

# Or separately:
cd backend && node -r dotenv/config dist/server.js   # after npm run build
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Health check: http://localhost:4000/api/health

---

## 6. Dev Bypass (testing without login)

The app has a dev bypass built in — no real login required during development:

- `useAuth.jsx` sets `MOCK_USER` as the initial user state
- `api.js` sends `X-Dev-User-Id: dev-bypass-user` header on all requests in dev mode
- Backend `auth.ts` middleware accepts this header when `NODE_ENV !== 'production'`
- `fetchUser()` only clears user on 401/403, not on 5xx — so MOCK_USER persists even without a live Supabase connection

**To test with real auth:** configure Supabase credentials, run all migrations, then the dev user `admin@kcretio.in` / `admin123` is seeded by migration 002.

---

## 7. Deploy

**Frontend → Vercel:**
```bash
cd frontend && npx vercel
```
Set env var: `VITE_API_URL=https://your-backend.onrender.com/api/v1`

**Backend → Render:**
- New Web Service → connect repo
- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `node dist/server.js`
- Add all env vars from `backend/.env`
- Set `NODE_ENV=production` in Render env vars (disables dev bypass)

---

## Architecture Overview

```
kcreatio/
├── frontend/          # React 18 + Vite — see frontend/README.md
├── backend/           # Express 4 + TypeScript + Supabase
│   ├── src/
│   │   ├── routes/    # auth, invoices, invoice-settings, upload, tds, deals, income, expenses, taxPlanner
│   │   ├── services/  # invoiceService (GST calc), puppeteerPdfService (PDF + watermark)
│   │   ├── middleware/ # authenticate, validateBody
│   │   └── lib/       # supabase client
│   └── migrations/    # 001–019 SQL files, run in Supabase SQL Editor
└── SETUP.md           # This file
```

**Key data flows:**
- JWT in httpOnly cookies — never localStorage
- All monetary arithmetic done in integer paise to avoid floating point errors; stored in DB as `numeric(12,2)` rupees
- Invoice settings (bank accounts, UPI, T&C, signatory) stored in `invoice_settings` table with `setting_type` discriminator
- Images stored in Supabase Storage `invoice-signatures` bucket, DB stores only the public URL

---

## Architecture Decisions

1. **Inter variable font** — Single variable woff2 instead of 4 weight files. Same visual result, one fewer HTTP request.

2. **Invoice PDF: server-first, Blob fallback** — `GET /invoices/:id/pdf` renders the PDF server-side with Puppeteer (watermark for Basic). If that fails, the frontend falls back to building the HTML client-side as a Blob URL and printing via `window.print()`. No PDFs are stored in Supabase Storage.

3. **3 PDF layout templates** — `buildClassicHTML`, `buildCorporateHTML`, `buildMinimalHTML` — dispatched by `template.layout` field. Print CSS includes `@page { margin: 0 }` and `print-color-adjust: exact` to suppress browser watermarks and preserve background colors.

4. **Invoice settings as rows** — Bank accounts, UPI IDs, T&C profiles, and signatory are stored as rows in `invoice_settings` table (discriminated by `setting_type`) rather than separate tables. Simpler for V1, max 5 records per type enforced at API layer.

5. **No Groq AI email parser** — Spec marks this "Nice to Have (Post-PMF)". Not built in V1.

6. **No WhatsApp notifications** — Spec marks this "Nice to Have (Post-PMF)". Not built in V1.

7. **No Sentry/PostHog** — To be wired at Week 12 launch prep per spec roadmap.
