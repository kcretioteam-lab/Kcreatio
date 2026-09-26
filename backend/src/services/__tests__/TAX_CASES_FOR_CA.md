# Tax engine test cases — for CA sign-off

**Status: PENDING CA SIGN-OFF.** Kcretio uses these cases to check its tax calculations on every deploy. Please confirm each expected value, or mark the correct figure next to it.

## Rules applied (tax year 2026-27, Income-tax Act 2025)

- **New regime slabs:** 0–4L nil · 4–8L 5% · 8–12L 10% · 12–16L 15% · 16–20L 20% · 20–24L 25% · above 24L 30%
- **Old regime slabs:** 0–2.5L nil · 2.5–5L 5% · 5–10L 20% · above 10L 30%
- **Rebate (87A):** new regime up to ₹60,000 when taxable income ≤ ₹12L, with marginal relief just above ₹12L. Old regime up to ₹12,500 when ≤ ₹5L
- **Standard deduction:** only on salary (₹75,000 new / ₹50,000 old). Never on business or professional income
- **Presumptive (formerly 44ADA / 44AD):** taxable = 50% of receipts (professional) or 6% (business, digital receipts). All advance tax due by 15 March
- **Cess:** 4% health and education cess. **Surcharge above ₹50L is not yet modelled.**
- **Advance tax:** only when tax after TDS is ≥ ₹10,000. Instalments of 15/45/75/100% by 15 Jun / 15 Sep / 15 Dec / 15 Mar
- **Late-instalment interest (formerly 234C):** 1% a month on the shortfall — 3 months for Q1–Q3, 1 month for Q4. Q1 is safe at 12% paid and Q2 at 36%
- Amounts are rounded to the nearest rupee

## Cases

| # | Case | Inputs | Taxable income | Total tax | Payable after TDS | Refund | Instalments | CA ✓ |
|---|---|---|---|---|---|---|---|---|
| 1 | Zero income | receipts ₹0, new regime | ₹0 | ₹0 | ₹0 | ₹0 | — | |
| 2 | New regime ₹4L (nil slab) | receipts ₹4,00,000, new regime | ₹4,00,000 | ₹0 | ₹0 | ₹0 | — | |
| 3 | New regime ₹7L (full 87A rebate) | receipts ₹7,00,000, new regime | ₹7,00,000 | ₹0 | ₹0 | ₹0 | — | |
| 4 | New regime ₹11.99L (full 87A rebate) | receipts ₹11,99,000, new regime | ₹11,99,000 | ₹0 | ₹0 | ₹0 | — | |
| 5 | New regime ₹12L exactly (full 87A rebate) | receipts ₹12,00,000, new regime | ₹12,00,000 | ₹0 | ₹0 | ₹0 | — | |
| 6 | New regime ₹12.1L (marginal relief) | receipts ₹12,10,000, new regime | ₹12,10,000 | ₹10,400 | ₹10,400 | ₹0 | — | |
| 7 | New regime ₹12.5L (marginal relief) | receipts ₹12,50,000, new regime | ₹12,50,000 | ₹52,000 | ₹52,000 | ₹0 | — | |
| 8 | New regime ₹12.75L (marginal relief no longer applies) | receipts ₹12,75,000, new regime | ₹12,75,000 | ₹74,100 | ₹74,100 | ₹0 | — | |
| 9 | New regime ₹15L (no standard deduction on business income) | receipts ₹15,00,000, new regime | ₹15,00,000 | ₹1,09,200 | ₹1,09,200 | ₹0 | — | |
| 10 | New regime ₹20L | receipts ₹20,00,000, new regime | ₹20,00,000 | ₹2,08,000 | ₹2,08,000 | ₹0 | — | |
| 11 | New regime ₹30L | receipts ₹30,00,000, new regime | ₹30,00,000 | ₹4,99,200 | ₹4,99,200 | ₹0 | — | |
| 12 | Old regime ₹5L (full 87A rebate) | receipts ₹5,00,000, old regime | ₹5,00,000 | ₹0 | ₹0 | ₹0 | — | |
| 13 | Old regime ₹10L | receipts ₹10,00,000, old regime | ₹10,00,000 | ₹1,17,000 | ₹1,17,000 | ₹0 | — | |
| 14 | Old regime ₹15L | receipts ₹15,00,000, old regime | ₹15,00,000 | ₹2,73,000 | ₹2,73,000 | ₹0 | — | |
| 15 | Regular books: ₹18L receipts − ₹3L expenses | receipts ₹18,00,000, expenses ₹3,00,000, new regime | ₹15,00,000 | ₹1,09,200 | ₹1,09,200 | ₹0 | — | |
| 16 | Presumptive (old 44ADA) ₹30L receipts → single 15 Mar instalment | receipts ₹30,00,000, new regime, presumptive 44ADA | ₹15,00,000 | ₹1,09,200 | ₹1,09,200 | ₹0 | ₹0 / ₹0 / ₹0 / ₹1,09,200 | |
| 17 | Presumptive (old 44ADA) ₹24L receipts | receipts ₹24,00,000, new regime, presumptive 44ADA | ₹12,00,000 | ₹0 | ₹0 | ₹0 | — | |
| 18 | Presumptive (old 44AD, 6% digital) ₹20L receipts | receipts ₹20,00,000, new regime, presumptive 44AD | ₹1,20,000 | ₹0 | ₹0 | ₹0 | — | |
| 19 | Salary ₹10L + business ₹5L (₹75k standard deduction on salary only) | receipts ₹5,00,000, salary ₹10,00,000, new regime | ₹14,25,000 | ₹97,500 | ₹97,500 | ₹0 | — | |
| 20 | Salary only ₹12.75L | receipts ₹0, salary ₹12,75,000, new regime | ₹12,00,000 | ₹0 | ₹0 | ₹0 | — | |
| 21 | ₹12L with ₹1.2L TDS → full refund | receipts ₹12,00,000, new regime, TDS ₹1,20,000 | ₹12,00,000 | ₹0 | ₹0 | ₹1,20,000 | — | |
| 22 | ₹15L with ₹1.5L TDS → partial refund | receipts ₹15,00,000, new regime, TDS ₹1,50,000 | ₹15,00,000 | ₹1,09,200 | ₹0 | ₹40,800 | — | |
| 23 | ₹15L with ₹1L TDS → below ₹10k, no advance tax | receipts ₹15,00,000, new regime, TDS ₹1,00,000 | ₹15,00,000 | ₹1,09,200 | ₹9,200 | ₹0 | ₹0 / ₹0 / ₹0 / ₹0 | |
| 24 | ₹20L with ₹2L TDS → below ₹10k, no advance tax | receipts ₹20,00,000, new regime, TDS ₹2,00,000 | ₹20,00,000 | ₹2,08,000 | ₹8,000 | ₹0 | ₹0 / ₹0 / ₹0 / ₹0 | |
| 25 | ₹20L with ₹1L TDS → 15/45/75/100 instalments | receipts ₹20,00,000, new regime, TDS ₹1,00,000 | ₹20,00,000 | ₹2,08,000 | ₹1,08,000 | ₹0 | ₹16,200 / ₹32,400 / ₹32,400 / ₹27,000 | |

Reviewed by: ______________________  Membership no.: __________  Date: __________
