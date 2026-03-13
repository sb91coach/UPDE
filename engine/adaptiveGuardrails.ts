/**
 * Adaptive guardrails: run AFTER prescriptionEngine and BEFORE ProgrammeCard rendering.
 * If injury active: hard cap intensity (e.g. 75%), remove explosive work, limit weekly volume.
 * If overload risk high: shift to submax bias, increase recovery exposure, add flush session.
 */

import type { InjuryEntry } from "./injuryMemoryEngine";
import { getActiveInjuries } from "./injuryMemoryEngine";
import type { RiskSignals } from "./riskIndex";
import { getRiskSignals } from "./riskIndex";
import type { FatigueInputs } from "./fatigueModel";

export type GuardrailOutput = {
  /** Cap prescribed intensity (0–1). e.g. 0.75 = 75% max. */
  maxIntensity: number;
  /** Remove explosive/plyometric work. */
  removeExplosive: boolean;
  /** Max sessions this week (optional; null = no cap). */
  maxWeeklySessions: number | null;
  /** Bias toward submax work. */
  submaxBias: boolean;
  /** Add a flush/recovery session. */
  addFlushSession: boolean;
  /** Human-readable reason for decision log. */
  reasons: string[];
};

const DEFAULT: GuardrailOutput = {
  maxIntensity: 1,
  removeExplosive: false,
  maxWeeklySessions: null,
  submaxBias: false,
  addFlushSession: false,
  reasons: [],
};

export type GuardrailInputs = FatigueInputs & {
  activeInjuries?: InjuryEntry[];
  /** Planned sessions this week (optional). */
  plannedSessions?: number;
};

/**
 * Compute guardrails from profile, risk, and active injuries.
 * Programme builder applies maxIntensity to prescribe(), removes explosive when removeExplosive, etc.
 */
export function getAdaptiveGuardrails(inputs: GuardrailInputs): GuardrailOutput {
  const risk: RiskSignals = getRiskSignals(inputs);
  const active = getActiveInjuries(inputs.activeInjuries ?? []);
  const reasons: string[] = [];

  let maxIntensity = 1;
  let removeExplosive = false;
  let maxWeeklySessions: number | null = null;
  let submaxBias = false;
  let addFlushSession = false;

  if (active.length > 0) {
    maxIntensity = 0.75;
    removeExplosive = true;
    maxWeeklySessions = 4;
    reasons.push(`Active injury: intensity capped at 75%, explosive work removed, weekly volume limited.`);
  }

  if (risk.overloadRisk === "high" || risk.shouldReduceIntensity) {
    if (maxIntensity > 0.8) maxIntensity = 0.8;
    submaxBias = true;
    addFlushSession = true;
    reasons.push("Overload risk high: submax bias and flush session added.");
  } else if (risk.overloadRisk === "moderate" || risk.shouldReduceVolume) {
    submaxBias = true;
    reasons.push("Moderate overload risk: submax bias applied.");
  }

  return {
    maxIntensity,
    removeExplosive,
    maxWeeklySessions,
    submaxBias,
    addFlushSession,
    reasons: reasons.length ? reasons : [],
  };
}

/**
 * Apply guardrail cap to a prescribed percentage (for use when calling prescribe()).
 */
export function applyIntensityCap(percentage: number, guardrails: GuardrailOutput): number {
  if (percentage <= 0) return percentage;
  return Math.min(percentage, guardrails.maxIntensity);
}
