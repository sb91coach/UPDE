/**
 * Athlete State Model — physiological state and training recommendation.
 * Determines: Recovered | Ready | Fatigued | Overreached | Injury Risk.
 * Does not modify UI or existing components.
 */

export type AthleteState =
  | "recovered"
  | "ready"
  | "fatigued"
  | "overreached"
  | "injuryRisk";

export type TrainingRecommendation =
  | "full training"
  | "reduce intensity"
  | "recovery session";

export type AthleteStateInput = {
  readinessScore: number;
  /** HRV trend: percent change vs baseline (e.g. -10 = 10% drop) */
  hrvTrendPercent?: number;
  /** Sleep duration in hours (e.g. 5, 7) */
  sleepHours?: number;
  /** Injury risk 0–100 from performance data engine */
  injuryRisk?: number;
  /** Fatigue level from performance data engine */
  fatigueLevel?: "low" | "moderate" | "high";
};

export type AthleteStateOutput = {
  state: AthleteState;
  trainingRecommendation: TrainingRecommendation;
};

/**
 * IF readinessScore < 40 → state = "Overreached"
 * IF readinessScore < 55 AND HRV drop > 10% AND sleep < 5h → state = "Fatigued"
 * IF injury risk elevated → state = "Injury Risk"
 * IF recovered/ready → state = "Recovered" or "Ready"
 */
export function calculateAthleteState(input: AthleteStateInput): AthleteStateOutput {
  const {
    readinessScore,
    hrvTrendPercent = 0,
    sleepHours,
    injuryRisk = 0,
    fatigueLevel,
  } = input;

  let state: AthleteState = "ready";
  let trainingRecommendation: TrainingRecommendation = "full training";

  if (readinessScore < 40) {
    state = "overreached";
    trainingRecommendation = "recovery session";
    return { state, trainingRecommendation };
  }

  if (injuryRisk >= 65) {
    state = "injuryRisk";
    trainingRecommendation = "reduce intensity";
    return { state, trainingRecommendation };
  }

  if (
    readinessScore < 55 &&
    hrvTrendPercent < -10 &&
    sleepHours != null &&
    sleepHours < 5
  ) {
    state = "fatigued";
    trainingRecommendation = "reduce intensity";
    return { state, trainingRecommendation };
  }

  if (fatigueLevel === "high" || readinessScore < 55) {
    state = "fatigued";
    trainingRecommendation = "reduce intensity";
    return { state, trainingRecommendation };
  }

  if (fatigueLevel === "moderate" || (readinessScore >= 55 && readinessScore < 70)) {
    state = "ready";
    trainingRecommendation = "full training";
    return { state, trainingRecommendation };
  }

  if (readinessScore >= 70 && (fatigueLevel === "low" || fatigueLevel === undefined)) {
    state = "recovered";
    trainingRecommendation = "full training";
    return { state, trainingRecommendation };
  }

  return { state, trainingRecommendation };
}

/**
 * Convenience: compute athlete state from performance data engine output.
 */
export function athleteStateFromPerformanceData(performanceData: {
  readinessScore: number;
  fatigueLevel: "low" | "moderate" | "high";
  injuryRisk: number;
}, options?: { hrvTrendPercent?: number; sleepHours?: number }): AthleteStateOutput {
  return calculateAthleteState({
    readinessScore: performanceData.readinessScore,
    fatigueLevel: performanceData.fatigueLevel,
    injuryRisk: performanceData.injuryRisk,
    hrvTrendPercent: options?.hrvTrendPercent,
    sleepHours: options?.sleepHours,
  });
}
