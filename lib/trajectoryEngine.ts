/**
 * Tactical Human Performance — Short-term readiness trajectory prediction.
 * Predicts who is declining, improving, or approaching readiness failure.
 */

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

export type TrajectoryInput = {
  id: string;
  readinessHistory: number[];
  exposureScore: number;
  recoveryScore: number;
  structuralScore: number;
  capacityBuffer: number;
};

export type TrajectoryTrend = "declining" | "improving" | "stable";
export type ForecastStatus = "READY" | "MANAGE" | "HIGH RISK";

export type TrajectoryResult = {
  id: string;
  trend: TrajectoryTrend;
  projectedReadiness: number;
  forecastStatus: ForecastStatus;
};

/**
 * STEP 1 — Compute trend from last 3 entries (newest last in array).
 * Declining = each of last 3 lower than previous; improving = each higher; else stable.
 */
function getTrend(readinessHistory: number[]): TrajectoryTrend {
  if (readinessHistory.length < 3) return "stable";
  const last3 = readinessHistory.slice(-3);
  const [a, b, c] = last3;
  if (a > b && b > c) return "declining";
  if (a < b && b < c) return "improving";
  return "stable";
}

/**
 * STEP 2 — Projected readiness: average(history) + modifiers, clamped 0–100.
 */
function getProjectedReadiness(input: TrajectoryInput): number {
  const history = input.readinessHistory;
  const base = history.length ? history.reduce((s, v) => s + v, 0) / history.length : input.exposureScore ? 50 : 50;
  let projected = base;
  if (input.exposureScore > 70) projected -= 5;
  if (input.recoveryScore < 50) projected -= 5;
  if (input.structuralScore < 60) projected -= 3;
  if (input.capacityBuffer < -10) projected -= 7;
  return clamp(Math.round(projected * 10) / 10, 0, 100);
}

/**
 * STEP 3 — Forecast risk from projected readiness.
 */
function getForecastStatus(projectedReadiness: number): ForecastStatus {
  if (projectedReadiness >= 75) return "READY";
  if (projectedReadiness >= 60) return "MANAGE";
  return "HIGH RISK";
}

/**
 * Compute short-term trajectory for one ID.
 */
export function computeTrajectory(input: TrajectoryInput): TrajectoryResult {
  const trend = getTrend(input.readinessHistory);
  const projectedReadiness = getProjectedReadiness(input);
  const forecastStatus = getForecastStatus(projectedReadiness);
  return {
    id: input.id,
    trend,
    projectedReadiness,
    forecastStatus,
  };
}
