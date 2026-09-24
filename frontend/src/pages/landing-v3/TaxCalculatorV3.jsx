import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatINR } from '../../utils/formatINR.js';

export default function TaxCalculatorV3() {
  const uid = useId();
  const [monthly, setMonthly] = useState('');
  const [brands, setBrands] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const m = parseFloat(monthly) || 0;
    const b = parseInt(brands, 10) || 1;
    if (m <= 0) { setError('Enter what you earn in a month, for example 80000.'); return; }
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/v1/tax/quick-estimate?monthly_income=${m}&brand_count=${b}`);
      if (!r.ok) throw new Error();
      setResult(await r.json());
    } catch {
      setError('Couldn’t reach the calculator. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const refund = result && result.itrRefund > 0;

  return (
    <section id="tax-calculator" className="v3-section v3-section--band" aria-labelledby={`${uid}-h`}>
      <div className="v3-wrap v3-calc">
        <div className="v3-section__head" style={{ marginBottom: 0 }}>
          <h2 id={`${uid}-h`} className="v3-h2">Refund or bill in March? Find out now.</h2>
          <p className="v3-lead">
            Enter what you earn in a month. We’ll show what brands deduct, what you receive,
            and whether you get money back at ITR. No signup.
          </p>
        </div>

        <form className="v3-calc__form" onSubmit={handleSubmit} noValidate>
          <div className="v3-field">
            <label htmlFor={`${uid}-m`}>Monthly income</label>
            <div className="v3-money">
              <span aria-hidden="true">₹</span>
              <input id={`${uid}-m`} className="v3-input num" type="number" inputMode="numeric" min="0"
                placeholder="80000" value={monthly} onChange={e => setMonthly(e.target.value)}
                aria-describedby={error ? `${uid}-err` : undefined} aria-invalid={!!error && !monthly} />
            </div>
          </div>
          <div className="v3-field v3-field--sm">
            <label htmlFor={`${uid}-b`}>Brands a month</label>
            <input id={`${uid}-b`} className="v3-input num" type="number" inputMode="numeric" min="1" max="50"
              placeholder="3" value={brands} onChange={e => setBrands(e.target.value)} />
          </div>
          <button type="submit" className="v3-btn v3-btn--primary" disabled={loading} aria-busy={loading}>
            {loading ? 'Working it out…' : 'Show my numbers'}
          </button>
        </form>

        {error && <p id={`${uid}-err`} role="alert" className="v3-error">{error}</p>}

        {result && (
          <div className="v3-results" aria-live="polite">
            <dl className="v3-figs num">
              <div><dt>You earn in a year</dt><dd>{formatINR(result.annual)}</dd></div>
              <div><dt>Brands deduct as TDS</dt><dd>{formatINR(result.estimatedTds)}</dd></div>
              <div><dt>Reaches your account</dt><dd>{formatINR(result.annual - result.estimatedTds)}</dd></div>
              <div><dt>Your income tax</dt><dd>{formatINR(result.incomeTax)}</dd></div>
            </dl>

            {refund ? (
              <div className="v3-verdict">
                <strong className="num">About {formatINR(result.itrRefund)} back when you file ITR.</strong>
                <span className="v3-soft">Brands deduct more TDS than you owe in tax. To claim it, you need Form 16A from every brand. {result.form16aRisk}.</span>
              </div>
            ) : (
              <div className="v3-verdict v3-verdict--owe">
                <strong className="num">{formatINR(result.q2Due)} of advance tax due by 15 Sep.</strong>
                <span className="v3-soft">
                  Your tax is more than the TDS brands deduct, so about {formatINR(result.advanceTaxOwed)} is still owed this year.
                  Missing an instalment adds 1% interest a month.
                </span>
              </div>
            )}

            <div className="v3-cta-row">
              <Link to="/register" className="v3-btn v3-btn--quiet">Track your real numbers free</Link>
              <p className="v3-small v3-soft">New regime slabs with the Section 87A rebate, FY 2025-26. An estimate, not tax advice.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
