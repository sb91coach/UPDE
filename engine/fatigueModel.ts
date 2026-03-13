/**
 * Fatigue model — recovery bandwidth and fatigue score for adaptive programming.
 * Used by programme builder to reduce volume/intensity when recovery is compressed.
 * Phase 2: wire to readiness trends, sleep trend, session density.
 */

export type FatigueInputs = {
  fatigue_score?: number | null;
  readiness_score?: number | null;
  sleep_score?: number | null;
  stress_level?: number | null;
  /** Optional: trailing 7d readiness deltas for trend */
  readiness_trend?: number[] | null;
  /** Optional: sessions completed this week vs planned */
  sessions_done?: number;
  sessions_planned?: number;
};

export type RecoveryBandwidth = "adequate" | "compressed" | "critical";

/**
 * Normalised fatigue score 0–100 (higher = more fatigue).
 * Uses profile fatigue_score if present; else derived from readiness/sleep/stress.
 */
export function fatigueScore(profile: FatigueInputs): number {
  const raw = profile.fatigue_score ?? null;
  if (raw != null && raw >= 0 && raw <= 100) return raw;

  const readiness = profile.readiness_score ?? 70;
  const sleep = profile.sleep_score ?? 70;
  const stress = profile.stress_level ?? 40;
  // Inverse of recovery: low readiness/sleep + high stress → higher fatigue
  const derived = 100 - (readiness * 0.4 + sleep * 0.4 + (100 - stress) * 0.2);
  return Math.max(0, Math.min(100, Math.round(derived)));
}

/**
 * Recovery bandwidth status for narrative and programme decisions.
 * "adequate" → full programme; "compressed" → consider reduce; "critical" → reduce or rest.
 */
export function recoveryBandwidth(profile: FatigueInputs): RecoveryBandwidth {
  const f = fatigueScore(profile);
  if (f >= 70) return "critical";
  if (f >= 50) return "compressed";
  return "adequate";
}

/**
 * Human-readable label for UI (e.g. Weekly Brief).
 */
export function recoveryBandwidthLabel(profile: FatigueInputs): string {
  const b = recoveryBandwidth(profile);
  switch (b) {
    case "adequate":
      return "Adequate";
    case "compressed":
      return "Compressed";
    case "critical":
      return "Critical — prioritise recovery";
    default:
      return "Adequate";
  }
}
