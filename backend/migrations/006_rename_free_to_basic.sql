-- Migration 006: Rename plan 'free' to 'basic'
-- Run this AFTER deploying backend code changes that replace 'free' with 'basic'

-- Step 1: Update existing data
UPDATE users SET plan = 'basic' WHERE plan = 'free';

-- Step 2: Drop and recreate the CHECK constraint with 'basic' instead of 'free'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('trial', 'basic', 'starter', 'pro', 'business'));

-- Verify
-- SELECT DISTINCT plan FROM users;
