-- Daily check-in columns for programme adaptation.
-- Run this in Supabase SQL editor if your profiles table doesn't have these yet.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS checkin_date text,
  ADD COLUMN IF NOT EXISTS checkin_readiness smallint,
  ADD COLUMN IF NOT EXISTS checkin_feel text,
  ADD COLUMN IF NOT EXISTS checkin_pain text,
  ADD COLUMN IF NOT EXISTS checkin_pain_areas text,
  ADD COLUMN IF NOT EXISTS checkin_energy text,
  ADD COLUMN IF NOT EXISTS checkin_sleep text;
