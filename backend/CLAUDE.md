# Backend — Claude Context

## Routes overview
| Route file | Endpoints | Notes |
|-----------|-----------|-------|
| `auth.ts` | POST /register, /login, /logout, /refresh, GET /me, PUT /profile, POST /avatar | JWT httpOnly cookies |
| `invoices.ts` | CRUD + /next-number + /:id/pdf | Zod-validated, GSTIN cross-check |
| `invoiceSettings.ts` | CRUD + /:id/set-default | setting_type: bank_account/terms/signatory/upi, max 5 each |
| `upload.ts` | POST /signature, POST /scanner | Base64 → Supabase Storage invoice-signatures bucket |
| `tds.ts` | CRUD + /summary | TDS deductions, Form 16A tracking |
| `taxPlanner.ts` | GET /estimate, /schedule, /deadlines, POST /payments | Advance tax |
| `deals.ts` | CRUD + /mark-paid | Auto-creates income entry on paid |

## Auth middleware
```typescript
// auth.ts — accepts X-Dev-User-Id header in non-production
if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-user-id']) {
  req.userId = req.headers['x-dev-user-id'];
  req.userPlan = 'pro';
  next(); return;
}
// Otherwise: verify JWT from req.cookies.access_token
```

## getUser() in invoices.ts — all fields needed for PDF
```typescript
.select('id, name, email, business_name, gstin, pan, business_address, state_code, invoice_prefix, phone, show_phone_on_invoice, invoice_phone, invoice_email')
```
If this select is ever changed, PDF output breaks.

## GST calculation (invoiceService.ts)
- All arithmetic in paise: `Math.round(baseAmountRupees * 100)`
- Intrastate: cgstAmount = sgstAmount = gstPaise / 2 / 100
- Interstate: igstAmount = gstPaise / 100
- `getFinancialYear(date)` — April start, returns "2025-26"
- `getFYCode("2025-26")` → "2526" (used in invoice number PREFIX/FYCODE/SEQ)

## Invoice number format
`{invoice_prefix}/{fyCode}/{4-digit-seq}` e.g. `ADM/2627/0001`
Uniqueness enforced by DB index: `UNIQUE(user_id, invoice_number)`.

## GSTIN cross-validation (invoices.ts — POST and PUT)
```typescript
if (body.brandGstin && body.brandStateCode && body.brandGstin.slice(0, 2) !== body.brandStateCode) {
  return 422 VALIDATION_ERROR
}
```

## PUT /invoices/:id — safe update (no raw body spread)
Uses explicit camelCase→snake_case field map whitelist. Prevents user_id/status overwrite.

## invoice_settings table
- `setting_type` IN ('bank_account', 'terms', 'signatory', 'upi')
- Max 5 records per type enforced at app layer
- Signatory: delete-before-insert (only one allowed)
- `is_default` flag — one per type — cleared atomically on set-default

## CORS allowed headers
`['Content-Type', 'Authorization', 'X-Dev-User-Id']`
If adding new custom headers to frontend requests, add here too.

## Error format
```json
{ "error": "ERROR_CODE", "message": "human readable", "field": "fieldName", "statusCode": 422 }
```
Codes: VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, RATE_LIMITED, INTERNAL_ERROR, LIMIT_EXCEEDED
