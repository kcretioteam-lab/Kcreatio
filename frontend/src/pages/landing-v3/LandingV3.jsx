import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import LogoMark from '../../components/ui/LogoMark.jsx';
import HeroInvoice from './HeroInvoice.jsx';
import TaxCalculatorV3 from './TaxCalculatorV3.jsx';
import { DealLedger, TaxYear, Inside, Compare, Pricing, Faq, Close, Footer } from './Sections.jsx';
import './v3.css';

const NAV = [['#tax-calculator', 'Tax calculator'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']];

export default function LandingV3() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Kcretio: GST invoices, TDS and advance tax for creators';
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="v3">
      <a href="#main" className="v3-skip">Skip to content</a>
      <header className="v3-nav">
        <nav className="v3-wrap v3-nav__row" aria-label="Main">
          <Link to="/v3" className="v3-brand"><LogoMark size={28} alt="" /> Kcretio</Link>
          <ul className="v3-nav__links">
            {NAV.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}
          </ul>
          <div className="v3-nav__actions">
            <Link to="/login" className="v3-btn v3-btn--quiet v3-btn--sm v3-nav__signin">Sign in</Link>
            <Link to="/register" className="v3-btn v3-btn--primary v3-btn--sm">Start free</Link>
          </div>
        </nav>
      </header>

      <main id="main">
        <HeroInvoice />
        <DealLedger />
        <TaxCalculatorV3 />
        <TaxYear />
        <Inside />
        <Compare />
        <Pricing />
        <Faq />
        <Close />
      </main>
      <Footer />
    </div>
  );
}
