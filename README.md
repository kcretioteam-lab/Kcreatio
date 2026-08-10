# Kcreatio

> **"Generate GST-compliant invoices for brand deals in 30 seconds. Never miss a TDS deduction or advance tax deadline again."**

The financial operating system for Indian content creators.

---

## What This Is

Kcreatio replaces the CA-visit-once-a-year panic cycle and the spreadsheet chaos with one product that handles:

- **GST Invoice Generation** — Rule 46-compliant invoices with auto-calculated CGST/SGST/IGST, correct SAC code (998399), and multiple template layouts
- **TDS Tracking** — Log every deduction from every brand, track Form 16A status, reconcile at year-end
- **Advance Tax Planning** — Know exactly how much to pay quarterly (Jun 15, Sep 15, Dec 15, Mar 15). No March shock.
- **Brand Deal CRM** — Pipeline from inquiry to payment, linked directly to invoices and income
- **Income & Expense Dashboard** — P&L overview, monthly charts, CA export

Built specifically for Indian tax law and Indian creator workflows. Not Zoho Books (retail GST). Not Tally (accountants). Not ClearTax (once a year). This.

---

## The Problem (Research-Verified)

Indian creators earning ₹5L–₹50L/year face legally mandated business-grade tax obligations that salaried workers never encounter:

| Problem | Pain Score |
|---------|-----------|
| GST registration + GSTR-1/3B/9 filing. Brands hold payment until you send a compliant invoice. | 9/10 |
| TDS reconciliation — brands deduct 10% under Section 194J, most never send Form 16A | 9/10 |
| Advance tax shock — owe >₹10K? Must pay quarterly. Most find out in March. Late = 1% monthly interest | 8/10 |
| No tool exists for this specific use case | — |

**Existing tools and why they fail:**

| Tool | Gap |
|------|-----|
| Zoho Books | Retail GST (product HSN), no creator income streams, no TDS from 30 brands |
| Tally | Desktop, accountant-facing, zero UX for creators |
| ClearTax | File-once annually, not a year-round operating system |
| QuickBooks | US-first, INR support weak, no Indian creator context |
| Google Sheets | Free but zero automation, no invoicing, no alerts |
| CA (Chartered Accountant) | ₹2K–8K/year, year-end only, doesn't understand creator-specific rules |

**Whitespace confirmed:** No tool in India combines GST invoice generation + TDS tracking + advance tax planning + brand deal CRM for the creator use case.

---

## Target Users

**Primary ICP:**
- Indian YouTuber or Instagrammer, 50K–300K followers
- Earning ₹10L–₹40L/year from 5–15 brand deals/month
- Has filed GST at least once (understands the pain)
- Uses Google Sheets for deal tracking today
- Device: primarily mobile (Android), web for admin work

**Early adopters (highest conversion probability):**
- Finance/business niche creators (already think in P&L terms)
- Creators who have received a GST notice or TDS confusion letter
- Creator-preneurs managing 2–5 creators as a small agency

**Segments to ignore at launch:**
- Mega creators (500K+) — have dedicated managers and CAs
- Micro creators (<10K followers) — no brand deals, no willingness to pay
- Affiliate-only / AdSense-only creators — different income structure

---

## Pricing

| Plan | Price | Included |
|------|-------|----------|
| Basic | Free | 5 invoices/month, TDS tracker (10 entries), March advance tax reminder |
| Starter | ₹299/month | Unlimited invoices + TDS, **Gmail Smart Inbox** (auto-detect payments/deals/TDS), manual email paste, invoice auto-overdue, deal stale alerts, smart invoice pre-fill from deal, full quarterly advance tax reminders |
| Pro | ₹599/month | Everything in Starter + advance tax calculator, P&L dashboard, CA export, **auto-apply mode** (high-confidence detections apply without review), YouTube AdSense sync, WhatsApp notifications |
| Business | ₹1,499/month | Everything + multi-creator (up to 5), white-label invoices, priority support |
| Annual | 2 months free | Any plan, billed annually |

**Unit economics at Pro (₹599/month):**
- LTV at 18-month retention: ₹10,782
- Target CAC: ₹800–1,200 (content marketing primary)
- Payback period: ~2 months
- For ₹1 Cr ARR: ~1,392 Pro customers

---

## Revenue Milestones

| Month | Users | MRR |
|-------|-------|-----|
| 3 | 100 paying | ₹50K |
| 6 | 300 paying | ₹1.5L |
| 12 | 1,000 paying | ₹5L |
| 18 | 2,500 paying | ₹12.5L → ₹1.5 Cr ARR |
| 24 | 5,000 paying | ₹3–5 Cr ARR |

---

## GTM Strategy

1. **SEO content** (near-zero CAC) — "GST for YouTubers India", "TDS on brand deals", "advance tax for creators" — zero competition, high intent
2. **CA Partner Program** — CAs refer creator clients, earn 20% recurring commission
3. **Creator ambassador program** — 10 creators (50K–200K followers) get free lifetime Pro for honest feedback + organic mention
4. **Invoice watermark viral loop** — "Created with Kcreatio" on every invoice sent to brands
5. **The March Effect** — India's financial year ends March 31. Every creator panics January–March. Peak acquisition season. Plan major feature launches and marketing spend for February–March.

---

## Key Use Cases

**1. Generate GST Invoice**
Creator completes brand deal → opens app → fills brand name + deal value → system auto-fills GSTIN, SAC code 998399, place of supply, calculates CGST+SGST or IGST → generates PDF → sends to brand → brand's finance team processes payment.

