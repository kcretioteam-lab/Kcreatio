// Email classifier: keyword-rule based detection for all 5 email types.
// Returns type, confidence (0.00–1.00), human-readable reasons, and extracted data.
// Designed to be unit-testable with no external dependencies.

export type DetectedType =
  | 'deal_inquiry'
  | 'deal_confirmed'
  | 'payment_received'
  | 'tds_deduction'
  | 'expense'
  | 'form_16a'
  | 'other';

export interface ClassifierInput {
  subject: string;
  body: string;
  fromEmail?: string;
  fromName?: string;
}

export interface ClassifierResult {
  type: DetectedType;
  confidence: number;
  reasons: string[];
  extracted: {
    brand_name?: string;
    amount?: number;       // in rupees (not paise)
    tds_rate?: number;
    tan?: string;
    contact_email?: string;
    description?: string;
  };
}

// ── Amount extraction ──────────────────────────────────────────────────────────

const AMOUNT_REGEX = /(?:INR|₹|Rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi;
const LAKH_REGEX = /([0-9]+(?:\.[0-9]+)?)\s*(?:lakh|lac|L\b)/gi;
const K_REGEX = /([0-9]+(?:\.[0-9]+)?)\s*[kK]\b/g;

function extractAmount(text: string): number | undefined {
  const matches = [...text.matchAll(AMOUNT_REGEX)];
  if (matches.length) {
    const raw = matches[0][1].replace(/,/g, '');
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) return val;
  }
  const lakhMatches = [...text.matchAll(LAKH_REGEX)];
  if (lakhMatches.length) {
    const val = parseFloat(lakhMatches[0][1]) * 100000;
    if (!isNaN(val) && val > 0) return val;
  }
  const kMatches = [...text.matchAll(K_REGEX)];
  if (kMatches.length) {
    const val = parseFloat(kMatches[0][1]) * 1000;
    if (!isNaN(val) && val > 0) return val;
  }
  return undefined;
}

// ── TAN extraction ─────────────────────────────────────────────────────────────

const TAN_REGEX = /\b([A-Z]{4}[0-9]{5}[A-Z])\b/g;

function extractTAN(text: string): string | undefined {
  const matches = [...text.matchAll(TAN_REGEX)];
  return matches[0]?.[1];
}

// ── TDS rate extraction ────────────────────────────────────────────────────────

const TDS_RATE_REGEX = /(?:@|at|rate)\s*([0-9]+(?:\.[0-9]+)?)\s*%/i;

function extractTDSRate(text: string): number | undefined {
  const match = text.match(TDS_RATE_REGEX);
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0 && val <= 100) return val;
  }
  // Common TDS rates as fallback keyword
  if (/194[JCH]/i.test(text)) return 10;
  return undefined;
}

// ── Sender domain helpers ──────────────────────────────────────────────────────

const BANK_DOMAINS = [
  'hdfcbank.com', 'icicibank.com', 'sbi.co.in', 'axisbank.com', 'kotakbank.com',
  'idfcfirstbank.com', 'yesbank.in', 'indusind.com', 'federalbank.co.in',
  'paytm.com', 'phonepe.com', 'google.com',  // gpay uses google.com sender
  'amazonpay.in', 'razorpay.com', 'cashfree.com', 'instamojo.com',
  'payoneer.com', 'wise.com', 'paypal.com',
  'noreply.alerts',  // some bank alert sub-patterns
];

const SAAS_DOMAINS = [
  'adobe.com', 'notion.so', 'canva.com', 'zoom.us', 'figma.com', 'slack.com',
  'github.com', 'dropbox.com', 'spotify.com', 'netflix.com', 'hotstar.com',
  'phonepe.com', 'aweber.com', 'convertkit.com', 'mailchimp.com',
  'godaddy.com', 'namecheap.com', 'hostinger.com', 'digitalocean.com',
  'aws.amazon.com', 'google.com',  // Google Workspace billing
  'microsoft.com', 'apple.com',
];

