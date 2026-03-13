/**
 * Risk index — fatigue risk and adaptation risk for programme adjustments.
 * Models: sleep trend, RPE inflation, eccentric density, weekly load clustering, mobility suppression.
 * Phase 2: programme builder uses these to reduce load or shift structure.
 * Phase 3: forecasting (e.g. next 7 days risk).
 */

import type { FatigueInputs } from "./fatigueModel";
import { fatigueScore, recoveryBandwidth } from "./fatigueModel";

export type RiskLevel = "low" | "moderate" | "high";
export type RecoveryTrend = "rising" | "stable" | "decreasing";

export type RiskSignals = {
  fatigueRisk: number; // 0–1, higher = more risk
  adaptationRisk: number; // 0–1, capacity to adapt vs overload
  shouldReduceVolume: boolean;
  shouldReduceIntensity: boolean;
  /** Spec: overload risk (training load vs recovery) */
  overloadRisk: RiskLevel;
  /** Spec: neural / CNS strain */
  neuralStrain: RiskLevel;
  /** Spec: recovery bandwidth trend */
  recoveryCompression: RecoveryTrend;
};

/**
 * Compute fatigue risk (0–1) from fatigue score and recovery bandwidth.
 */
export function fatigueRisk(profile: FatigueInputs): number {
  const f = fatigueScore(profile);
  const band = recoveryBandwidth(profile);
  if (band === "critical") return 0.9;
  if (band === "compressed") return 0.6 + (f - 50) / 100;
  return Math.min(1, f / 80);
}

/**
 * Adaptation risk: likelihood that current load will exceed recovery.
 * Uses fatigue + optional session density / compliance (Phase 2).
 */
export function adaptationRisk(profile: FatigueInputs): number {
  const fr = fatigueRisk(profile);
  return fr * 0.9; // Can add compliance/session-density factor later
}

function toLevel(v: number): RiskLevel {
  if (v >= 0.7) return "high";
  if (v >= 0.4) return "moderate";
  return "low";
}

/**
 * Recovery compression trend from optional readiness_trend (last 7d).
 * "decreasing" = recovery bandwidth shrinking; "rising" = improving; "stable" = no clear trend.
 */
function recoveryCompressionTrend(profile: FatigueInputs): RecoveryTrend {
  const trend = profile.readiness_trend ?? [];
  if (trend.length < 4) return "stable";
  const recent = trend.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const older = trend.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, trend.length - 3);
  const delta = recent - older;
  if (delta <= -5) return "decreasing";
  if (delta >= 5) return "rising";
  return "stable";
}

/**
 * Single call for all risk signals used by programme builder.
 * Surfaces overloadRisk, neuralStrain, recoveryCompression for dashboard/brief.
 */
export function getRiskSignals(profile: FatigueInputs): RiskSignals {
  const fr = fatigueRisk(profile);
  const ar = adaptationRisk(profile);
  const band = recoveryBandwidth(profile);
  return {
    fatigueRisk: fr,
    adaptationRisk: ar,
    shouldReduceVolume: fr >= 0.6,
    shouldReduceIntensity: fr >= 0.75,
    overloadRisk: toLevel(fr),
    neuralStrain: band === "critical" ? "high" : band === "compressed" ? "moderate" : "low",
    recoveryCompression: recoveryCompressionTrend(profile),
  };
}
