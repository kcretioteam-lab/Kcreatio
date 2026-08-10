# Kcreatio — Backend

Express 4 + TypeScript API for the Kcreatio frontend.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Node 22, TypeScript |
| Framework | Express 4 |
| Database | Supabase (PostgreSQL 15) with Row Level Security |
| Auth | JWT in httpOnly cookies (access: 15m, refresh: 30d), bcrypt 12 rounds |
| Payments | Razorpay Subscriptions + webhooks |
| Email | Resend (transactional) + Gmail API (user-connected) |
| Storage | Supabase Storage bucket `invoice-signatures` |
| Validation | Zod on all request bodies |

---

## Dev Setup

```bash
cd backend
npm install
npm run build          # compile TypeScript → dist/
node -r dotenv/config dist/server.js   # http://localhost:4000
```

Backend reads env from `backend/.env`. See root `SETUP.md` for required variables.

**Dev bypass:** Send `X-Dev-User-Id: dev-bypass-user` header — skips JWT, sets plan to `pro`. Used by frontend in dev mode automatically.

---

## Route Groups

| Prefix | File | Description |
|--------|------|-------------|
| `/api/v1/auth` | `routes/auth.ts` | Register, login, logout, refresh, Google OAuth, Gmail connect/disconnect |
| `/api/v1/invoices` | `routes/invoices.ts` | CRUD + PDF generation + payment confirm token |
| `/api/v1/invoice-settings` | `routes/invoiceSettings.ts` | Bank accounts, UPI IDs, T&C profiles, signatory |
| `/api/v1/upload` | `routes/upload.ts` | Signature + UPI QR image upload to Supabase Storage |
| `/api/v1/tds` | `routes/tds.ts` | TDS records + Form 16A tracking |
| `/api/v1/tax` | `routes/taxPlanner.ts` | Advance tax estimate, schedule, deadlines, payments |
| `/api/v1/deals` | `routes/deals.ts` | Brand deal CRM + mark-paid (auto-creates income) |
| `/api/v1/income` | `routes/income.ts` | Income entries + summary |
| `/api/v1/expenses` | `routes/expenses.ts` | Expense entries + summary |
| `/api/v1/payments` | `routes/payments.ts` | Razorpay subscription management + webhook |
| `/api/v1/usage` | `routes/usage.ts` | Quota status per plan |
| `/api/v1/notifications` | `routes/notifications.ts` | Notification + Smart Inbox preferences |
| `/api/v1/export` | `routes/export.ts` | Annual CSV export (Pro) |
| `/api/v1/email-detections` | `routes/emailDetections.ts` | Smart Inbox: list/accept/reject/scan-now/paste |

---

## Scheduled Jobs (`jobs/scheduledJobs.ts`)

All jobs run when `NODE_ENV=production` or `ENABLE_JOBS=true`.

| Job | Schedule | What it does |
|-----|----------|-------------|
| `startAdvanceTaxReminderJob` | Daily 9:00 AM | Emails advance tax reminders. Basic: Q4 (March) only. Starter+: all 4 quarters at configured `alert_days_before` |
| `startInvoiceOverdueJob` | Daily 9:05 AM | Flips `sent` invoices to `overdue` when `due_date < today` |
| `startGmailScanJob` | Every 6 hours | Scans connected Gmail inboxes → classifies emails → creates `email_detections` rows. Auto-applies if user has Pro + auto-apply enabled |

---

## Email Classifier (`services/emailClassifier.ts`)

Keyword-rule based classifier for all 5 detection types. Zero external dependencies.

**Input:** `{ subject, body, fromEmail?, fromName? }`

**Output:** `{ type, confidence (0–1), reasons[], extracted: { brand_name?, amount?, tan?, tds_rate?, ... } }`

| Type | Triggered by | Confidence cap |
|------|-------------|---------------|
| `payment_received` | Bank/UPI keywords + amount | 0.93 (high if bank domain) |
| `deal_confirmed` | PO/brief/confirmation keywords + concrete signal | 0.90 (must be ≥0.70 to stay as confirmed, else demotes to inquiry) |
| `deal_inquiry` | Soft collab/sponsorship keywords | **Max 0.45** — NEVER auto-applied |
| `tds_deduction` | TDS keywords + TAN pattern | 0.90 (high if TAN found) |
| `expense` | Billing/renewal keywords + SaaS domain | 0.88 (high if known SaaS domain) |
| `form_16a` | Form 16A keywords | 0.75 always |

The `reasons[]` array explains exactly which keyword/pattern matched — surfaced in the frontend's "How we detected this" provenance popover.

---

## DB Migrations

Run in Supabase SQL Editor in order:

| File | What it creates |
|------|----------------|
| `001_initial_schema.sql` | users, invoices, tds_records, deals, income, expenses, tax_payments |
| `002_seed_test_user.sql` | Test user (admin@kcreatio.in / admin123) |
| `003_invoice_settings_and_invoice_extras.sql` | invoice_settings table + 18 invoice columns |
| `004_upi_settings_contact_fields.sql` | UPI setting type, scanner_image_url, brand email/phone |
| `005_user_phone_invoice_contact.sql` | users.phone, show_phone_on_invoice, invoice_phone/email, avatar_url |
| `006_rename_free_to_basic.sql` | Rename plan value free → basic |
| `007_auth_upgrade.sql` | Google OAuth, Gmail OAuth, social_links, failed_login_attempts, lock |
| `008_otp_log.sql` | otp_logs table for email verification |
| `009_password_reset_tokens.sql` | password_reset_tokens table |
| `010_email_detections.sql` | email_detections table (Smart Inbox) |
| `011_notification_prefs_auto_apply.sql` | gmail_auto_apply + threshold + deal_followup_alerts columns |

---

## Environment Variables

```bash
# Database
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=

# Google OAuth (for Google login + Gmail connect)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/auth/google/callback
GMAIL_REDIRECT_URI=http://localhost:4000/api/v1/auth/gmail/callback

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# App
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173
ENABLE_JOBS=false    # set to true to run cron jobs in dev
```

---

## Plan Feature Gates (`config/plans.ts`)

| Feature key | Minimum plan |
|-------------|-------------|
| `advance_tax_calculator` | pro |
| `income_dashboard` | pro |
| `ca_export` | pro |
| `gmail_auto_apply` | pro |
| `adsense_sync` | pro |
| `whatsapp_alerts` | pro |
| `expense_tracker` | starter |
| `full_calendar` | starter |
| `gmail_scan` | starter |
| `smart_inbox` | starter |
| `bank_csv_import` | starter |

---

## Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "field": "fieldName",
  "statusCode": 400
}
```

Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`, `QUOTA_EXCEEDED`, `PLAN_REQUIRED`, `ALREADY_PAID`, `INVALID_TOKEN`, `UPLOAD_FAILED`, `EMAIL_FAILED`, `ACCOUNT_LOCKED`, `TOKEN_REVOKED`