**2. Track TDS Deductions**
Creator receives ₹40,500 (₹45,000 - 10% TDS). Logs deal as ₹45,000. System flags ₹4,500 as TDS deducted. Year-end dashboard shows all 20 brands, expected Form 16A amounts, total TDS credit to claim in ITR.

**3. Advance Tax Planning**
Dashboard shows YTD income → estimated annual income → estimated tax liability → exact quarterly instalments. 14-day and 2-day reminders before each deadline.

**4. Brand Deal Pipeline**
Inquiry → Negotiating → Active → Delivered → Invoiced → Paid. Mark paid → income auto-logged → invoice auto-generated.

**5. CA Export**
Annual income summary: all invoices, all TDS deductions, P&L, expense categorisation — formatted for ITR-3/ITR-4 filing.

**6. Smart Inbox**
Connect Gmail once. App scans every 6 hours for payment confirmations, brand deal confirmations, TDS deductions, and subscription charges. Each detection appears as a review card — one click to accept and log. Every card shows exactly when the email arrived and why it was detected. Missed something? Paste any email manually and the classifier figures it out. Deal outreach emails (soft inquiries) are shown separately and never auto-logged as confirmed deals.

---

## Product-Market Fit Signals (Targets)

- Trial → Paid conversion ≥ 8% (SaaS benchmark: 3–5%)
- Monthly churn < 4% after month 3
- **Activation**: first GST invoice generated within 7 days of signup
- NPS ≥ 50 from paying users
- "Invoice feature" cited as primary reason to pay in exit surveys

---

## What's Built (Current Status)

**Completed:**
- GST Invoice Generator — 7 templates (3 distinct layouts: Classic, Corporate, Minimal), multiple service lines, bank details, UPI QR, T&C, authorized signatory
- Invoice Settings — saved bank accounts (up to 5), UPI IDs with QR scanner, T&C profiles, signatory with signature image upload
- TDS Tracker
- Advance Tax Planner (New Regime + Old Regime slabs)
- Brand Deals CRM (Kanban + list view)
- Income Dashboard
- Expenses
- Settings — 3-card profile (avatar upload, personal info, business & tax), sticky nav
- Landing Page with ChaosHero scroll animation
- Auth — register, login, JWT in httpOnly cookies, 28-day trial, Razorpay subscription flow
- Dev bypass — full app works without Supabase for local testing
- **Smart Inbox** — Gmail auto-scan for payments, deal confirmations, TDS deductions, subscription expenses; keyword classifier with confidence scoring; provenance info icon on every detection; email timestamp on every card
- **Manual email paste** — paste any missed email → classifier analyses it → one-click confirm
- **Invoice auto-overdue** — scheduled daily job flips sent invoices to overdue automatically
- **Deal stale alerts** — scheduled nudge when a deal is stuck >14 days in the same stage
- **Smart invoice pre-fill from deal** — navigate to new invoice with `deal_id` to auto-fill brand fields
- **Bell badge** — TopBar bell shows live count of pending Smart Inbox items

**Pending (requires Supabase credentials):**
- Run 11 DB migrations (see `SETUP.md`) — migrations 001–011
- Create `invoice-signatures` storage bucket
- Replace placeholder `.env` values with real Supabase URL + service_role_key

**Post-PMF roadmap:**
- Bank statement CSV import (HDFC/ICICI/SBI/Axis auto-categorisation)
- YouTube AdSense sync (Pro tier — `social_verified.youtube` column ready)
- WhatsApp deadline notifications (Pro tier — `whatsapp_enabled` column ready)
- Claude API email escalation for ambiguous/Hindi-language emails
- GST filing integration (requires GSP license)
- Mobile app (PWA first, then native)
- Marketplace (brand-creator matching)
- Agency/multi-creator management

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite, React Router v6, CSS custom properties |
| Backend | Express 4 + TypeScript, Node 22 |
| Database | Supabase (PostgreSQL 15) with Row Level Security |
| Auth | JWT in httpOnly cookies, bcrypt 12 rounds |
| Payments | Razorpay Subscriptions |
| Storage | Supabase Storage (signatures, QR codes, avatars) |
| Email | Resend |
| Hosting | Vercel (frontend) + Render (backend) |

Full architecture details: [`SETUP.md`](./SETUP.md)  
Frontend details: [`frontend/README.md`](./frontend/README.md)

---

## Quick Start

```bash
# 1. Install
npm run install:all

# 2. Set up Supabase (see SETUP.md for full instructions)
# Run 5 migrations in Supabase SQL Editor
# Create 'invoice-signatures' storage bucket

# 3. Configure backend/.env with real Supabase credentials

# 4. Run
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:4000
```

See [`SETUP.md`](./SETUP.md) for the complete setup guide.

---

## Design Philosophy

> Operational clarity with quiet confidence. This product handles creators' money, tax records, and brand deals. The design must feel like serious financial infrastructure — not a startup side project.

Reference: Linear (density), Stripe (trust through restraint), Zerodha Kite (dark theme on Indian financial data).

- Dark mode default, saffron (`#E8921A`) accent
- All ₹ values use `font-variant-numeric: tabular-nums`
- No gradients, no shadows, no animations inside the app (landing page only)
- CSS custom properties throughout — no component library

---

*Built for Indian creators who deserve real financial infrastructure.*
