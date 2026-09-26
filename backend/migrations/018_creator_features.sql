-- Kcretio — Migration 018
-- Creator-specific features: barter deals, foreign income and export invoices, a fuller TDS
-- tracker, tax-useful expenses, credit notes, partial payments, reminders, recurring invoices.

-- ─── Barter / gifted products ───────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_type    text NOT NULL DEFAULT 'cash' CHECK (deal_type IN ('cash', 'barter'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS market_value numeric(12,2);   -- value of gifted products (barter)

-- ─── Foreign income ─────────────────────────────────────────────────────────
ALTER TABLE income ADD COLUMN IF NOT EXISTS foreign_amount numeric(14,2);   -- amount in `currency`
ALTER TABLE income ADD COLUMN IF NOT EXISTS fx_rate        numeric(12,6);   -- INR per unit on the day received
ALTER TABLE income ADD COLUMN IF NOT EXISTS fira_received  boolean NOT NULL DEFAULT false;
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_source_check;
ALTER TABLE income ADD CONSTRAINT income_source_check
  CHECK (source IN ('brand_deal', 'barter', 'adsense', 'instagram_bonus', 'affiliate', 'consulting', 'foreign_brand', 'other'));

-- ─── Export invoices (zero-rated under LUT) ─────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_export       boolean NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS export_currency char(3);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS lut_number      text;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_supply_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_supply_type_check CHECK (supply_type IN ('intrastate', 'interstate', 'export'));

-- ─── TDS tracker ────────────────────────────────────────────────────────────
ALTER TABLE tds_records ADD COLUMN IF NOT EXISTS form_16a_url    text;
ALTER TABLE tds_records ADD COLUMN IF NOT EXISTS in_ais          boolean;     -- null = not checked yet
ALTER TABLE tds_records ADD COLUMN IF NOT EXISTS notes           text;
UPDATE tds_records SET quarter = CASE
  WHEN EXTRACT(MONTH FROM payment_date) BETWEEN 4 AND 6  THEN 'Q1'
  WHEN EXTRACT(MONTH FROM payment_date) BETWEEN 7 AND 9  THEN 'Q2'
  WHEN EXTRACT(MONTH FROM payment_date) BETWEEN 10 AND 12 THEN 'Q3'
  ELSE 'Q4' END
WHERE quarter IS NULL;

-- ─── Expenses ───────────────────────────────────────────────────────────────
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS gst_paid         numeric(12,2) NOT NULL DEFAULT 0;   -- input tax credit
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_gstin     text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url      text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_capital_asset boolean NOT NULL DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS asset_class      text CHECK (asset_class IN ('computer', 'camera_equipment', 'furniture', 'vehicle', 'other'));

-- ─── Partial payments ───────────────────────────────────────────────────────
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'));

CREATE TABLE IF NOT EXISTS invoice_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id       uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date     date NOT NULL,
  amount_received  numeric(12,2) NOT NULL,
  tds_deducted     numeric(12,2) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- One income/TDS row per payment rather than per invoice
DROP INDEX IF EXISTS uniq_income_invoice;
DROP INDEX IF EXISTS uniq_tds_invoice;
ALTER TABLE income      ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES invoice_payments(id) ON DELETE SET NULL;
ALTER TABLE tds_records ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES invoice_payments(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_income_payment ON income(payment_id) WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tds_payment ON tds_records(payment_id) WHERE payment_id IS NOT NULL;

-- record_invoice_payment: a full or part payment, in one transaction.
-- Income and TDS are split in proportion to how much of the invoice total this payment settles.
-- Raises NOT_FOUND, ALREADY_PAID, TDS_TOO_HIGH, OVERPAID.
CREATE OR REPLACE FUNCTION record_invoice_payment(
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
  inv       invoices%ROWTYPE;
  settled   numeric;
  prior     numeric;
  share     numeric;
  pay_id    uuid;
  new_total numeric;
BEGIN
  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF inv.status IN ('paid', 'cancelled') THEN RAISE EXCEPTION 'ALREADY_PAID'; END IF;
  IF p_tds_amount > inv.base_amount THEN RAISE EXCEPTION 'TDS_TOO_HIGH'; END IF;

  SELECT COALESCE(sum(amount_received + tds_deducted), 0) INTO prior FROM invoice_payments WHERE invoice_id = inv.id;
  settled := p_amount_received + p_tds_amount;               -- what this payment clears of the total
  new_total := prior + settled;
  IF new_total > inv.total_amount + 1 THEN RAISE EXCEPTION 'OVERPAID'; END IF;
  -- A final payment within ₹1 of the total closes the invoice
  IF inv.total_amount - new_total <= 1 THEN settled := inv.total_amount - prior; END IF;
  share := CASE WHEN inv.total_amount > 0 THEN settled / inv.total_amount ELSE 1 END;

  INSERT INTO invoice_payments (user_id, invoice_id, payment_date, amount_received, tds_deducted)
  VALUES (p_user_id, inv.id, p_payment_date, p_amount_received, p_tds_amount)
  RETURNING id INTO pay_id;

  -- Income is the taxable value only (GST is owed to the government), pro-rated for part payments
  INSERT INTO income (user_id, deal_id, invoice_id, payment_id, source, amount, currency, description, income_date, financial_year, quarter)
  VALUES (p_user_id, inv.deal_id, inv.id, pay_id, 'brand_deal', round(inv.base_amount * share, 2), 'INR',
          'Invoice ' || inv.invoice_number || ' — ' || inv.brand_name || CASE WHEN share < 1 THEN ' (part payment)' ELSE '' END,
          p_payment_date, p_financial_year, p_quarter);

  IF p_tds_amount > 0 THEN
    INSERT INTO tds_records (user_id, invoice_id, deal_id, payment_id, brand_name, invoice_amount, tds_rate, tds_amount,
                             received_amount, financial_year, payment_date, section, quarter)
    VALUES (p_user_id, inv.id, inv.deal_id, pay_id, inv.brand_name, round(inv.base_amount * share, 2),
            CASE WHEN inv.base_amount * share > 0 THEN round(p_tds_amount / (inv.base_amount * share) * 100, 2) ELSE 0 END,
            p_tds_amount, p_amount_received, p_financial_year, p_payment_date, p_tds_section, p_quarter);
  END IF;

  IF inv.total_amount - new_total <= 1 THEN
    UPDATE invoices SET status = 'paid', paid_at = now(), amount_received = COALESCE(inv.amount_received, 0) + p_amount_received, updated_at = now() WHERE id = inv.id;
    IF inv.deal_id IS NOT NULL THEN
      UPDATE deals SET status = 'paid', updated_at = now() WHERE id = inv.deal_id AND user_id = p_user_id;
    END IF;
  ELSE
    UPDATE invoices SET status = 'partially_paid', amount_received = COALESCE(inv.amount_received, 0) + p_amount_received, updated_at = now() WHERE id = inv.id;
  END IF;

  RETURN pay_id;
END;
$$;
REVOKE ALL ON FUNCTION record_invoice_payment(uuid, uuid, date, numeric, numeric, text, text, text) FROM PUBLIC, anon, authenticated;

-- Barter deals: income at market value; the brand deducts TDS on gifted products over ₹20,000
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
  d     deals%ROWTYPE;
  value numeric;
BEGIN
  SELECT * INTO d FROM deals WHERE id = p_deal_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF d.status = 'paid' THEN RAISE EXCEPTION 'ALREADY_PAID'; END IF;
  value := CASE WHEN d.deal_type = 'barter' THEN COALESCE(d.market_value, d.deal_value) ELSE d.deal_value END;
  IF p_tds_amount > value THEN RAISE EXCEPTION 'TDS_TOO_HIGH'; END IF;

  UPDATE deals SET status = 'paid', updated_at = now() WHERE id = d.id;

  INSERT INTO income (user_id, deal_id, source, amount, currency, description, income_date, financial_year, quarter)
  VALUES (p_user_id, d.id, CASE WHEN d.deal_type = 'barter' THEN 'barter' ELSE 'brand_deal' END, value, 'INR',
          CASE WHEN d.deal_type = 'barter' THEN 'Gifted products (market value) — ' ELSE 'Brand deal payment — ' END || d.brand_name,
          p_payment_date, p_financial_year, p_quarter);

  IF p_tds_amount > 0 THEN
    INSERT INTO tds_records (user_id, deal_id, brand_name, invoice_amount, tds_rate, tds_amount,
                             received_amount, financial_year, payment_date, section, quarter)
    VALUES (p_user_id, d.id, d.brand_name, value,
            CASE WHEN value > 0 THEN round(p_tds_amount / value * 100, 2) ELSE 0 END,
            p_tds_amount, p_amount_received, p_financial_year, p_payment_date, p_tds_section, p_quarter);
  END IF;

  RETURN d.id;
END;
$$;

-- ─── Credit notes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_notes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id        uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  credit_note_number text NOT NULL,
  note_date         date NOT NULL,
  reason            text NOT NULL,
  base_amount       numeric(12,2) NOT NULL,
  gst_amount        numeric(12,2) NOT NULL,
  cgst_amount       numeric(12,2),
  sgst_amount       numeric(12,2),
  igst_amount       numeric(12,2),
  total_amount      numeric(12,2) NOT NULL,
  financial_year    text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_notes_user_number ON credit_notes(user_id, credit_note_number);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

-- ─── Payment reminders and recurring invoices ───────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_at  timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_count    int NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring         text CHECK (recurring IN ('monthly', 'quarterly'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS next_recurring_on date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_parent_id uuid REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE invoice_audit_log DROP CONSTRAINT IF EXISTS invoice_audit_log_action_check;
ALTER TABLE invoice_audit_log ADD CONSTRAINT invoice_audit_log_action_check
  CHECK (action IN ('created', 'updated', 'sent', 'paid', 'part_paid', 'deleted', 'brand_confirmed', 'credit_note', 'reminder_sent', 'recurring_created'));
