import { google } from 'googleapis';
import { classifyEmail, ClassifierResult } from './emailClassifier.js';

function getClient(accessToken: string, refreshToken?: string | null) {
  // Use googleapis bundled OAuth2 to avoid version conflicts
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken || undefined });
  return client;
}

export interface InboxScanResult extends ClassifierResult {
  gmailMessageId: string;
  emailReceivedAt: string;  // ISO — from the email's Date header
  rawSubject: string;
  rawSender: string;       // full "Name <email>" string
  rawSenderEmail: string;  // parsed email only
  rawSnippet: string;
}

// Decode base64url email body part to plain text
function decodeBody(data?: string | null): string {
  if (!data) return '';
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

// Extract plain text from Gmail message parts recursively
function extractBodyText(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBody(payload.body.data);
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    // Strip HTML tags for plain-text matching
    return decodeBody(payload.body.data).replace(/<[^>]+>/g, ' ');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBodyText(part);
      if (text) return text;
    }
  }
  return '';
}

// Parse "Name <email@domain.com>" or plain email into { name, email }
function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^"?([^"<]+?)"?\s*<([^>]+)>/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: from, email: from };
}

// scanInbox — full classifier scan for all detection types.
// Fetches emails since sinceDate (or last 7 days), returns ClassifierResults.
export async function scanInbox(
  accessToken: string,
  refreshToken: string | null | undefined,
  sinceDate?: Date,
): Promise<InboxScanResult[]> {
  const auth = getClient(accessToken, refreshToken);
  const gmail = google.gmail({ version: 'v1', auth });

  // Build query: look for emails from the past 7 days (or since last scan)
  const daysBack = sinceDate
    ? Math.max(1, Math.ceil((Date.now() - sinceDate.getTime()) / 86400000))
    : 7;
  const q = `newer_than:${daysBack}d -category:promotions -category:social`;

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: 100,
  });

  const messages = listRes.data.messages || [];
  const results: InboxScanResult[] = [];

  for (const msg of messages.slice(0, 60)) {
    try {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      const headers = full.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const fromRaw = getHeader('From');
      const dateStr = getHeader('Date');
      const snippet = full.data.snippet || '';
      const body = extractBodyText(full.data.payload);

      const { name: fromName, email: fromEmail } = parseSender(fromRaw);
      const emailReceivedAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

      const classification = classifyEmail({ subject, body: `${snippet} ${body}`, fromEmail, fromName });

      // Skip low-signal emails (other type with 0 confidence)
      if (classification.type === 'other') continue;

      results.push({
        ...classification,
        gmailMessageId: msg.id!,
        emailReceivedAt,
        rawSubject: subject,
        rawSender: fromRaw,
        rawSenderEmail: fromEmail,
        rawSnippet: snippet.slice(0, 300),
      });
    } catch {
      // Per-message errors don't stop the scan
    }
  }

  return results;
}


// Common bank email patterns for Indian banks (used by legacy scanForPayments)
export interface PaymentSignal {
  amount: number;
  senderName: string;
  senderEmail: string;
  date: string;
  subject: string;
  gmailMessageId: string;
  confidence: 'high' | 'medium';
}

const BANK_PATTERNS = {
  senders: ['hdfc', 'icici', 'sbi', 'axis', 'kotak', 'idfc', 'paytm', 'phonepe', 'gpay', 'amazon'],
  subjects: ['credited', 'payment received', 'amount credited', 'neft', 'imps', 'upi transfer', 'payment confirmed'],
  amountRegex: /(?:inr|₹|rs\.?)\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
};

export async function scanForPayments(
  accessToken: string,
  refreshToken?: string | null
): Promise<PaymentSignal[]> {
  const auth = getClient(accessToken, refreshToken);
  const gmail = google.gmail({ version: 'v1', auth });

  const q = `(${BANK_PATTERNS.subjects.map(s => `subject:${s}`).join(' OR ')}) newer_than:30d`;

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: 50,
  });

  const messages = listRes.data.messages || [];
  const signals: PaymentSignal[] = [];

  for (const msg of messages.slice(0, 30)) {
    try {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = full.data.payload?.headers || [];
      const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const dateStr = getHeader('Date');

      // Skip obvious non-payment emails
      const subjectLower = subject.toLowerCase();
      if (!BANK_PATTERNS.subjects.some(p => subjectLower.includes(p))) continue;

      // Extract amount from subject
      const snippet = full.data.snippet || '';
      const text = `${subject} ${snippet}`;
      const amountMatches = [...text.matchAll(BANK_PATTERNS.amountRegex)];

      if (!amountMatches.length) continue;

      const amountStr = amountMatches[0][1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) continue;

      // Extract sender name and email
      const fromMatch = from.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
      const senderName = fromMatch?.[1]?.trim() || from;
      const senderEmail = fromMatch?.[2]?.trim() || from;

      const isBankSender = BANK_PATTERNS.senders.some(b =>
        senderEmail.toLowerCase().includes(b) || senderName.toLowerCase().includes(b)
      );

      signals.push({
        amount,
        senderName,
        senderEmail,
        date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        subject,
        gmailMessageId: msg.id!,
        confidence: isBankSender ? 'high' : 'medium',
      });
    } catch {
      // Skip messages that fail to parse
    }
  }

  return signals;
}

export async function sendViaGmail(
  accessToken: string,
  refreshToken: string | null,
  opts: {
    to: string;
    subject: string;
    html: string;
    fromName?: string;
    fromEmail?: string;
    pdfBuffer?: Buffer;
    pdfFilename?: string;
  }
) {
  const auth = getClient(accessToken, refreshToken);
  const gmail = google.gmail({ version: 'v1', auth });

  const boundary = `boundary_${Date.now()}`;
  const from = opts.fromEmail ? `${opts.fromName || opts.fromEmail} <${opts.fromEmail}>` : (opts.fromName || '');

  let rawEmail: string;

  if (opts.pdfBuffer) {
    // Multipart email with PDF attachment
    const pdfB64 = opts.pdfBuffer.toString('base64');
    rawEmail = [
      `MIME-Version: 1.0`,
      `From: ${from}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      opts.html,
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="${opts.pdfFilename || 'invoice.pdf'}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${opts.pdfFilename || 'invoice.pdf'}"`,
      '',
      pdfB64,
      '',
      `--${boundary}--`,
    ].join('\r\n');
  } else {
    rawEmail = [
      `MIME-Version: 1.0`,
      `From: ${from}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      `Content-Type: text/html; charset=UTF-8`,
      '',
      opts.html,
    ].join('\r\n');
  }

  const encodedEmail = Buffer.from(rawEmail).toString('base64url');
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedEmail },
  });
}
