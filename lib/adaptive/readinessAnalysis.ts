/**
 * Readiness Analysis Engine — analyses athlete recovery metrics.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI; provides readiness score, level, and fatigue flag.
 */

export type ReadinessLevel = "high" | "moderate" | "low";

export type ReadinessAnalysisInput = {
  /** HRV trend: percent change vs baseline (e.g. -12 = 12% drop) */
  hrvTrendPercent?: number;
  /** Resting heart rate (bpm) */
  restingHrBpm?: number;
  /** Sleep duration in hours */
  sleepDurationHours?: number;
  /** Sleep quality 0–100 */
  sleepQuality?: number;
  /** Previous day training load (arbitrary scale, e.g. 0–100) */
  previousDayLoad?: number;
  /** Subjective readiness score 0–100 */
  subjectiveReadiness?: number;
};

export type ReadinessAnalysisOutput = {
  readinessScore: number;
  readinessLevel: ReadinessLevel;
  fatigueFlag: boolean;
};

const DEFAULT_READINESS = 70;

/**
 * IF HRV drop > 12% from baseline → reduce readiness score
 * IF sleep < 5 hours → reduce readiness score
 * IF previous load high → increase fatigue risk
 */
export function analyseReadiness(input: ReadinessAnalysisInput): ReadinessAnalysisOutput {
  let score = input.subjectiveReadiness ?? DEFAULT_READINESS;

  if (input.hrvTrendPercent != null && input.hrvTrendPercent < -12) {
    score -= Math.min(25, Math.abs(input.hrvTrendPercent));
  }

  if (input.restingHrBpm != null) {
    if (input.restingHrBpm > 65) score -= 5;
    if (input.restingHrBpm > 75) score -= 10;
  }

  if (input.sleepDurationHours != null && input.sleepDurationHours < 5) {
    score -= 20;
  } else if (input.sleepDurationHours != null && input.sleepDurationHours < 6) {
    score -= 10;
  }

  if (input.sleepQuality != null && input.sleepQuality < 50) {
    score -= 15;
  } else if (input.sleepQuality != null && input.sleepQuality < 70) {
    score -= 5;
  }

  if (input.previousDayLoad != null && input.previousDayLoad >= 80) {
    score -= 10;
  }

  const readinessScore = Math.max(0, Math.min(100, Math.round(score)));

  let readinessLevel: ReadinessLevel = "moderate";
  if (readinessScore >= 75) readinessLevel = "high";
  else if (readinessScore < 55) readinessLevel = "low";

  const fatigueFlag =
    readinessScore < 60 ||
    (input.previousDayLoad != null && input.previousDayLoad >= 85) ||
    (input.sleepDurationHours != null && input.sleepDurationHours < 5) ||
    (input.hrvTrendPercent != null && input.hrvTrendPercent < -15);

  return {
    readinessScore,
    readinessLevel,
    fatigueFlag,
  };
}
