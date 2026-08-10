-- Kcreatio — Migration 003
-- Extends invoices table + adds invoice_settings table
-- Run AFTER 001_initial_schema.sql and 002_seed_test_user.sql

-- ── Part A: Extend invoices table with missing columns ────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS sac_code             text NOT NULL DEFAULT '998399',
  ADD COLUMN IF NOT EXISTS place_of_supply      char(2),
  ADD COLUMN IF NOT EXISTS reverse_charge       text NOT NULL DEFAULT 'No',
  ADD COLUMN IF NOT EXISTS template_id          text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS payment_terms        text NOT NULL DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS brand_pan            text,
  ADD COLUMN IF NOT EXISTS include_bank_details boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_name            text,
  ADD COLUMN IF NOT EXISTS account_number       text,
  ADD COLUMN IF NOT EXISTS ifsc_code            text,
  ADD COLUMN IF NOT EXISTS account_holder_name  text,
  ADD COLUMN IF NOT EXISTS upi_id               text,
  ADD COLUMN IF NOT EXISTS include_terms        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_text           text,
  ADD COLUMN IF NOT EXISTS include_signatory    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signatory_name       text,
  ADD COLUMN IF NOT EXISTS signatory_image_url  text,
  ADD COLUMN IF NOT EXISTS seller_business_name text;

-- ── Part B: New invoice_settings table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'bank_account' | 'terms' | 'signatory'
  setting_type        text NOT NULL CHECK (setting_type IN ('bank_account', 'terms', 'signatory')),
  name                text NOT NULL,           -- display label: "HDFC Primary", "Standard T&C"
  is_default          boolean NOT NULL DEFAULT false,

  -- Bank account fields
  bank_name           text,
  account_number      text,
  ifsc_code           text,
  account_holder_name text,
  upi_id              text,

  -- T&C fields
  terms_text          text,

  -- Signatory fields
  signatory_name      text,
  signatory_image_url text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_settings_user_id
  ON invoice_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_invoice_settings_user_type
  ON invoice_settings(user_id, setting_type);

-- ── Part C: RLS ───────────────────────────────────────────────────────────────
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see own invoice_settings"
  ON invoice_settings
  FOR ALL
  USING (user_id = auth.uid());

-- ── NOTE: Supabase Storage ────────────────────────────────────────────────────
-- Create a private bucket named "invoice-signatures" via the Supabase dashboard:
--   Storage → New bucket → Name: invoice-signatures → Private
-- The backend upload route handles file storage at path: {userId}/{timestamp}.{ext}
