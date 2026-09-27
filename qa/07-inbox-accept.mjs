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
  expect(t.det.linked_tds_id && p.det.linked_income_id,
    `Detections accepted (HTTP ${t.accept.status}/${p.accept.status}) without a linked record: linked_tds_id=${t.det.linked_tds_id}, linked_income_id=${p.det.linked_income_id} — ${JSON.stringify(t.accept.data)} ${JSON.stringify(p.accept.data)}`);

  const { data: tds } = await db().from('tds_records').select('invoice_amount, tds_amount, received_amount, brand_tan').eq('id', t.det.linked_tds_id).single();
  const { data: income } = await db().from('income').select('amount').eq('id', p.det.linked_income_id).single();
  const { data: payTds } = await db().from('tds_records').select('invoice_amount, tds_amount, received_amount').eq('id', p.det.linked_tds_id).maybeSingle();
  eq(tds.invoice_amount, 100000, 'TDS row taxable value'); eq(tds.tds_amount, 10000, 'TDS row TDS'); eq(tds.received_amount, 90000, 'TDS row received');
  eq(income.amount, 50000, 'payment income = taxable value (received + TDS)');
  expect(payTds && Number(payTds.tds_amount) === 5000, `payment TDS row ${JSON.stringify(payTds)}`);

  // A detection whose record can't be saved stays pending instead of being marked accepted
  const bad = await c.post('/email-detections/paste', { subject: 'TDS deducted', body: 'TDS has been deducted under section 194J.', from_email: 'x@brand.example' });
  const badAccept = await c.put(`/email-detections/${bad.data.detection.id}/accept`, {});
  const { data: badDet } = await db().from('email_detections').select('status').eq('id', bad.data.detection.id).single();
  eq(badAccept.status, 422, 'accept with no amounts'); eq(badDet.status, 'pending_review', 'status after failed accept');

  return { notes: `TDS email → TDS row ₹10,000 on ₹1,00,000 (received ₹90,000, TAN ${tds.brand_tan}); payment email → income ₹50,000 + TDS row ₹5,000; a detection with no amounts → 422 "${badAccept.data.message}" and stays pending` };
});
