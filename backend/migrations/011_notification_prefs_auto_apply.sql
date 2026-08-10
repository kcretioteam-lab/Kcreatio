-- Add auto-apply settings and deal follow-up alert to notification_preferences
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS gmail_auto_apply           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gmail_auto_apply_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.90
                                                      CHECK (gmail_auto_apply_threshold >= 0.50 AND gmail_auto_apply_threshold <= 1.00),
  ADD COLUMN IF NOT EXISTS deal_followup_alerts       BOOLEAN NOT NULL DEFAULT true;
