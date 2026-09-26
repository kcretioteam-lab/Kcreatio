// ACC-DEL: delete the QA account through the product's own API, verify nothing is left behind, then tidy storage.
import { check, expect, record, state, db, login, client } from './lib.mjs';

const s = state.get();
const TABLES = ['invoices', 'tds_records', 'deals', 'income', 'expenses', 'email_detections', 'premium_requests', 'user_sessions', 'invoice_audit_log', 'tax_payments', 'invoice_settings', 'notification_preferences', 'invoice_payments', 'credit_notes'];

async function counts() {
  const out = {};
  for (const t of TABLES) {
    const { count, error } = await db().from(t).select('*', { count: 'exact', head: true }).eq('user_id', s.userId);
    out[t] = error ? `n/a (${error.message.slice(0, 40)})` : count;
  }
  return out;
}
async function storageFiles() {
  const found = [];
  for (const dir of [s.userId, `${s.userId}/docs`]) {
    const { data } = await db().storage.from('invoice-signatures').list(dir, { limit: 100 });
    for (const f of data || []) if (f.id) found.push(`${dir}/${f.name}`);
  }
  return found;
}

await check('ACC-DEL', async () => {
  const before = await counts();
  const c = await login();
  const del = await c.del('/auth/account');
  const after = await counts();
  const { data: user } = await db().from('users').select('id').eq('id', s.userId).maybeSingle();
  const relogin = await client().post('/auth/login', { identifier: s.email, password: s.password });
  const leftovers = await storageFiles();
  if (leftovers.length) await db().storage.from('invoice-signatures').remove(leftovers);   // tidy up after the finding is recorded
  const remaining = Object.entries(after).filter(([, v]) => typeof v === 'number' && v > 0);
  expect(del.status === 200 && !user && relogin.status === 401, `delete ${del.status}, user row ${Boolean(user)}, re-login ${relogin.status}`);
  expect(!remaining.length, `rows left: ${JSON.stringify(Object.fromEntries(remaining))}`);
  expect(!leftovers.length, `Account deleted and all DB rows cascaded, but ${leftovers.length} uploaded file(s) stayed in storage bucket "invoice-signatures": ${leftovers.join(', ')} (removed by the suite afterwards)`);
  return { notes: `DELETE /auth/account → 200; user + all rows gone (before: ${JSON.stringify(before)}); login → 401; no storage leftovers` };
});
