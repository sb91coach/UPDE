-- Persistent injury memory for coaching-grade guardrails and follow-up.
-- Engine: injuryMemoryEngine.ts

CREATE TABLE IF NOT EXISTS user_injury_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body_part text NOT NULL,
  severity smallint NOT NULL CHECK (severity >= 1 AND severity <= 10),
  context text,
  first_reported timestamptz NOT NULL DEFAULT now(),
  last_reported timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  classification text,
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'moderate', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_injury_log_profile_resolved
  ON user_injury_log(profile_id, resolved) WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_user_injury_log_profile_last_reported
  ON user_injury_log(profile_id, last_reported DESC);

COMMENT ON TABLE user_injury_log IS 'Persistent injury memory: body_part, severity, context, risk_level; updates last_reported on re-report, resolved_at when resolved';
COMMENT ON COLUMN user_injury_log.classification IS 'e.g. tendon irritation, instability, overload';
COMMENT ON COLUMN user_injury_log.risk_level IS 'Derived from severity and frequency (engine: calculateInjuryRisk)';

ALTER TABLE user_injury_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own injury log"
  ON user_injury_log FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own injury log"
  ON user_injury_log FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own injury log"
  ON user_injury_log FOR UPDATE
  USING (auth.uid() = profile_id);
