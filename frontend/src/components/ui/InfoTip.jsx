import { InlineTooltip } from './Input.jsx';

// Plain-English explanations of tax terms, shown next to them.
export const GLOSSARY = {
  tds: 'Tax Deducted at Source: brands keep back a small part of your fee (usually 1–10%) and pay it to the tax department in your name. You get it back as a credit when you file your return.',
  form16a: 'The certificate a brand gives you for the TDS it deducted. You need it (or the entry in AIS) to claim that TDS.',
  ais: 'Annual Information Statement: the tax department’s record of your income and TDS. Download it from the income-tax portal and check every TDS entry appears.',
  rebate87a: 'Under the new regime, if your taxable income is ₹12 lakh or less, the Section 87A rebate cancels your tax completely.',
  advanceTax: 'If your tax for the year (after TDS) is ₹10,000 or more, you pay it in four instalments — 15 Jun, 15 Sep, 15 Dec and 15 Mar — instead of all at the end.',
  presumptive: 'A simpler way to be taxed: instead of totalling expenses, you pay tax on a fixed share of your receipts (50% for professionals). Ask your CA if it suits you.',
  lut: 'Letter of Undertaking: filed once a year on the GST portal so you can invoice foreign clients without charging IGST.',
  gstin: 'Your 15-character GST number. The first two digits are your state code.',
};

export default function InfoTip({ term, text }) {
  return <InlineTooltip text={text || GLOSSARY[term]} />;
}
