-- Decision transparency log: why programme changed.
-- Used by engine to log trigger, threshold, adjustment for "Why this changed" UI.

CREATE TABLE IF NOT EXISTS decision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  decision_type text NOT NULL,
  trigger_variables jsonb DEFAULT '{}',
  threshold_breached text,
  adjustment_made text NOT NULL,
  explanation text
);

CREATE INDEX IF NOT EXISTS idx_decision_logs_profile_created
  ON decision_logs(profile_id, created_at DESC);

COMMENT ON TABLE decision_logs IS 'Transparency log for programme adjustments: trigger, threshold, adjustment';
COMMENT ON COLUMN decision_logs.trigger_variables IS 'e.g. { "sleep_trend_pct": -18, "rpe_density": "high" }';
COMMENT ON COLUMN decision_logs.threshold_breached IS 'e.g. sleep_trend_below_0.85';
COMMENT ON COLUMN decision_logs.adjustment_made IS 'e.g. Lower-body volume reduced';
COMMENT ON COLUMN decision_logs.explanation IS 'Coach-voice sentence for UI';

-- RLS: users can only read/insert their own rows
ALTER TABLE decision_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own decision_logs"
  ON decision_logs FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own decision_logs"
  ON decision_logs FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
