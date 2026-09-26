# Kcretio — Claude Context

## What this is
Financial OS for Indian content creators: GST invoicing, TDS tracking, advance tax planning, brand deal CRM.
Stack: React 18 + Vite (frontend) / Express 4 + TypeScript + Supabase PostgreSQL (backend).

## Dev setup
```bash
cd frontend && npm run dev          # http://localhost:5173
cd backend && node -r dotenv/config dist/server.js   # http://localhost:4000
# After backend changes: cd backend && npm run build first
```

## Dev bypass (no login needed)
- `useAuth.jsx` exports MOCK_USER — pre-filled user state
- `api.js` sends `X-Dev-User-Id: dev-bypass-user` header in dev mode
- Backend `auth.ts` middleware accepts this header when `NODE_ENV !== 'production'`
- `fetchUser()` only clears user on 401/403, not 5xx — MOCK_USER survives missing Supabase

## Architecture
- Frontend: `src/pages/` + `src/components/layout/` + `src/hooks/` + `src/utils/`
- Backend: `src/routes/` + `src/services/` + `src/middleware/`
- DB: Supabase PostgreSQL — run migrations in `backend/migrations/` in order (001→011, see SETUP.md)
- Product name is **Kcretio** everywhere (never "Kcreatio")
- Storage: Supabase bucket `invoice-signatures` for avatars, signatures, UPI QR images

## Critical rules
- JWT in httpOnly cookies — NEVER localStorage
- Money is stored and sent over the API in rupees (`numeric(12,2)`); do arithmetic in paise (integers) and convert back. Never divide DB amounts by 100
- Tax maths lives in `backend/src/services/taxEngine.ts`, mirrored in `frontend/src/utils/taxCalc.js`; both are tested against `backend/src/services/__tests__/taxCases.json`
- GST helpers live in `backend/src/lib/gst.ts`, mirrored in `frontend/src/utils/gst.js`. Supplier state comes from the creator's GSTIN
- Marking an invoice/deal paid goes through `markPaid()` (DB function, one transaction) — income is the taxable value, never incl. GST
- Plans: Basic (free, unlimited watermarked invoices) / Starter ₹299 / Pro ₹599. Business plan is paused (commented out)
- Payments disabled: signup = Basic; users request 28 days of Pro via `usePremiumRequest().openRequest()` → `premium_requests` table + admin email with Approve link (sets plan='trial'). Never link to Razorpay checkout until payments are re-enabled
- All API inputs validated with Zod before touching DB
- Every DB query scoped with `user_id` filter
- CSS: use `var(--token)` always — no hardcoded hex or px values
- Icons: Lucide only — never mix libraries
- No component libraries (MUI, Chakra, ShadCN)

## DB migrations (run in Supabase SQL Editor in order)
- 001: initial schema (users, invoices, tds_records, deals, income, expenses)
- 002: seed test user (admin@kcretio.in / admin123)
- 003: invoice_settings table + 18 new invoice columns (bank, T&C, signatory, etc.)
- 004: UPI setting type, scanner_image_url, brand_email, brand_phone, include_upi
- 005: users.phone, show_phone_on_invoice, invoice_phone, invoice_email, avatar_url
- 006–015: see SETUP.md
- 017: users.totp_* (2FA), user_sessions, invoice_audit_log
- 016: mark_invoice_paid / mark_deal_paid functions, Tax Profile fields (tax_regime, presumptive, gst_registered, LUT), invoices.line_items

## GST compliance (Rule 46 CGST Rules 2017)
- CGST+SGST for intrastate (same state supplier+brand), IGST for interstate
- Labels must say "Add: CGST @ X%" not just "GST"
- Amount in words required: use `amountInWords()` from `utils/formatINR.js`
- State codes must be explicitly printed next to addresses: "Karnataka | Code: 29"
- GSTIN first 2 digits must match brand state code — validated frontend + backend
- Reverse charge must always be stated explicitly (Not Applicable or Applicable)
- Footer: "Subject to GST as applicable" — NOT "GST compliant per Rule 46"
- SAC code 998399 = content creation services (default)
- Financial year: April–March (not Jan–Dec)
