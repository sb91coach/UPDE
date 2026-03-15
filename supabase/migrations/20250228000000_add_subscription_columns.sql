-- Subscription and Stripe fields for paywall / upgrade flow.
-- Tier values: 'free' | 'pro' | 'elite'

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

COMMENT ON COLUMN profiles.subscription_tier IS 'free | pro | elite';
COMMENT ON COLUMN profiles.subscription_status IS 'inactive | active | past_due | canceled';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID';
