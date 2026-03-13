-- Post-session debrief: 2–3 reflective inputs after "Mark complete".
-- Used to detect friction and recalibrate next session.

CREATE TABLE IF NOT EXISTS session_debriefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name text NOT NULL,
  week integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  how_felt integer CHECK (how_felt >= 1 AND how_felt <= 5),
  niggles text,
  ready_next integer CHECK (ready_next >= 1 AND ready_next <= 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_debriefs_profile_created
  ON session_debriefs(profile_id, created_at DESC);

COMMENT ON TABLE session_debriefs IS 'Post-session reflective inputs; friction signals for recalibration';
COMMENT ON COLUMN session_debriefs.how_felt IS '1–5 how did that feel';
COMMENT ON COLUMN session_debriefs.niggles IS 'Any niggles or pain noted';
COMMENT ON COLUMN session_debriefs.ready_next IS '1–5 ready for next session';

ALTER TABLE session_debriefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session_debriefs"
  ON session_debriefs FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own session_debriefs"
  ON session_debriefs FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
