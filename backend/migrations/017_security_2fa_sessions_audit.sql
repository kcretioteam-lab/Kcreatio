-- Kcretio — Migration 017
-- Two-factor login (authenticator app), signed-in sessions, and an invoice audit log.

-- ─── 2FA ────────────────────────────────────────────────────────────────────
-- totp_secret is AES-256-GCM encrypted by the backend (never stored in plain text).
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret         text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled        boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_recovery_codes text[]  NOT NULL DEFAULT '{}';  -- sha256 hashes
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last_step      bigint;                          -- blocks code replay

-- ─── Sessions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent    text,
  ip            text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, revoked_at);
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- ─── Invoice audit log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id  uuid,                         -- kept after the invoice is deleted
  invoice_number text,
  action      text NOT NULL CHECK (action IN ('created', 'updated', 'sent', 'paid', 'deleted', 'brand_confirmed')),
  changes     jsonb,
  session_id  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_invoice ON invoice_audit_log(invoice_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_user ON invoice_audit_log(user_id, created_at DESC);
ALTER TABLE invoice_audit_log ENABLE ROW LEVEL SECURITY;
