-- Store last completed session focus for body report (e.g. "Lower body", "Upper body").
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_session_focus text;

COMMENT ON COLUMN profiles.last_session_focus IS 'Focus of most recently completed session for body report stress map';
