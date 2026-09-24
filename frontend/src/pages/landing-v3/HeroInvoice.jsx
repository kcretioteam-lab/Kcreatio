import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatINRDecimal, formatINR, amountInWords } from '../../utils/formatINR.js';

// GST state codes (Rule 46 requires the code printed next to each address)
const STATES = [
  ['01', 'Jammu & Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'],
  ['05', 'Uttarakhand'], ['06', 'Haryana'], ['07', 'Delhi'], ['08', 'Rajasthan'],
  ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'], ['12', 'Arunachal Pradesh'],
  ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'], ['16', 'Tripura'],
  ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'], ['20', 'Jharkhand'],
  ['21', 'Odisha'], ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'], ['24', 'Gujarat'],
  ['26', 'Dadra & Nagar Haveli and Daman & Diu'], ['27', 'Maharashtra'], ['29', 'Karnataka'],
  ['30', 'Goa'], ['31', 'Lakshadweep'], ['32', 'Kerala'], ['33', 'Tamil Nadu'],
  ['34', 'Puducherry'], ['35', 'Andaman & Nicobar Islands'], ['36', 'Telangana'],
  ['37', 'Andhra Pradesh'], ['38', 'Ladakh'],
];
const STATE_NAME = Object.fromEntries(STATES);
const byName = (a, b) => a[1].localeCompare(b[1]);
const SORTED = [...STATES].sort(byName);

const GST_RATE = 0.18;
const TDS_RATE = 0.10; // Section 194J, on the fee only — never on the GST

function StateSelect({ id, value, onChange }) {
  return (
    <select id={id} className="v3-input" value={value} onChange={e => onChange(e.target.value)}>
      {SORTED.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </select>
  );
}

export default function HeroInvoice() {
  const uid = useId();
  const [brand, setBrand] = useState('Acme Foods Pvt Ltd');
  const [amount, setAmount] = useState('100000');
  const [from, setFrom] = useState('29');
  const [to, setTo] = useState('27');

  const fee = Math.max(0, Math.min(99999999, Math.round(Number(amount) || 0)));
  const ready = fee > 0 && brand.trim().length > 0;
  const intra = from === to;

  const calc = useMemo(() => {
    const gst = Math.round(fee * GST_RATE);
    const half = Math.round(gst / 2);
    return {
      gst,
      cgst: half,
      sgst: gst - half,
      total: fee + gst,
      tds: Math.round(fee * TDS_RATE),
      net: fee + gst - Math.round(fee * TDS_RATE),
    };
  }, [fee]);

  const saveHref = `/register?${new URLSearchParams({ brand: brand.trim(), amount: String(fee), from, to })}`;

  return (
    <section className="v3-hero" aria-labelledby={`${uid}-h1`}>
      <div className="v3-wrap v3-hero__grid">
        <div className="v3-hero__copy">
          <h1 id={`${uid}-h1`} className="v3-h1">The GST invoice brands don’t send back.</h1>
          <p className="v3-lead">
            For YouTubers and Instagram creators doing brand deals. Kcretio writes Rule 46 invoices,
            tracks the TDS brands deduct, and works out your advance tax before each deadline.
          </p>

          <form className="v3-form" onSubmit={e => e.preventDefault()} aria-describedby={`${uid}-hint`}>
            <p id={`${uid}-hint`} className="v3-small v3-soft">Try it with your last deal. The invoice fills in as you type.</p>
            <div className="v3-field">
              <label htmlFor={`${uid}-brand`}>Brand name</label>
              <input id={`${uid}-brand`} className="v3-input" value={brand} maxLength={60}
                autoComplete="organization" onChange={e => setBrand(e.target.value)} />
            </div>
            <div className="v3-field">
              <label htmlFor={`${uid}-amt`}>Your fee, before GST</label>
              <div className="v3-money">
                <span aria-hidden="true">₹</span>
                <input id={`${uid}-amt`} className="v3-input num" type="number" inputMode="numeric"
                  min="0" step="1000" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>
            <div className="v3-form__row">
              <div className="v3-field">
                <label htmlFor={`${uid}-from`}>You’re in</label>
                <StateSelect id={`${uid}-from`} value={from} onChange={setFrom} />
              </div>
              <div className="v3-field">
                <label htmlFor={`${uid}-to`}>Brand is in</label>
                <StateSelect id={`${uid}-to`} value={to} onChange={setTo} />
              </div>
            </div>
            <div className="v3-cta-row">
              <Link to={saveHref} className="v3-btn v3-btn--primary">Save this invoice free</Link>
              <p className="v3-small v3-soft">Free forever for unlimited invoices. No card needed.</p>
            </div>
          </form>
        </div>

        <div className="v3-sheet-wrap">
          <article className="v3-sheet" aria-label="Invoice preview">
            <header className="v3-sheet__top">
              <div>
                <div className="v3-sheet__title">Tax invoice</div>
                <div className="v3-small v3-soft num">KC/2025-26/001</div>
              </div>
              <div className="v3-sheet__meta">
                SAC 998399<br />Reverse charge: Not applicable
              </div>
            </header>

            <dl className="v3-parties">
              <div>
                <dt>From</dt>
                <dd>You<br /><span className="v3-code">{STATE_NAME[from]} | Code: {from}</span></dd>
              </div>
              <div>
                <dt>Bill to</dt>
                <dd>{brand.trim() || 'Brand name'}<br /><span className="v3-code">{STATE_NAME[to]} | Code: {to}</span></dd>
              </div>
            </dl>

            <table className="v3-lines num">
              <thead>
                <tr><th scope="col">Service</th><th scope="col" className="r">Amount</th></tr>
              </thead>
              <tbody>
                <tr><td>Content creation, brand campaign</td><td className="r">{formatINRDecimal(fee)}</td></tr>
                {intra ? (
                  <>
                    <tr><td>Add: CGST @ 9%</td><td className="r">{formatINRDecimal(calc.cgst)}</td></tr>
                    <tr><td>Add: SGST @ 9%</td><td className="r">{formatINRDecimal(calc.sgst)}</td></tr>
                  </>
                ) : (
                  <tr><td>Add: IGST @ 18%</td><td className="r">{formatINRDecimal(calc.gst)}</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="v3-total"><td>Total</td><td className="r">{formatINRDecimal(calc.total)}</td></tr>
              </tfoot>
            </table>

            <p className="v3-words">Amount in words: <em>{amountInWords(calc.total)}</em></p>
            <p className="v3-small v3-soft">Place of supply: {STATE_NAME[to]} ({to}), {intra ? 'intrastate' : 'interstate'}</p>

            <p className="v3-net num" aria-live="polite" aria-atomic="true">
              After 10% TDS on your fee, you receive <strong>{formatINR(calc.net)}</strong>.
              The {formatINR(calc.tds)} TDS comes back as credit when you file ITR.
            </p>

            {ready && <div key={intra ? 'intra' : 'inter'} className="v3-stamp" aria-hidden="true">RULE 46 ✓</div>}
          </article>
        </div>
      </div>
    </section>
  );
}
