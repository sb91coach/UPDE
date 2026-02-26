/**
 * Benchmark engine: get/set 1RM, round to nearest 2.5kg for prescription.
 */

import type { PerformanceBenchmarks, ExerciseBenchmarkKey, ExerciseBenchmark } from "@/lib/profile/benchmarkSchema";

export function getBenchmarks(profile: { performance_benchmarks?: PerformanceBenchmarks | null }): PerformanceBenchmarks {
  return profile.performance_benchmarks ?? {};
}

export function getExerciseBenchmark(
  benchmarks: PerformanceBenchmarks,
  key: string
): { oneRM: number | null; estimatedOneRM: number | null; lastUpdated: string | null } {
  const exercise = benchmarks.exerciseBenchmarks?.[key as ExerciseBenchmarkKey];
  return {
    oneRM: exercise?.oneRM ?? null,
    estimatedOneRM: exercise?.estimatedOneRM ?? null,
    lastUpdated: exercise?.lastUpdated ?? null,
  };
}

/** Get best available 1RM (confirmed oneRM, else estimatedOneRM) */
export function getEffectiveOneRM(
  benchmarks: PerformanceBenchmarks,
  exerciseKey: string
): { value: number; isEstimated: boolean } | null {
  const b = getExerciseBenchmark(benchmarks, exerciseKey);
  if (b.oneRM != null && b.oneRM > 0) return { value: b.oneRM, isEstimated: false };
  if (b.estimatedOneRM != null && b.estimatedOneRM > 0) return { value: b.estimatedOneRM, isEstimated: true };
  return null;
}

/** Round to nearest 2.5 kg for bar loading */
export function roundToNearest2_5(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

/** Working weight from 1RM and percentage (0–1). Returns kg rounded to 2.5. */
export function workingWeightFrom1RM(oneRM: number, percentage: number): number {
  const raw = oneRM * percentage;
  return Math.max(2.5, roundToNearest2_5(raw));
}
