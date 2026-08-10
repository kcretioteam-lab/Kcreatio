-- Smart Inbox: email detection results from Gmail scanning and manual paste
CREATE TABLE IF NOT EXISTS email_detections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id  TEXT,
  source            TEXT NOT NULL DEFAULT 'gmail'
                    CHECK (source IN ('gmail', 'manual')),
  detected_type     TEXT NOT NULL
                    CHECK (detected_type IN (
                      'deal_inquiry', 'deal_confirmed', 'payment_received',
                      'tds_deduction', 'expense', 'form_16a', 'other'
                    )),
  confidence        NUMERIC(3,2) NOT NULL DEFAULT 0.00
                    CHECK (confidence >= 0 AND confidence <= 1),
  status            TEXT NOT NULL DEFAULT 'pending_review'
                    CHECK (status IN ('pending_review', 'accepted', 'rejected', 'auto_applied')),
  raw_subject       TEXT,
  raw_sender        TEXT,
  raw_sender_email  TEXT,
  raw_snippet       TEXT,
  email_received_at TIMESTAMPTZ,
  scanned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  extracted_data    JSONB NOT NULL DEFAULT '{}',
  linked_deal_id    UUID REFERENCES deals(id) ON DELETE SET NULL,
  linked_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  linked_tds_id     UUID REFERENCES tds_records(id) ON DELETE SET NULL,
  linked_income_id  UUID REFERENCES income(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent reprocessing the same Gmail message per user
CREATE UNIQUE INDEX IF NOT EXISTS email_detections_gmail_msg_uniq
  ON email_detections(user_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_detections_user_status
  ON email_detections(user_id, status);

CREATE INDEX IF NOT EXISTS email_detections_user_received
  ON email_detections(user_id, email_received_at DESC);

-- RLS: users see only their own detections
ALTER TABLE email_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own detections" ON email_detections
  FOR ALL USING (user_id = auth.uid());
