"use client";

/**
 * Benchmark Manager — view/edit 1RM and other benchmarks for percentage prescription.
 * Phase 1: structure in place; wire to profile.performance_benchmarks and API.
 */

import type { PerformanceBenchmarks, ExerciseBenchmarkKey } from "@/lib/profile/benchmarkSchema";
import { EXERCISE_BENCHMARK_KEYS, EXERCISE_DISPLAY_NAMES } from "@/lib/profile/benchmarkSchema";

export type BenchmarkManagerProps = {
  benchmarks: PerformanceBenchmarks;
  onUpdate?: (key: ExerciseBenchmarkKey, oneRM: number | null, estimatedOneRM: number | null) => void;
  className?: string;
};

export default function BenchmarkManager({
  benchmarks,
  onUpdate,
  className = "",
}: BenchmarkManagerProps) {
  const exercise = benchmarks.exerciseBenchmarks ?? {};

  return (
    <div className={`benchmarkManager ${className}`}>
      <div className="benchmarkManagerTitle">Strength benchmarks (kg)</div>
      <p className="benchmarkManagerHint">
        Add 1RM to get weight-based prescriptions (e.g. 3×5 @ 70% → 105kg). Otherwise we use RPE.
      </p>
      <div className="benchmarkManagerGrid">
        {EXERCISE_BENCHMARK_KEYS.map((key) => {
          const b = exercise[key];
          const displayName = EXERCISE_DISPLAY_NAMES[key] ?? key;
          const value = b?.oneRM ?? b?.estimatedOneRM ?? null;
          return (
            <div key={key} className="benchmarkManagerRow">
              <label className="benchmarkManagerLabel">{displayName}</label>
              <span className="benchmarkManagerValue">
                {value != null ? `${value} kg` : "—"}
                {b?.estimatedOneRM != null && b?.oneRM == null ? " (est.)" : ""}
              </span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .benchmarkManager {
          background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px 24px;
        }
        .benchmarkManagerTitle {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .benchmarkManagerHint {
          font-size: 12px;
          opacity: 0.65;
          margin: 0 0 16px;
          line-height: 1.4;
        }
        .benchmarkManagerGrid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .benchmarkManagerRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .benchmarkManagerLabel { opacity: 0.85; }
        .benchmarkManagerValue { opacity: 0.9; font-weight: 500; }
      `}</style>
    </div>
  );
}
