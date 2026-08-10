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
   - `backend/migrations/002_seed_test_user.sql` — dev user (admin@kcreatio.in / admin123)
   - `backend/migrations/003_invoice_settings_and_invoice_extras.sql` — bank accounts, T&C, signatory, extended invoice columns
   - `backend/migrations/004_upi_settings_contact_fields.sql` — UPI setting type, UPI QR scanner, brand email/phone on invoices
   - `backend/migrations/005_user_phone_invoice_contact.sql` — phone, invoice_phone, invoice_email, show_phone_on_invoice, avatar_url on users

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
RESEND_API_KEY=re_xxxx       # optional for dev
GROQ_API_KEY=gsk_xxxx        # optional for dev
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

Create 3 plans in Razorpay Dashboard → Subscriptions → Plans:
- Starter: ₹299/month
- Pro: ₹599/month  
- Business: ₹1,499/month

Add the plan IDs to `backend/.env`:
```
RAZORPAY_STARTER_PLAN_ID=plan_xxxx
RAZORPAY_PRO_PLAN_ID=plan_yyyy
RAZORPAY_BUSINESS_PLAN_ID=plan_zzzz
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

**To test with real auth:** configure Supabase credentials, run all migrations, then the dev user `admin@kcreatio.in` / `admin123` is seeded by migration 002.

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
│   │   ├── routes/    # auth, invoices, invoice-settings, upload, tds, deals, income, expenses
│   │   ├── services/  # invoiceService (GST calc), pdfService
│   │   ├── middleware/ # authenticate, validateBody
│   │   └── lib/       # supabase client
│   └── migrations/    # 001–005 SQL files, run in Supabase SQL Editor
└── SETUP.md           # This file
```

**Key data flows:**
- JWT in httpOnly cookies — never localStorage
- All monetary amounts stored as integers (paise) to avoid floating point errors
- Invoice settings (bank accounts, UPI, T&C, signatory) stored in `invoice_settings` table with `setting_type` discriminator
- Images stored in Supabase Storage `invoice-signatures` bucket, DB stores only the public URL

---

## Architecture Decisions

1. **Inter variable font** — Single variable woff2 instead of 4 weight files. Same visual result, one fewer HTTP request.

2. **Invoice PDF via Blob URL** — PDFs are generated client-side as HTML blobs, opened in a new tab, and printed via `window.print()`. Avoids Supabase Storage bucket setup for PDFs in V1.

3. **3 PDF layout templates** — `buildClassicHTML`, `buildCorporateHTML`, `buildMinimalHTML` — dispatched by `template.layout` field. Print CSS includes `@page { margin: 0 }` and `print-color-adjust: exact` to suppress browser watermarks and preserve background colors.

4. **Invoice settings as rows** — Bank accounts, UPI IDs, T&C profiles, and signatory are stored as rows in `invoice_settings` table (discriminated by `setting_type`) rather than separate tables. Simpler for V1, max 5 records per type enforced at API layer.

5. **No Groq AI email parser** — Spec marks this "Nice to Have (Post-PMF)". Not built in V1.

6. **No WhatsApp notifications** — Spec marks this "Nice to Have (Post-PMF)". Not built in V1.

7. **No Sentry/PostHog** — To be wired at Week 12 launch prep per spec roadmap.
