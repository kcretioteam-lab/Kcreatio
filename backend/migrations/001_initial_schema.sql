-- Kcreatio — Initial Schema
-- Run this in Supabase SQL Editor

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text NOT NULL UNIQUE,
  password_hash       text NOT NULL,
  name                text NOT NULL,
  gstin               text,
  pan                 text,
  business_name       text,
  business_address    text,
  state_code          char(2),
  invoice_prefix      varchar(5) NOT NULL DEFAULT 'INV',
  plan                text NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'free', 'starter', 'pro', 'business')),
  subscription_id     text,
  trial_ends_at       timestamptz,
  subscription_ends_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);

-- ─── Invoices ────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number      text NOT NULL,
  brand_name          text NOT NULL,
  brand_gstin         text,
  brand_address       text NOT NULL,
  brand_state_code    char(2) NOT NULL,
  hsn_code            text NOT NULL DEFAULT '998399',
  service_description text NOT NULL,
  base_amount         numeric(12,2) NOT NULL,
  gst_rate            numeric(4,2) NOT NULL,
  gst_amount          numeric(12,2) NOT NULL,
  total_amount        numeric(12,2) NOT NULL,
  supply_type         text NOT NULL CHECK (supply_type IN ('intrastate', 'interstate')),
  cgst_amount         numeric(12,2),
  sgst_amount         numeric(12,2),
  igst_amount         numeric(12,2),
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  invoice_date        date NOT NULL,
  due_date            date,
  deal_id             uuid REFERENCES deals(id) ON DELETE SET NULL,
  notes               text,
  financial_year      text NOT NULL,
  pdf_path            text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_invoices_user_number ON invoices(user_id, invoice_number);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_user_status ON invoices(user_id, status);

-- ─── TDS Records ─────────────────────────────────────────────────────────────
CREATE TABLE tds_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id          uuid REFERENCES invoices(id) ON DELETE SET NULL,
  brand_name          text NOT NULL,
  brand_tan           text,
  invoice_amount      numeric(12,2) NOT NULL,
  tds_rate            numeric(5,2) NOT NULL DEFAULT 10,
  tds_amount          numeric(12,2) NOT NULL,
  received_amount     numeric(12,2) NOT NULL,
  form_16a_status     text NOT NULL DEFAULT 'awaiting' CHECK (form_16a_status IN ('received', 'awaiting', 'requested', 'overdue')),
  financial_year      text NOT NULL,
  payment_date        date NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tds_user_id ON tds_records(user_id);
CREATE INDEX idx_tds_user_fy ON tds_records(user_id, financial_year);

-- ─── Deals ───────────────────────────────────────────────────────────────────
CREATE TABLE deals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_name          text NOT NULL,
  brand_contact_email text,
  deal_value          numeric(12,2) NOT NULL,
  status              text NOT NULL DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'negotiating', 'active', 'delivered', 'invoiced', 'paid', 'rejected')),
  niche               text,
  deliverables        text,
  deadline            date,
  payment_due_date    date,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_deals_user_status ON deals(user_id, status);

-- ─── Income ──────────────────────────────────────────────────────────────────
CREATE TABLE income (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id             uuid REFERENCES deals(id) ON DELETE SET NULL,
  invoice_id          uuid REFERENCES invoices(id) ON DELETE SET NULL,
  source              text NOT NULL CHECK (source IN ('brand_deal', 'adsense', 'instagram_bonus', 'affiliate', 'consulting', 'other')),
  amount              numeric(12,2) NOT NULL,
  currency            char(3) NOT NULL DEFAULT 'INR',
  description         text,
  income_date         date NOT NULL,
  financial_year      text NOT NULL,
  quarter             char(2),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_income_user_id ON income(user_id);
CREATE INDEX idx_income_user_fy ON income(user_id, financial_year);

-- ─── Expenses ────────────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category            text NOT NULL CHECK (category IN ('equipment', 'software', 'travel', 'props', 'marketing', 'team', 'subscription', 'other')),
  amount              numeric(12,2) NOT NULL,
  description         text,
  expense_date        date NOT NULL,
  financial_year      text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_user_fy ON expenses(user_id, financial_year);

-- ─── Tax Payments ─────────────────────────────────────────────────────────────
CREATE TABLE tax_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                text NOT NULL CHECK (type IN ('advance_tax', 'self_assessment', 'tds')),
  quarter             char(2),
  financial_year      text NOT NULL,
  amount_due          numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid         numeric(12,2),
  due_date            date NOT NULL,
  paid_date           date,
  challan_number      text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tax_payments_user_id ON tax_payments(user_id);
CREATE INDEX idx_tax_payments_user_fy ON tax_payments(user_id, financial_year);

-- ─── Notification Preferences ─────────────────────────────────────────────────
CREATE TABLE notification_preferences (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled       boolean NOT NULL DEFAULT true,
  whatsapp_enabled    boolean NOT NULL DEFAULT false,
  whatsapp_number     text,
  advance_tax_alerts  boolean NOT NULL DEFAULT true,
  gst_filing_alerts   boolean NOT NULL DEFAULT true,
  deal_followup_alerts boolean NOT NULL DEFAULT false,
  alert_days_before   integer NOT NULL DEFAULT 14,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS as belt-and-suspenders (backend also scopes all queries by user_id)
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tds_records               ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE income                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (our backend uses service role key)
-- Add user-scoped policies for any future direct client access
CREATE POLICY "Users can only see own data" ON invoices
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can only see own data" ON tds_records
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can only see own data" ON deals
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can only see own data" ON income
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can only see own data" ON expenses
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can only see own data" ON tax_payments
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can only see own data" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());
