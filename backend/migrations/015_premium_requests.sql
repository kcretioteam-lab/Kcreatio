-- Kcretio — Migration 015
-- Premium access by request: users ask for 28 days of Pro, admin approves via emailed link.
-- Replaces paid upgrades while payments are disabled.
CREATE TABLE IF NOT EXISTS premium_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  features        TEXT[] NOT NULL DEFAULT '{}',
  platform        TEXT CHECK (platform IN ('youtube', 'instagram', 'other')),
  follower_count  INTEGER CHECK (follower_count >= 0),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_premium_requests_user ON premium_requests(user_id, created_at DESC);

-- One open request per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_premium_requests_pending
  ON premium_requests(user_id) WHERE status = 'pending';

ALTER TABLE premium_requests ENABLE ROW LEVEL SECURITY;
