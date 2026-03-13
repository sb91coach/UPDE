/**
 * Benchmark engine: get/set 1RM, round to nearest 2.5kg for prescription.
 * Supports manual updates, timestamp, and future auto-estimation (estimateOneRM).
 */

import type { PerformanceBenchmarks, ExerciseBenchmarkKey, ExerciseBenchmark } from "@/lib/profile/benchmarkSchema";

export function getBenchmarks(profile: { performance_benchmarks?: PerformanceBenchmarks | null }): PerformanceBenchmarks {
  return profile.performance_benchmarks ?? {};
}

/** Alias for getExerciseBenchmark (spec: getBenchmark). */
export function getBenchmark(
  benchmarks: PerformanceBenchmarks,
  key: string
): { oneRM: number | null; estimatedOneRM: number | null; lastUpdated: string | null } {
  return getExerciseBenchmark(benchmarks, key);
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

const nowIso = () => new Date().toISOString().slice(0, 10);

/**
 * Estimate 1RM from weight and reps (Epley formula).
 * Use for "estimated" 1RM when user enters e.g. 100kg x 5.
 */
export function estimateOneRM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Validate a single benchmark value (strength 1RM, aerobic, or power).
 * Returns null if valid, or an error message.
 */
export function validateBenchmark(
  kind: "strength" | "aerobic" | "power",
  key: string,
  value: number | null
): string | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return "Invalid number";
  if (kind === "strength") {
    if (value < 0 || value > 500) return "1RM should be between 0 and 500 kg";
  }
  if (kind === "aerobic") {
    if (key === "MAS" && (value < 0 || value > 15)) return "MAS typically 0–15 m/s";
    if (key === "vo2max" && (value < 0 || value > 100)) return "VO₂max typically 0–100";
  }
  if (kind === "power") {
    if ((key === "CMJ" || key === "sprint_10m") && value < 0) return "Value must be positive";
  }
  return null;
}

/**
 * Update one exercise benchmark and set last_updated.
 * Returns the new PerformanceBenchmarks object (does not persist to DB).
 */
export function updateBenchmark(
  current: PerformanceBenchmarks,
  exerciseKey: string,
  update: { oneRM?: number | null; estimatedOneRM?: number | null }
): PerformanceBenchmarks {
  const existing = current.exerciseBenchmarks ?? {};
  const exercise = existing[exerciseKey] ?? { oneRM: null, estimatedOneRM: null, lastUpdated: null };
  const nextExercise: ExerciseBenchmark = {
    oneRM: update.oneRM !== undefined ? update.oneRM : exercise.oneRM,
    estimatedOneRM: update.estimatedOneRM !== undefined ? update.estimatedOneRM : exercise.estimatedOneRM,
    lastUpdated: nowIso(),
  };
  return {
    ...current,
    last_updated: nowIso(),
    exerciseBenchmarks: { ...existing, [exerciseKey]: nextExercise },
  };
}
