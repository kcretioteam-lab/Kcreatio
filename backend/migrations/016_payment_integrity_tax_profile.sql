-- Kcretio — Migration 016
-- 1. Payment integrity: marking an invoice/deal paid happens in one transaction,
--    logs income on the taxable value (excl. GST), logs the TDS actually deducted,
--    and can't be repeated.
-- 2. Tax Profile fields that drive the tax engine.
-- 3. Multi-line invoices.

-- ─── Columns ────────────────────────────────────────────────────────────────
ALTER TABLE invoices    ADD COLUMN IF NOT EXISTS paid_at         timestamptz;
ALTER TABLE invoices    ADD COLUMN IF NOT EXISTS amount_received numeric(12,2);
ALTER TABLE invoices    ADD COLUMN IF NOT EXISTS line_items      jsonb;

ALTER TABLE tds_records ADD COLUMN IF NOT EXISTS section         text;
ALTER TABLE tds_records ADD COLUMN IF NOT EXISTS quarter         char(2);
ALTER TABLE tds_records ADD COLUMN IF NOT EXISTS deal_id         uuid REFERENCES deals(id) ON DELETE SET NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS gst_registered boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS legal_name     text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trade_name     text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_regime     text NOT NULL DEFAULT 'new' CHECK (tax_regime IN ('new', 'old'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS presumptive    text NOT NULL DEFAULT 'none' CHECK (presumptive IN ('none', '44ADA', '44AD'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS lut_number     text;

-- Backfill quarters that were never set (deal mark-paid used to skip it).
UPDATE income SET quarter = CASE
  WHEN EXTRACT(MONTH FROM income_date) BETWEEN 4 AND 6  THEN 'Q1'
  WHEN EXTRACT(MONTH FROM income_date) BETWEEN 7 AND 9  THEN 'Q2'
  WHEN EXTRACT(MONTH FROM income_date) BETWEEN 10 AND 12 THEN 'Q3'
  ELSE 'Q4' END
WHERE quarter IS NULL;

-- ─── One income / TDS row per invoice ───────────────────────────────────────
-- Skipped (with a notice) if old duplicates exist — clean those up by hand, then re-run.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM income WHERE invoice_id IS NOT NULL GROUP BY invoice_id HAVING count(*) > 1) THEN
    RAISE NOTICE 'Duplicate income rows per invoice exist — uniq_income_invoice not created';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_income_invoice ON income(invoice_id) WHERE invoice_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM tds_records WHERE invoice_id IS NOT NULL GROUP BY invoice_id HAVING count(*) > 1) THEN
    RAISE NOTICE 'Duplicate TDS rows per invoice exist — uniq_tds_invoice not created';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_tds_invoice ON tds_records(invoice_id) WHERE invoice_id IS NOT NULL;
  END IF;
END $$;

-- ─── mark_invoice_paid ──────────────────────────────────────────────────────
-- Raises 'NOT_FOUND' or 'ALREADY_PAID'. Returns the updated invoice id.
CREATE OR REPLACE FUNCTION mark_invoice_paid(
  p_user_id         uuid,
  p_invoice_id      uuid,
  p_payment_date    date,
  p_amount_received numeric,
  p_tds_amount      numeric,
  p_tds_section     text,
  p_financial_year  text,
  p_quarter         text
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  inv invoices%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF inv.status IN ('paid', 'cancelled') THEN RAISE EXCEPTION 'ALREADY_PAID'; END IF;
  IF p_tds_amount > inv.base_amount THEN RAISE EXCEPTION 'TDS_TOO_HIGH'; END IF;

  UPDATE invoices
     SET status = 'paid', paid_at = now(), amount_received = p_amount_received, updated_at = now()
   WHERE id = inv.id;

  -- Income is the taxable value only. GST collected is owed to the government, not earnings.
  INSERT INTO income (user_id, deal_id, invoice_id, source, amount, currency, description, income_date, financial_year, quarter)
  VALUES (p_user_id, inv.deal_id, inv.id, 'brand_deal', inv.base_amount, 'INR',
          'Invoice ' || inv.invoice_number || ' — ' || inv.brand_name,
          p_payment_date, p_financial_year, p_quarter);

  IF p_tds_amount > 0 THEN
    INSERT INTO tds_records (user_id, invoice_id, deal_id, brand_name, invoice_amount, tds_rate, tds_amount,
                             received_amount, financial_year, payment_date, section, quarter)
    VALUES (p_user_id, inv.id, inv.deal_id, inv.brand_name, inv.base_amount,
            CASE WHEN inv.base_amount > 0 THEN round(p_tds_amount / inv.base_amount * 100, 2) ELSE 0 END,
            p_tds_amount, p_amount_received, p_financial_year, p_payment_date, p_tds_section, p_quarter);
  END IF;

  IF inv.deal_id IS NOT NULL THEN
    UPDATE deals SET status = 'paid', updated_at = now() WHERE id = inv.deal_id AND user_id = p_user_id;
  END IF;

  RETURN inv.id;
END;
$$;

-- ─── mark_deal_paid (deals with no invoice) ─────────────────────────────────
CREATE OR REPLACE FUNCTION mark_deal_paid(
  p_user_id         uuid,
  p_deal_id         uuid,
  p_payment_date    date,
  p_amount_received numeric,
  p_tds_amount      numeric,
  p_tds_section     text,
  p_financial_year  text,
  p_quarter         text
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  d deals%ROWTYPE;
BEGIN
  SELECT * INTO d FROM deals WHERE id = p_deal_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF d.status = 'paid' THEN RAISE EXCEPTION 'ALREADY_PAID'; END IF;
  IF p_tds_amount > d.deal_value THEN RAISE EXCEPTION 'TDS_TOO_HIGH'; END IF;

  UPDATE deals SET status = 'paid', updated_at = now() WHERE id = d.id;

  INSERT INTO income (user_id, deal_id, source, amount, currency, description, income_date, financial_year, quarter)
  VALUES (p_user_id, d.id, 'brand_deal', d.deal_value, 'INR', 'Brand deal payment — ' || d.brand_name,
          p_payment_date, p_financial_year, p_quarter);

  IF p_tds_amount > 0 THEN
    INSERT INTO tds_records (user_id, deal_id, brand_name, invoice_amount, tds_rate, tds_amount,
                             received_amount, financial_year, payment_date, section, quarter)
    VALUES (p_user_id, d.id, d.brand_name, d.deal_value,
            CASE WHEN d.deal_value > 0 THEN round(p_tds_amount / d.deal_value * 100, 2) ELSE 0 END,
            p_tds_amount, p_amount_received, p_financial_year, p_payment_date, p_tds_section, p_quarter);
  END IF;

  RETURN d.id;
END;
$$;

-- Only the backend (service role) may call these.
REVOKE ALL ON FUNCTION mark_invoice_paid(uuid, uuid, date, numeric, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION mark_deal_paid(uuid, uuid, date, numeric, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
