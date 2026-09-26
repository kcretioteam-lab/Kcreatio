-- 019: make invoice creation safe to retry.
-- The browser sends a random clientRequestId with each new invoice. If the connection drops after the
-- server saved it (e.g. a timeout while Render wakes up), the retry carries the same id and gets the
-- existing invoice back instead of creating a duplicate with the next invoice number.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_client_request_id_key
  ON invoices (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
