/**
 * Performance Data Engine — Human Performance Intelligence System.
 * Calculates readiness, fatigue, recovery, injury risk, training load balance, and performance trend.
 * Reusable across the application. Does not modify UI or existing components.
 *
 * Weights (example structure):
 *   Readiness = Sleep Quality (30%) + HRV Trend (25%) + Resting HR (10%)
 *             + Training Load Balance (20%) + Subjective Readiness (15%)
 */

export type FatigueLevel = "low" | "moderate" | "high";

export type PerformanceTrendDirection = "positive" | "neutral" | "negative";

export type PerformanceDataInput = {
  /** Sleep quality 0–100 (e.g. from sleep_score or derived) */
  sleepQuality: number;
  /** HRV trend: percent change vs baseline, e.g. -10 = 10% drop */
  hrvTrendPercent?: number;
  /** Resting HR (bpm). Lower is better; normalized to 0–100 contribution */
  restingHrBpm?: number;
  /** Training load balance 0–100 (e.g. acute:chronic, zone compliance) */
  trainingLoadBalance: number;
  /** Subjective readiness 0–100 (e.g. checkin_readiness * 10) */
  subjectiveReadiness: number;
  /** Optional: recent fatigue score 0–100 for fatigue level */
  fatigueScore?: number;
  /** Optional: recovery score 0–100 for recovery metric */
  recoveryScoreInput?: number;
  /** Optional: injury risk factors 0–100 aggregate */
  injuryRiskInput?: number;
  /** Optional: strength/performance trend for performanceTrend */
  strengthTrendInput?: "up" | "stable" | "down";
  /** Optional: endurance trend */
  enduranceTrendInput?: "up" | "stable" | "down";
};

export type PerformanceDataOutput = {
  readinessScore: number;
  fatigueLevel: FatigueLevel;
  recoveryScore: number;
  injuryRisk: number;
  trainingLoadBalance: number;
  performanceTrend: PerformanceTrendDirection;
};

const WEIGHT_SLEEP = 0.3;
const WEIGHT_HRV = 0.25;
const WEIGHT_RHR = 0.1;
const WEIGHT_LOAD_BALANCE = 0.2;
const WEIGHT_SUBJECTIVE = 0.15;

/**
 * Normalise resting HR to a 0–100 contribution (e.g. 50 bpm = high score, 80+ = lower).
 * Assumes typical range ~45–85 bpm.
 */
function normaliseRestingHr(bpm: number): number {
  const clamped = Math.max(40, Math.min(90, bpm));
  return Math.round(100 - ((clamped - 40) / 50) * 100);
}

/**
 * Convert HRV trend percent to 0–100 (positive trend = higher score).
 * e.g. +5% => high, -15% => low.
 */
function hrvTrendToScore(percent: number): number {
  const clamped = Math.max(-30, Math.min(20, percent));
  return Math.round(70 + clamped * 1.5);
}

/**
 * Compute readiness from weighted inputs.
 */
function computeReadinessScore(input: PerformanceDataInput): number {
  const sleep = Math.max(0, Math.min(100, input.sleepQuality));
  const hrv = input.hrvTrendPercent != null
    ? Math.max(0, Math.min(100, hrvTrendToScore(input.hrvTrendPercent)))
    : 70;
  const rhr = input.restingHrBpm != null
    ? Math.max(0, Math.min(100, normaliseRestingHr(input.restingHrBpm)))
    : 70;
  const load = Math.max(0, Math.min(100, input.trainingLoadBalance));
  const subj = Math.max(0, Math.min(100, input.subjectiveReadiness));

  const raw =
    sleep * WEIGHT_SLEEP +
    hrv * WEIGHT_HRV +
    rhr * WEIGHT_RHR +
    load * WEIGHT_LOAD_BALANCE +
    subj * WEIGHT_SUBJECTIVE;

  return Math.round(Math.max(0, Math.min(100, raw)));
}

function deriveFatigueLevel(
  readinessScore: number,
  fatigueScore?: number,
  hrvTrendPercent?: number,
  sleepQuality?: number
): FatigueLevel {
  if (fatigueScore != null) {
    if (fatigueScore >= 70) return "high";
    if (fatigueScore >= 45) return "moderate";
    return "low";
  }
  if (readinessScore < 45) return "high";
  if (readinessScore < 60) return "moderate";
  if (hrvTrendPercent != null && hrvTrendPercent < -15 && (sleepQuality ?? 100) < 50) return "high";
  return "low";
}

function deriveRecoveryScore(
  input: PerformanceDataInput,
  readinessScore: number
): number {
  if (input.recoveryScoreInput != null) {
    return Math.max(0, Math.min(100, input.recoveryScoreInput));
  }
  const sleep = Math.max(0, Math.min(100, input.sleepQuality));
  const load = Math.max(0, Math.min(100, input.trainingLoadBalance));
  const subj = Math.max(0, Math.min(100, input.subjectiveReadiness));
  return Math.round(
    readinessScore * 0.4 + sleep * 0.3 + load * 0.15 + subj * 0.15
  );
}

function deriveInjuryRisk(
  input: PerformanceDataInput,
  readinessScore: number,
  fatigueLevel: FatigueLevel
): number {
  if (input.injuryRiskInput != null) {
    return Math.max(0, Math.min(100, input.injuryRiskInput));
  }
  let risk = 100 - readinessScore;
  if (fatigueLevel === "high") risk += 20;
  else if (fatigueLevel === "moderate") risk += 10;
  if (input.trainingLoadBalance < 40) risk += 10;
  return Math.round(Math.max(0, Math.min(100, risk)));
}

function derivePerformanceTrend(input: PerformanceDataInput): PerformanceTrendDirection {
  if (input.strengthTrendInput != null || input.enduranceTrendInput != null) {
    const up = [input.strengthTrendInput, input.enduranceTrendInput].filter((t) => t === "up").length;
    const down = [input.strengthTrendInput, input.enduranceTrendInput].filter((t) => t === "down").length;
    if (up > down) return "positive";
    if (down > up) return "negative";
    return "neutral";
  }
  const readiness = computeReadinessScore(input);
  if (readiness >= 70) return "positive";
  if (readiness <= 45) return "negative";
  return "neutral";
}

/**
 * Main entry: compute all performance data metrics from athlete inputs.
 */
export function calculatePerformanceData(input: PerformanceDataInput): PerformanceDataOutput {
  const readinessScore = computeReadinessScore(input);
  const fatigueLevel = deriveFatigueLevel(
    readinessScore,
    input.fatigueScore,
    input.hrvTrendPercent,
    input.sleepQuality
  );
  const recoveryScore = deriveRecoveryScore(input, readinessScore);
  const injuryRisk = deriveInjuryRisk(input, readinessScore, fatigueLevel);
  const trainingLoadBalance = Math.max(0, Math.min(100, input.trainingLoadBalance));
  const performanceTrend = derivePerformanceTrend(input);

  return {
    readinessScore,
    fatigueLevel,
    recoveryScore: Math.max(0, Math.min(100, recoveryScore)),
    injuryRisk,
    trainingLoadBalance,
    performanceTrend,
  };
}