function domainFromEmail(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

function isBankSender(email: string): boolean {
  const d = domainFromEmail(email);
  return BANK_DOMAINS.some(b => d.includes(b));
}

function isSaaSSender(email: string): boolean {
  const d = domainFromEmail(email);
  return SAAS_DOMAINS.some(s => d.includes(s));
}

// ── Keyword lists ──────────────────────────────────────────────────────────────

const PAYMENT_KEYWORDS = [
  'credited to your account', 'amount credited', 'payment received',
  'payment successful', 'neft credit', 'imps credit', 'upi credit',
  'transfer received', 'received inr', 'money received', 'paisa aaya',
  'payment aa gaya', 'successfully received', 'account mein credit',
  'has been credited', 'we have received your payment', 'payment confirmation',
  'settlement done', 'payout processed', 'earnings transferred',
  'adsense payment', 'balance transferred', 'remittance received',
  'transaction successful', 'credit alert', 'money credited',
  'your account has been credited', 'inward neft',
];

const DEAL_CONFIRMED_KEYWORDS = [
  'pleased to confirm', 'we confirm', 'deal finalized', 'agreement confirmed',
  'contract attached', 'signed agreement', 'po attached', 'purchase order',
  'work order', "we're excited to move forward", "let's proceed",
  "we'd like to go ahead", 'confirmed collaboration', 'booking confirmed',
  'deliverables confirmed', 'campaign confirmed', 'brief attached',
  'content brief', 'brand brief', 'scope of work', 'sow attached',
  'payment terms', 'invoice details', 'looking forward to working',
];

const DEAL_INQUIRY_KEYWORDS = [
  'collab', 'collaboration', 'partnership', 'sponsorship', 'brand deal',
  'paid promotion', 'campaign opportunity', 'ambassador program',
  'influencer program', "we'd love to work", 'are you open to',
  'would you be interested', 'collaboration opportunity', 'brand association',
  'paid partnership', 'we came across your profile', 'would love to feature',
  'gifting', 'product seeding', 'brand integration', 'promotions',
  'looking for influencers', 'creator program',
];

const TDS_KEYWORDS = [
  'tds deducted', 'tds has been deducted', 'tax deducted at source',
  'tan:', 'tan no', '194j', '194c', '194h', '26as', 'form 26as',
  'tds certificate', 'challan', 'deduction under section',
  'net amount after tds', 'gross amount', 'net payable after deduction',
  'tds kaat ke bheja', 'section 194', 'tds @ ', 'tds rate',
  'tax deduction', 'withholding tax',
];

const EXPENSE_KEYWORDS = [
  'subscription renewed', 'invoice for your subscription', 'your receipt',
  'payment confirmation for', 'billing summary', 'renewal receipt',
  'auto-renewed', 'plan renewed', 'your order', 'order confirmed',
  'charged', 'deducted for subscription', 'annual plan', 'monthly plan',
  'pro plan renewed', 'your subscription', 'subscription invoice',
  'billing receipt',
];

const FORM_16A_KEYWORDS = [
  'form 16a', 'form 16-a', 'tds certificate for fy', 'annual tds certificate',
  'please find attached form 16a', '16a attached', 'certificate under section 203',
  'form16a',
];

// ── Classifier ──────────────────────────────────────────────────────────────────

function matchKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw));
}

function confidenceScore(matched: number, total: number, base: number): number {
  if (matched === 0) return 0;
  const bonus = Math.min(0.20, (matched - 1) * 0.05);
  return Math.min(1, base + bonus);
}

