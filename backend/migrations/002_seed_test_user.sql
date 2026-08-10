-- Test user seed: admin@kcreatio.in / admin123
-- Run AFTER 001_initial_schema.sql
-- Password hash = bcrypt("admin", 12 rounds) — for dev/testing only

INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  business_name,
  gstin,
  pan,
  business_address,
  state_code,
  invoice_prefix,
  plan,
  trial_ends_at
) VALUES (
  gen_random_uuid(),
  'admin@kcreatio.in',
  '$2b$12$YgUEinjHqeRvAUWrDaHLTOI/0snAV1k1IyucF5sq8vZ4RMS8cVI3S',  -- "admin123"
  'Admin User',
  'Test Creator Channel',
  '29ABCDE1234F1Z5',
  'ABCDE1234F',
  '123 Creator Street, Bengaluru, Karnataka - 560001',
  '29',
  'ADM',
  'pro',
  NOW() + INTERVAL '28 days'
) ON CONFLICT (email) DO NOTHING;
