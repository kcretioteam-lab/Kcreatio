-- 020: a payment is counted once, whether it was recorded on the deal or on its invoice.
-- Before this, marking a deal paid (while it had no invoice) logged income + TDS on the deal, and
-- marking its invoice paid later logged them again — TDS showed ₹20,000 for one ₹10,000 deduction.
--  • mark_deal_paid refuses a deal that has an open invoice (the invoice is the record to pay).
--  • record_invoice_payment adopts income/TDS already logged on the invoice's deal instead of adding more.
-- Also: premium_requests.reminded_at for the pending-request reminder to the admin.

ALTER TABLE premium_requests ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

-- record_invoice_payment: a full or part payment, in one transaction.
-- Income and TDS are split in proportion to how much of the invoice total this payment settles.
-- If the deal behind the invoice was already paid directly, its income/TDS rows are linked to the
-- invoice and the invoice is closed — nothing new is counted.
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

  -- The deal was already paid on its own: link what it logged and close the invoice
  IF inv.deal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM income WHERE user_id = p_user_id AND deal_id = inv.deal_id AND invoice_id IS NULL
  ) THEN
    INSERT INTO invoice_payments (user_id, invoice_id, payment_date, amount_received, tds_deducted)
    VALUES (p_user_id, inv.id, p_payment_date, p_amount_received, p_tds_amount)
    RETURNING id INTO pay_id;
    UPDATE income      SET invoice_id = inv.id WHERE user_id = p_user_id AND deal_id = inv.deal_id AND invoice_id IS NULL;
    UPDATE tds_records SET invoice_id = inv.id WHERE user_id = p_user_id AND deal_id = inv.deal_id AND invoice_id IS NULL;
    UPDATE invoices SET status = 'paid', paid_at = now(), amount_received = COALESCE(inv.amount_received, 0) + p_amount_received, updated_at = now() WHERE id = inv.id;
    RETURN pay_id;
  END IF;

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

-- mark_deal_paid: for deals with no invoice. A deal with an open invoice is paid through the invoice.
-- Barter deals: income at market value; the brand deducts TDS on gifted products over ₹20,000.
-- Raises NOT_FOUND, ALREADY_PAID, HAS_INVOICE, TDS_TOO_HIGH.
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
  IF EXISTS (SELECT 1 FROM invoices WHERE user_id = p_user_id AND deal_id = d.id AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'HAS_INVOICE';
  END IF;
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
REVOKE ALL ON FUNCTION mark_deal_paid(uuid, uuid, date, numeric, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
