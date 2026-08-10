-- Migration 004: UPI settings type, scanner image, brand contact fields

-- 1. Add contact fields to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS brand_email       text,
  ADD COLUMN IF NOT EXISTS brand_phone       text,
  ADD COLUMN IF NOT EXISTS include_upi       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS upi_scanner_url   text;

-- 2. Add scanner_image_url to invoice_settings
ALTER TABLE invoice_settings
  ADD COLUMN IF NOT EXISTS scanner_image_url text;

-- 3. Extend setting_type to include 'upi'
-- Drop old constraint and recreate with upi added
ALTER TABLE invoice_settings
  DROP CONSTRAINT IF EXISTS invoice_settings_setting_type_check;

ALTER TABLE invoice_settings
  ADD CONSTRAINT invoice_settings_setting_type_check
  CHECK (setting_type IN ('bank_account', 'terms', 'signatory', 'upi'));

-- Note: Run this in Supabase SQL Editor after running migrations 001-003
