-- Add discount fields to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('flat', 'percent'));
