-- Migration 007: Auth upgrade — OTP verification, lockout, token version, terms, OAuth, Gmail, social
-- Run in order, each ALTER is safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- Email OTP verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified boolean NOT NULL DEFAULT false;

-- Login attempt lockout (5 failures locks account)
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts int NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamptz;

-- JWT session invalidation — increment token_version on password reset to invalidate old tokens
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version int NOT NULL DEFAULT 0;

-- Terms acceptance at signup
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_emails boolean NOT NULL DEFAULT true;

-- Google OAuth identity
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text;
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_google_id_unique UNIQUE (google_id);

-- Gmail connect (read inbox + send as creator)
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_connected_email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_access_token text;   -- store encrypted in production
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_refresh_token text;  -- store encrypted in production
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_connected_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_last_scan_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_auto_detect boolean NOT NULL DEFAULT true;

-- Social profile URL links (paste fields — no OAuth required)
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
-- Expected shape: { instagram, youtube, facebook, x, tiktok, snapchat, linkedin, website }

-- Social verified OAuth connections (pulled from platform APIs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_verified jsonb DEFAULT '{}'::jsonb;
-- Expected shape per platform: { connected, username, followers, access_token, last_synced }

-- Phone uniqueness index (allows NULL, only enforces unique on non-null values)
-- Safe to run even if index already exists via IF NOT EXISTS
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique
  ON users (phone) WHERE phone IS NOT NULL AND phone != '';

-- Normalize empty strings to NULL for optional text fields (data quality)
UPDATE users SET gstin = NULL WHERE gstin = '';
UPDATE users SET pan = NULL WHERE pan = '';
UPDATE users SET business_address = NULL WHERE business_address = '';
UPDATE users SET phone = NULL WHERE phone = '';
UPDATE users SET invoice_phone = NULL WHERE invoice_phone = '';
UPDATE users SET invoice_email = NULL WHERE invoice_email = '';

-- Add invoice payment confirmation token columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_confirm_token text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_confirm_expires_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_confirmed_by_brand boolean NOT NULL DEFAULT false;
