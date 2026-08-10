-- Migration 005: Add phone, invoice contact fields, and avatar to users table
-- Run in Supabase SQL Editor after migrations 001-004

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone                  text,
  ADD COLUMN IF NOT EXISTS show_phone_on_invoice  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invoice_phone          text,
  ADD COLUMN IF NOT EXISTS invoice_email          text,
  ADD COLUMN IF NOT EXISTS avatar_url             text;