export function classifyEmail(input: ClassifierInput): ClassifierResult {
  const { subject = '', body = '', fromEmail = '', fromName = '' } = input;
  const fullText = `${subject} ${body}`;
  const reasons: string[] = [];
  const extracted: ClassifierResult['extracted'] = {};

  // -- Check FORM 16A first (specific, avoid false-positives with TDS)
  const form16aMatches = matchKeywords(fullText, FORM_16A_KEYWORDS);
  if (form16aMatches.length) {
    reasons.push(`Subject/body matched Form 16A keywords: "${form16aMatches[0]}"`);
    extracted.brand_name = fromName || undefined;
    extracted.contact_email = fromEmail || undefined;
    return { type: 'form_16a', confidence: 0.75, reasons, extracted };
  }

  // -- TDS deduction
  const tdsMatches = matchKeywords(fullText, TDS_KEYWORDS);
  if (tdsMatches.length) {
    const tan = extractTAN(fullText);
    const amount = extractAmount(fullText);
    const tdsRate = extractTDSRate(fullText);

    reasons.push(`Matched TDS keywords: "${tdsMatches.slice(0, 2).join('", "')}"`);
    if (tan) { reasons.push(`TAN found: ${tan}`); extracted.tan = tan; }
    if (amount) { reasons.push(`Amount found: ₹${amount.toLocaleString('en-IN')}`); extracted.amount = amount; }
    if (tdsRate) { extracted.tds_rate = tdsRate; }
    extracted.brand_name = fromName || undefined;
    extracted.contact_email = fromEmail || undefined;

    const confidence = tan ? 0.90 : confidenceScore(tdsMatches.length, TDS_KEYWORDS.length, 0.65);
    return { type: 'tds_deduction', confidence, reasons, extracted };
  }

  // -- Payment received
  const paymentMatches = matchKeywords(fullText, PAYMENT_KEYWORDS);
  if (paymentMatches.length) {
    const amount = extractAmount(fullText);
    const bankSender = fromEmail ? isBankSender(fromEmail) : false;

    reasons.push(`Matched payment keywords: "${paymentMatches.slice(0, 2).join('", "')}"`);
    if (bankSender) reasons.push(`Sender domain matched known bank/fintech: ${domainFromEmail(fromEmail)}`);
    if (amount) { reasons.push(`Amount found: ₹${amount.toLocaleString('en-IN')}`); extracted.amount = amount; }
    extracted.brand_name = fromName || undefined;
    extracted.contact_email = fromEmail || undefined;

    const base = bankSender ? 0.85 : 0.60;
    const confidence = amount ? Math.min(1, base + 0.08) : base;
    return { type: 'payment_received', confidence, reasons, extracted };
  }

  // -- Expense / SaaS billing
  const expenseMatches = matchKeywords(fullText, EXPENSE_KEYWORDS);
  const saasSender = fromEmail ? isSaaSSender(fromEmail) : false;
  if (expenseMatches.length || saasSender) {
    const amount = extractAmount(fullText);

    if (expenseMatches.length) reasons.push(`Matched expense/billing keywords: "${expenseMatches.slice(0, 2).join('", "')}"`);
    if (saasSender) reasons.push(`Sender domain matched known SaaS provider: ${domainFromEmail(fromEmail)}`);
    if (amount) { reasons.push(`Amount found: ₹${amount.toLocaleString('en-IN')}`); extracted.amount = amount; }
    extracted.description = subject || undefined;
    extracted.contact_email = fromEmail || undefined;

    const confidence = saasSender ? 0.88 : confidenceScore(expenseMatches.length, EXPENSE_KEYWORDS.length, 0.60);
    return { type: 'expense', confidence, reasons, extracted };
  }

  // -- Deal confirmed (hard commitment)
  const confirmedMatches = matchKeywords(fullText, DEAL_CONFIRMED_KEYWORDS);
  if (confirmedMatches.length) {
    const amount = extractAmount(fullText);

    reasons.push(`Matched deal confirmation keywords: "${confirmedMatches.slice(0, 2).join('", "')}"`);
    if (amount) { reasons.push(`Deal amount found: ₹${amount.toLocaleString('en-IN')}`); extracted.amount = amount; }
    extracted.brand_name = fromName || undefined;
    extracted.contact_email = fromEmail || undefined;

    // Need both a confirmation keyword AND something concrete (amount OR brief/PO word) for high confidence
    const hasConcreteSignal = amount != null || confirmedMatches.some(m =>
      ['po attached', 'purchase order', 'work order', 'brief attached', 'content brief', 'brand brief', 'sow attached'].includes(m)
    );
    const confidence = hasConcreteSignal
      ? confidenceScore(confirmedMatches.length, DEAL_CONFIRMED_KEYWORDS.length, 0.75)
      : 0.55;

    // Below 0.70 → demote to soft inquiry
    if (confidence < 0.70) {
      reasons.push('Confidence too low for confirmed deal — treated as soft inquiry');
      return { type: 'deal_inquiry', confidence: 0.40, reasons, extracted };
    }
    return { type: 'deal_confirmed', confidence, reasons, extracted };
  }

  // -- Deal inquiry (soft interest — NEVER auto-applied)
  const inquiryMatches = matchKeywords(fullText, DEAL_INQUIRY_KEYWORDS);
  if (inquiryMatches.length) {
    const amount = extractAmount(fullText);

    reasons.push(`Matched collaboration interest keywords: "${inquiryMatches.slice(0, 2).join('", "')}"`);
    if (amount) { reasons.push(`Potential deal amount found: ₹${amount.toLocaleString('en-IN')}`); extracted.amount = amount; }
    extracted.brand_name = fromName || undefined;
    extracted.contact_email = fromEmail || undefined;

    // Soft inquiries are capped at 0.45 — they never trigger auto-apply
    const confidence = Math.min(0.45, confidenceScore(inquiryMatches.length, DEAL_INQUIRY_KEYWORDS.length, 0.25));
    return { type: 'deal_inquiry', confidence, reasons, extracted };
  }

  return { type: 'other', confidence: 0, reasons: ['No patterns matched'], extracted };
}
