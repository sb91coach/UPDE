/**
 * Capacity engine: score (0–100), tier classification, confidence for six domains.
 * Used by Performance Pathfinder Coaching System.
 */

import {
  type CapacityDomain,
  type CapacityTier,
  type CapacityScore,
  type CapacityProfile,
  type ConfidenceLevel,
  TIER_BANDS,
  CAPACITY_DOMAINS,
  CAPACITY_DOMAIN_LABELS,
} from "@/types/capacity";

/** Map score 0–100 to tier. */
export function tierFromScore(score: number): CapacityTier {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band = TIER_BANDS.find((b) => clamped >= b.min && clamped <= b.max);
  return band?.tier ?? "Low";
}

/** Derive confidence from data availability (e.g. number of data points). */
export function confidenceFromDataPoints(points: number): ConfidenceLevel {
  if (points >= 5) return "high";
  if (points >= 2) return "medium";
  return "low";
}

/** Build a single capacity score. */
export function buildCapacityScore(
  domain: CapacityDomain,
  score: number,
  dataPoints: number = 3
): CapacityScore {
  return {
    domain,
    score: Math.max(0, Math.min(100, Math.round(score))),
    tier: tierFromScore(score),
    confidence: confidenceFromDataPoints(dataPoints),
  };
}

/**
 * Build a full capacity profile from profile/benchmark data.
 * Maps existing strength/aerobic/readiness-style metrics into the six domains.
 */
export function buildCapacityProfile(input: {
  strength_upper?: number | null;
  strength_lower?: number | null;
  aerobic_score?: number | null;
  mobility_score?: number | null;
  durability_score?: number | null;
  recovery_score?: number | null;
  sleep_score?: number | null;
  stress_level?: number | null;
  lastUpdated?: string | null;
}): CapacityProfile {
  const now = input.lastUpdated ?? new Date().toISOString().slice(0, 10);
  const sUpper = input.strength_upper ?? 50;
  const sLower = input.strength_lower ?? 50;
  const aero = input.aerobic_score ?? 50;
  const mob = input.mobility_score ?? 50;
  const dur = input.durability_score ?? 50;
  const rec = input.recovery_score ?? (input.sleep_score != null ? input.sleep_score : 50);
  const stress = input.stress_level ?? 50;

  const forceProduction = (sUpper + sLower) / 2;
  const forceExpression = Math.min(100, forceProduction * 1.1);
  const energyEfficiency = aero;
  const movementIntegrity = mob;
  const durability = dur;
  const recoveryCapacity = Math.max(0, 100 - stress) * 0.5 + rec * 0.5;

  const scores: Record<CapacityDomain, CapacityScore> = {
    force_production: buildCapacityScore("force_production", forceProduction),
    force_expression: buildCapacityScore("force_expression", forceExpression),
    energy_system_efficiency: buildCapacityScore("energy_system_efficiency", energyEfficiency),
    movement_integrity: buildCapacityScore("movement_integrity", movementIntegrity),
    durability: buildCapacityScore("durability", durability),
    recovery_capacity: buildCapacityScore("recovery_capacity", recoveryCapacity),
  };

  return {
    scores,
    lastUpdated: now,
  };
}

export { CAPACITY_DOMAINS, CAPACITY_DOMAIN_LABELS, TIER_BANDS };
