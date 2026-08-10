/**
 * Creates a test user: admin@kcreatio.in / admin123
 * Run: node scripts/seed-test-user.js
 * Requires backend/.env to be configured.
 */

require('dotenv').config({ path: __dirname + '/../backend/.env' });

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  const email = 'admin@kcreatio.in';
  const password = 'admin123';;
  const name = 'Admin User';

  console.log(`Creating test user: ${email} / ${password}`);

  const hash = await bcrypt.hash(password, 12);

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 28);

  // Upsert so re-running is safe
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        email,
        password_hash: hash,
        name,
        business_name: 'Test Creator',
        gstin: '29ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        business_address: '123 Creator Street, Bengaluru, Karnataka - 560001',
        state_code: '29',
        invoice_prefix: 'ADM',
        plan: 'pro',           // give Pro access so all features are unlocked
        trial_ends_at: trialEndsAt.toISOString(),
      },
      { onConflict: 'email' }
    )
    .select('id, email, plan')
    .single();

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('✓ Test user created/updated:', data);
  console.log('\n  Email:    admin@kcreatio.in');
  console.log('  Password: admin123');
  console.log('  Plan:     Pro (all features unlocked)\n');
}

seed().catch(console.error);
