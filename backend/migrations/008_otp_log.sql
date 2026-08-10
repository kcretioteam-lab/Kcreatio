-- Migration 008: OTP log table (rate-limited, replay-attack safe)
CREATE TABLE IF NOT EXISTS otp_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  otp_hash    text NOT NULL,
  purpose     text NOT NULL CHECK (purpose IN ('email_verify', 'password_reset')),
  expires_at  timestamptz NOT NULL,
  used        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup during verification
CREATE INDEX IF NOT EXISTS otp_logs_lookup
  ON otp_logs (email, purpose, used, expires_at);

-- Auto-clean: expired OTPs purged by app logic or scheduled job
-- No FK to users — email may not exist yet during registration OTP flow
