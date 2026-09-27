// INV-08-FALLBACK: run against a backend whose CHROME_PATH points nowhere, so every PDF goes through the
// pdfmake fallback. The server must stay up, and Basic PDFs must still carry the watermark.
import { client, check, eq, expect, state, login, logSize, logSince } from './lib.mjs';

async function pdfText(buf) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) text += (await (await doc.getPage(i)).getTextContent()).items.map(x => x.str).join('');
  return text;
}

const s = state.get();
const c = await login();

await check('INV-08-FALLBACK', async () => {
  const since = logSize();
  const pro = await c.get(`/invoices/${s.invIntra}/pdf`);                       // QA account is on trial (Pro) by now
  // Same invoice as a Basic user (dev-bypass header — local development only) to check the watermark
  const basic = await client().get(`/invoices/${s.invIntra}/pdf`, { 'X-Dev-User-Id': s.userId, 'X-Dev-Plan': 'basic' });
  const health = await client().get('http://localhost:4000/api/health');
  const usedFallback = /Puppeteer PDF failed, falling back to pdfmake/.test(logSince(since));
  eq(pro.status, 200, 'Pro PDF'); eq(basic.status, 200, 'Basic PDF'); eq(health.status, 200, 'server still up');
  expect(usedFallback, 'Puppeteer did not fail — restart the backend with a bogus CHROME_PATH for this step');
  const proText = await pdfText(pro.data), basicText = await pdfText(basic.data);
  expect(/Made with ease on kcreatio\.com/.test(basicText), 'Basic fallback PDF has no watermark');
  expect(!/Made with ease on kcreatio\.com/.test(proText), 'Pro fallback PDF is watermarked');
  for (const want of [/Add: CGST @ 9%/, /Add: SGST @ 9%/, /One Lakh Eighteen Thousand/i, /reverse charge: No/, /998399/, /State Code: 29/]) {
    expect(want.test(proText), `fallback PDF missing ${want}`);
  }
  return { notes: `Puppeteer failed → pdfmake fallback served both PDFs (200) and the server stayed up. Basic copy watermarked, Pro copy clean; Rule 46 lines present (Add: CGST/SGST @ 9%, amount in words, reverse charge, SAC, state codes)` };
});
