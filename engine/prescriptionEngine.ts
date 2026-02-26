/**
 * Prescription engine: convert percentage to weight (from 1RM) or fallback to RPE.
 * Used by programme cards for clean "3x5 @ 70% (105kg)" or "3x5 @ RPE 7" display.
 */

import type { PerformanceBenchmarks } from "@/lib/profile/benchmarkSchema";
import { EXERCISE_KEY_TO_BENCHMARK } from "@/lib/profile/benchmarkSchema";
import { getEffectiveOneRM, workingWeightFrom1RM } from "./benchmarkEngine";

function benchmarkKeyFor(exerciseKey: string): string {
  return EXERCISE_KEY_TO_BENCHMARK[exerciseKey] ?? exerciseKey;
}

export type PrescriptionResult = {
  display: string;
  isEstimated?: boolean;
};

/**
 * Prescribe one exercise line for programme card.
 * - If profile has valid 1RM (or estimated): "3x5 @ 70% (105kg)" or "(105kg estimated)"
 * - Else: "3x5 @ RPE 7"
 */
export function prescribe(
  benchmarks: PerformanceBenchmarks,
  exerciseKey: string,
  options: {
    sets: number;
    reps: string; // e.g. "5" or "3–5"
    percentage?: number; // 0–1, e.g. 0.7 for 70%
    rpeFallback: string; // e.g. "7" or "7–8"
  }
): PrescriptionResult {
  const { sets, reps, percentage = 0.7, rpeFallback } = options;
  const bmKey = benchmarkKeyFor(exerciseKey);
  const effective = getEffectiveOneRM(benchmarks, bmKey);

  if (effective && percentage > 0) {
    const kg = workingWeightFrom1RM(effective.value, percentage);
    const pct = Math.round(percentage * 100);
    const estTag = effective.isEstimated ? " (estimated)" : "";
    return {
      display: `${sets}×${reps} @ ${pct}% (${kg}kg)${estTag}`,
      isEstimated: effective.isEstimated,
    };
  }

  return {
    display: `${sets}×${reps} @ RPE ${rpeFallback}`,
  };
}
