import { useId } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Receipt, CalendarClock, Inbox, Check, Plus } from 'lucide-react';
import LogoMark from '../../components/ui/LogoMark.jsx';

// ─── 2. One deal, followed — a real sequence, so it is numbered ────────────────

const LEDGER = [
  { amt: 'You invoice ₹1,18,000.', body: '₹1,00,000 fee plus ₹18,000 GST. Kcretio picks IGST, or CGST + SGST, from your state and the brand’s.' },
  { amt: 'The brand deducts ₹10,000 TDS.', body: '10% of your fee, not of the GST, under Section 194J.' },
  { amt: 'You receive ₹1,08,000.', body: 'Mark the invoice paid. Kcretio logs the TDS and adds Form 16A to your to-collect list.' },
  { amt: 'The ₹10,000 comes back as credit.', body: 'At ITR time it counts against your tax, so you might get a refund, or owe less advance tax.' },
];

export function DealLedger() {
  const uid = useId();
  return (
    <section className="v3-section" aria-labelledby={uid}>
      <div className="v3-wrap">
        <div className="v3-section__head">
          <h2 id={uid} className="v3-h2">Where a ₹1,00,000 deal actually goes.</h2>
        </div>
        <ol className="v3-ledger">
          {LEDGER.map((row, i) => (
            <li key={row.amt}>
              <span className="v3-ledger__n num" aria-hidden="true">{i + 1}</span>
              <span className="v3-ledger__amt num">{row.amt}</span>
              <p>{row.body}</p>
            </li>
          ))}
        </ol>
        <p className="v3-soft" style={{ marginTop: 'var(--v3-s6)' }}>Kcretio keeps this ledger for every brand, all year.</p>
      </div>
    </section>
  );
}

// ─── 4. The tax year, April to March ───────────────────────────────────────────

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const DUES = {
  Jun: { d: '15 Jun', t: 'Advance tax: 15% of the year’s tax' },
  Jul: { d: '31 Jul', t: 'ITR due for last year' },
  Sep: { d: '15 Sep', t: 'Advance tax: 45% paid by now' },
  Dec: { d: '15 Dec', t: 'Advance tax: 75% paid by now' },
  Mar: { d: '15 Mar', t: 'Advance tax: 100% paid by now' },
};

