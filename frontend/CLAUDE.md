# Frontend — Claude Context

## Key files and what they do
- `App.jsx` — Router, ThemeContext (dark/light), auth bypass (ProtectedRoute = passthrough)
- `hooks/useAuth.jsx` — MOCK_USER for dev, AuthContext, fetchUser (only clears on 401/403)
- `utils/api.js` — Axios instance, sends X-Dev-User-Id in dev, auto-refresh on 401
- `utils/formatINR.js` — `formatINR()`, `amountInWords()` (Indian number system: lakhs/crores)
- `components/layout/AppShell.jsx` — Donezo outer-card layout, mobile/tablet breakpoints
- `components/layout/TopBar.jsx` — Search, theme toggle, avatar (photo or initials), profile dropdown
- `pages/InvoicePage.jsx` — CREATE + EDIT + LIST all in one file (~2200 lines)
- `pages/SettingsPage.jsx` — Profile (3 cards), Tax Profile, Invoice Settings, Billing, etc.
- `components/features/invoice/InvoiceList.jsx` — Sortable table, view modal, action buttons

## InvoicePage.jsx structure (critical — very large file)
```
TEMPLATES array (7 templates, 3 layouts: classic/corporate/minimal)
EMPTY_FORM (all form defaults)
calcGSTMulti() — frontend GST calculation in paise
buildClassicHTML() / buildCorporateHTML() / buildMinimalHTML() — PDF generation
downloadInvoicePDF() — dispatcher, creates Blob URL → window.open → window.print
InvoicePage() — main component (create/edit/list via useLocation)
  doSave() — validates, uploads images if base64, POSTs to /invoices
  handleSave() / handleSaveAndDownload()
  loadInvoices() — paginates with PAGE_SIZE=10
Sect() — collapsible card wrapper (collapsible + defaultOpen props)
InvoicePreview() → dispatches to ClassicPreview/CorporatePreview/MinimalPreview
```

## SettingsPage.jsx structure
```
InvoiceSettingsSection — Bank Accounts (max 5) → UPI IDs (max 5) → T&C → Signatory
SettingsPage — Profile (3 cards: avatar/personal/business), Tax Profile, Billing, etc.
  fetchUser() called on mount (useEffect)
  editingPersonal / editingBusiness — inline edit state
  avatarInputRef — file input for photo upload → POST /auth/avatar
```

## Invoice templates (3 layouts)
| Layout | Templates | Header style |
|--------|-----------|-------------|
| classic | Classic, Vintage, Evergreen | Dark header, 2-col parties below |
| corporate | Modern, Professional | Full-width band, Customer/Invoice split, colored table header |
| minimal | Compact, Bold | Company left + TAX INVOICE right, colored divider |

## PDF print CSS (all 3 builders must have this)
```css
@page { margin: 0; size: A4 portrait; }
* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
@media print { body { padding: 16px 24px; } }
```

## invoice_phone / show_phone_on_invoice logic
In all PDF builders and previews:
```js
const displayEmail = (user?.show_phone_on_invoice === false && user?.invoice_email) ? user.invoice_email : user?.email;
const displayPhone = (user?.show_phone_on_invoice === false && user?.invoice_phone) ? user.invoice_phone : user?.phone;
```

## Theme system
- Dark default, toggled via useTheme() in App.jsx, stored in localStorage
- Accent: `var(--accent)` = #E8921A (saffron)
- All colors via CSS custom properties — never hardcode hex inside components
- Mobile breakpoint: 768px (AppShell, InvoicePage); TopBar: 640px

## Common patterns
- `isMobile` state: `useState(window.innerWidth < 768)` + resize listener
- Form errors: `getErrors(form)` returns object, `showErr(field)` checks touched+errors
- Supabase not connected in dev: API returns 5xx, UI falls back to localStorage
- Image upload: FileReader → base64 data URL → stored in state → uploaded on save
