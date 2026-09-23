-- Add purchase_order_number to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS purchase_order_number TEXT;
