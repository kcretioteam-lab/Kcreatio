-- Migration 014: per-invoice accent color override
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_accent_color TEXT;
