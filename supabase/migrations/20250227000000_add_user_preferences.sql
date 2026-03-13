-- User preferences, marketing, and integration flags (settings page).
-- Structure: see app/api/settings/route.ts and SettingsView defaults.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_preferences jsonb DEFAULT '{}';

COMMENT ON COLUMN profiles.user_preferences IS 'weight_unit, session_reminders, weekly_summary_email, marketing_emails, product_updates, sms_notifications, garmin_connected, stripe_customer_id, etc.';