export function TaxYear() {
  const uid = useId();
  return (
    <section className="v3-section" aria-labelledby={uid}>
      <div className="v3-wrap">
        <div className="v3-section__head">
          <h2 id={uid} className="v3-h2">Four dates to pay advance tax. We remind you about all four.</h2>
          <p className="v3-lead">
            If you’ll owe more than ₹10,000 in tax this year, you pay it in four parts. Miss one
            and interest runs at 1% a month.
          </p>
        </div>
        <ol className="v3-year" aria-label="Financial year, April to March">
          {MONTHS.map(m => (
            <li key={m}>
              <span className="v3-year__m">{m}</span>
              {DUES[m] && (
                <span className="v3-due">
                  <span className="v3-due__d num">{DUES[m].d}</span>
                  <span className="v3-due__t">{DUES[m].t}</span>
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="v3-small v3-soft" style={{ marginTop: 'var(--v3-s4)' }}>
          Free plan: a reminder before 15 March. Starter and Pro: all four, with the amount worked out from your income.
        </p>
      </div>
    </section>
  );
}

// ─── 5. What's inside — each row carries a small piece of the real UI ─────────

function MiniInvoices() {
  return (
    <div className="v3-mini num" aria-hidden="true">
      <table>
        <thead><tr><th>Invoice</th><th>Brand</th><th className="r">Total</th></tr></thead>
        <tbody>
          <tr><td>KC/25-26/014</td><td>Acme Foods</td><td className="r">₹59,000</td></tr>
          <tr><td>KC/25-26/013</td><td>Northwind Audio</td><td className="r">₹1,41,600</td></tr>
          <tr><td>KC/25-26/012</td><td>Blue Hill Skincare</td><td className="r">₹35,400</td></tr>
        </tbody>
      </table>
    </div>
  );
}
function MiniTds() {
  return (
    <div className="v3-mini num" aria-hidden="true">
      <table>
        <thead><tr><th>Brand</th><th className="r">TDS</th><th className="r">Form 16A</th></tr></thead>
        <tbody>
          <tr><td>Acme Foods</td><td className="r">₹5,000</td><td className="r"><span className="v3-tag v3-tag--ok">Received</span></td></tr>
          <tr><td>Northwind Audio</td><td className="r">₹12,000</td><td className="r"><span className="v3-tag v3-tag--due">Missing</span></td></tr>
          <tr><td><b>Credit for ITR</b></td><td className="r"><b>₹17,000</b></td><td /></tr>
        </tbody>
      </table>
    </div>
  );
}
function MiniAdvance() {
  return (
    <div className="v3-mini num" aria-hidden="true">
      <table>
        <thead><tr><th>Instalment</th><th>Due</th><th className="r">Pay</th></tr></thead>
        <tbody>
          <tr><td>Q1 (15%)</td><td>15 Jun</td><td className="r">₹8,400</td></tr>
          <tr><td>Q2 (45%)</td><td>15 Sep</td><td className="r">₹16,800</td></tr>
          <tr><td>Q3 (75%)</td><td>15 Dec</td><td className="r">₹16,800</td></tr>
          <tr><td>Q4 (100%)</td><td>15 Mar</td><td className="r">₹14,000</td></tr>
        </tbody>
      </table>
    </div>
  );
}
function MiniDeals() {
  return (
    <div className="v3-mini" aria-hidden="true">
      <div className="v3-pipe">
        <div><b>Negotiating</b><span>Blue Hill · ₹30K</span></div>
        <div><b>Delivered</b><span>Acme Foods · ₹50K</span><span>Orbit Fitness · ₹75K</span></div>
        <div><b>Paid</b><span>Northwind · ₹1.2L</span></div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: FileText, title: 'Invoices', body: '7 templates, bank details and UPI QR, your signature. Unlimited on the free plan.', mini: MiniInvoices },
  { icon: Receipt, title: 'TDS tracker', body: 'Every deduction by brand, which Form 16As are still missing, and your total credit for ITR.', mini: MiniTds },
  { icon: CalendarClock, title: 'Advance tax', body: 'New and old regime, with quarterly amounts worked out from your real income.', mini: MiniAdvance },
  { icon: Inbox, title: 'Deals and Smart Inbox', body: 'A pipeline from enquiry to paid. Connect Gmail and Kcretio spots payment and TDS emails for you to confirm.', mini: MiniDeals },
];

export function Inside() {
  const uid = useId();
  return (
    <section className="v3-section v3-section--band" aria-labelledby={uid}>
      <div className="v3-wrap">
        <div className="v3-section__head">
          <h2 id={uid} className="v3-h2">Everything a brand deal leaves behind.</h2>
        </div>
        <div className="v3-features">
          {FEATURES.map(({ icon: Icon, title, body, mini: Mini }) => (
            <div key={title} className="v3-feature">
              <div>
                <h3><Icon size={22} aria-hidden="true" /> {title}</h3>
                <p>{body}</p>
              </div>
              <Mini />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 6. Why not what you use now ───────────────────────────────────────────────

const COMPARE = [
  ['Google Sheets', 'Free, but it won’t write a Rule 46 invoice or warn you before 15 Sep.'],
  ['Zoho Books, Tally', 'Made for businesses selling goods, and for accountants. No brand deals, no TDS by brand.'],
  ['ClearTax', 'Great in July. Silent the other eleven months.'],
  ['Your CA', 'Still needed. Kcretio hands them one clean export instead of a WhatsApp dump.'],
];

export function Compare() {
  const uid = useId();
  return (
    <section className="v3-section" aria-labelledby={uid}>
      <div className="v3-wrap">
        <div className="v3-section__head">
          <h2 id={uid} className="v3-h2">Built for creators, not for shops.</h2>
        </div>
        <dl className="v3-compare">
          {COMPARE.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </div>
    </section>
  );
}

// ─── 7. Pricing ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Basic', price: '₹0', per: 'forever', cta: 'Start free',
    items: ['Unlimited GST invoices, with a small Kcretio watermark', 'CGST, SGST or IGST picked for you', 'TDS tracker, up to 10 entries', 'Advance tax reminder before 15 March'],
  },
  {
    name: 'Pro', price: '₹0', per: 'for 28 days', cta: 'Start free, then request Pro', pro: true,
    note: 'Request it from inside the app. We review every request.',
    items: ['Invoices without the watermark, all 7 templates', 'Unlimited TDS entries and Form 16A tracking', 'Advance tax planner with all four reminders', 'P&L dashboard and CA export', 'Smart Inbox for Gmail'],
  },
];

export function Pricing() {
  const uid = useId();
  return (
    <section id="pricing" className="v3-section v3-section--band" aria-labelledby={uid}>
      <div className="v3-wrap">
        <div className="v3-section__head">
          <h2 id={uid} className="v3-h2">Free to start. Pro free for 28 days.</h2>
        </div>
        <div className="v3-plans">
          {PLANS.map(p => (
            <article key={p.name} className={`v3-plan${p.pro ? ' v3-plan--pro' : ''}`} aria-label={`${p.name} plan`}>
              <h3>{p.name}</h3>
              <p className="v3-price num">{p.price} <small>{p.per}</small></p>
              {p.note && <p className="v3-soft">{p.note}</p>}
              <ul>
                {p.items.map(it => <li key={it}><Check size={16} aria-hidden="true" /><span>{it}</span></li>)}
              </ul>
              <Link to="/register" className={`v3-btn ${p.pro ? 'v3-btn--primary' : 'v3-btn--quiet'}`}>{p.cta}</Link>
            </article>
          ))}
        </div>
        <p className="v3-soft" style={{ marginTop: 'var(--v3-s6)' }}>
          Paid plans come later: Starter at ₹299 a month, Pro at ₹599. Everything you set up now carries over.
        </p>
      </div>
    </section>
  );
}

// ─── 8. FAQ ────────────────────────────────────────────────────────────────────

const FAQS = [
  ['Do I need GST registration?', 'To charge GST on an invoice, yes, you need a GSTIN. Registration is required once your turnover crosses ₹20 lakh a year.'],
  ['How does Kcretio pick IGST or CGST + SGST?', 'From your state and the brand’s. Same state means CGST + SGST, different states means IGST. Kcretio also checks that the first two digits of the brand’s GSTIN match its state.'],
  ['Is TDS tracked automatically?', 'When you mark an invoice paid, Kcretio logs the 10% TDS under Section 194J. With Smart Inbox connected, it can spot TDS emails for you to confirm.'],
  ['Is the free plan really free?', 'Yes. Unlimited invoices, no card, no expiry. Invoices on the free plan carry a small Kcretio watermark.'],
  ['What do I give my CA?', 'One export with your invoices, income, expenses and TDS for the financial year, ready for ITR-3 or ITR-4. It’s part of Pro.'],
  ['Is my data safe?', 'Each account can only read its own records, connections are encrypted, and we don’t sell your data.'],
];

export function Faq() {
  const uid = useId();
  return (
    <section id="faq" className="v3-section" aria-labelledby={uid}>
      <div className="v3-wrap">
        <div className="v3-section__head">
          <h2 id={uid} className="v3-h2">Questions creators ask us.</h2>
        </div>
        <div className="v3-faq">
          {FAQS.map(([q, a]) => (
            <details key={q}>
              <summary>{q}<Plus size={20} aria-hidden="true" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 9. Close + footer ─────────────────────────────────────────────────────────

export function Close() {
  const uid = useId();
  return (
    <section className="v3-section v3-section--band" aria-labelledby={uid}>
      <div className="v3-wrap v3-close">
        <h2 id={uid} className="v3-h2">Your next brand deal deserves a proper invoice.</h2>
        <Link to="/register" className="v3-btn v3-btn--primary">Start free</Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="v3-footer">
      <div className="v3-wrap v3-footer__row">
        <Link to="/v3" className="v3-brand"><LogoMark size={24} alt="" /> Kcretio</Link>
        <ul>
          <li><Link to="/privacy">Privacy</Link></li>
          <li><Link to="/terms">Terms</Link></li>
          <li><Link to="/login">Sign in</Link></li>
        </ul>
        <p className="v3-small v3-soft">© {new Date().getFullYear()} Kcretio</p>
      </div>
    </footer>
  );
}
