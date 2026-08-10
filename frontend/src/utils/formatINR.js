const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const INR_DECIMAL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(amount) {
  return INR.format(amount);
}

export function formatINRDecimal(amount) {
  return INR_DECIMAL.format(amount);
}

export function formatINRCompact(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return formatINR(amount);
}

// Indian number system: ones, tens, hundreds, thousands, lakhs, crores
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWordsBelowThousand(n) {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWordsBelowThousand(n % 100) : '');
}

export function amountInWords(amount) {
  const n = Math.round(amount);
  if (n === 0) return 'INR Zero Only';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;
  let words = '';
  if (crore) words += numToWordsBelowThousand(crore) + ' Crore ';
  if (lakh) words += numToWordsBelowThousand(lakh) + ' Lakh ';
  if (thousand) words += numToWordsBelowThousand(thousand) + ' Thousand ';
  if (remainder) words += numToWordsBelowThousand(remainder);
  return 'INR ' + words.trim() + ' Only';
}

