/**
 * Momentum engine — adaptation velocity and friction index.
 * Phase 2: compute from session_logs + check-ins; persist or derive on demand.
 * Feeds identity classifier and programme bias.
 */

export type MomentumInputs = {
  momentum?: string | null; // e.g. "rising" | "stable" | "declining"
  /** Sessions completed vs planned last 2–4 weeks (optional) */
  compliance_weeks?: { done: number; planned: number }[] | null;
  /** Optional: readiness trend (e.g. last 7 days) */
  readiness_trend?: number[] | null;
};

/**
 * Adaptation velocity: rate of performance/readiness change.
 * Phase 2: from snapshots or readiness_trend; Phase 3: from benchmark deltas.
 */
export function adaptationVelocity(profile: MomentumInputs): "rising" | "stable" | "declining" {
  const m = (profile.momentum ?? "").toLowerCase();
  if (m === "rising" || m === "declining" || m === "stable") return m as "rising" | "stable" | "declining";

  const trend = profile.readiness_trend ?? [];
  if (trend.length < 3) return "stable";
  const recent = trend.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const older = trend.slice(0, -3).length ? trend.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, trend.length - 3) : recent;
  const delta = recent - older;
  if (delta > 3) return "rising";
  if (delta < -3) return "declining";
  return "stable";
}

/**
 * Friction index 0–1: compliance + behavioural drift (higher = more friction).
 * Phase 2: from compliance_weeks (missed sessions, drop-off).
 */
export function frictionIndex(profile: MomentumInputs): number {
  const weeks = profile.compliance_weeks ?? [];
  if (weeks.length === 0) return 0;
  const totalDone = weeks.reduce((s, w) => s + w.done, 0);
  const totalPlanned = weeks.reduce((s, w) => s + w.planned, 0);
  if (totalPlanned === 0) return 0;
  const compliance = totalDone / totalPlanned;
  return Math.max(0, 1 - compliance);
}
