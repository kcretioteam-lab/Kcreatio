// INB-ACCEPT: accepting Smart Inbox detections must create the linked TDS / income records.
import { check, eq, expect, state, db, login } from './lib.mjs';
const c = await login();

async function pasteAndAccept(subject, body) {
  const p = await c.post('/email-detections/paste', { subject, body, from_email: 'accounts@brand.example', from_name: 'Brand Accounts' });
  const a = await c.put(`/email-detections/${p.data.detection.id}/accept`, {});
  const { data: det } = await db().from('email_detections').select('status, detected_type, linked_tds_id, linked_income_id').eq('id', p.data.detection.id).single();
  return { cl: p.data.classification, accept: a, det };
}

await check('INB-ACCEPT', async () => {
  const t = await pasteAndAccept('TDS deducted on invoice INV/2627/0001',
    'Dear Creator, TDS of Rs. 10,000 has been deducted under Section 194J on your invoice of Rs. 1,00,000. TAN: BLRM12345C.');
  const p = await pasteAndAccept('Payment credited',
    'Rs. 45,000 has been credited to your account towards your campaign invoice after deducting TDS of Rs. 5,000.');
  const { count: incomeRows } = await db().from('income').select('id', { count: 'exact', head: true }).eq('user_id', state.get().userId).eq('amount', 45000);
  const ev = {
    tds: { type: t.det.detected_type, http: t.accept.status, status: t.det.status, linked_tds_id: t.det.linked_tds_id, extracted: t.cl.extracted },
    payment: { type: p.det.detected_type, http: p.accept.status, status: p.det.status, linked_income_id: p.det.linked_income_id, incomeRows },
  };
  expect(t.det.linked_tds_id && p.det.linked_income_id,
    `Detections marked "accepted" (HTTP ${t.accept.status}/${p.accept.status}) but no record created: linked_tds_id=${t.det.linked_tds_id}, linked_income_id=${p.det.linked_income_id}. ` +
    'Inserts write an "extracted_data" column that tds_records/income/expenses do not have ("Could not find the \'extracted_data\' column of \'tds_records\'"); the error is ignored. ' +
    `Even if it saved, the TDS email extracts amount=${t.cl.extracted.amount} (the TDS) and the accept path treats it as the invoice value → TDS ₹${t.cl.extracted.amount * (t.cl.extracted.tds_rate / 100)} instead of ₹10,000`);
  return { notes: 'Linked records created', evidence: ev };
});
