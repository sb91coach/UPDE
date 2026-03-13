/**
 * Athlete State Detector — determines physiological state from readiness and risk.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

export type AthleteStateType =
  | "recovered"
  | "ready"
  | "fatigued"
  | "overreached"
  | "injuryRisk";

export type RiskLevel = "low" | "moderate" | "high";

export type AthleteStateInput = {
  /** Readiness score 0–100 from readiness analysis */
  readinessScore: number;
  /** Optional: injury risk 0–100 */
  injuryRisk?: number;
  /** Optional: fatigue flag from readiness analysis */
  fatigueFlag?: boolean;
};

export type AthleteStateOutput = {
  state: AthleteStateType;
  riskLevel: RiskLevel;
};

/**
 * IF readinessScore > 80 → state = "ready" (or "recovered")
 * IF readinessScore 60–80 → state = "moderate fatigue" (map to ready/fatigued)
 * IF readinessScore < 60 → state = "fatigued"
 * IF readinessScore < 40 → state = "overreached"
 */
export function detectAthleteState(input: AthleteStateInput): AthleteStateOutput {
  const { readinessScore, injuryRisk = 0, fatigueFlag = false } = input;

  if (injuryRisk >= 65) {
    return {
      state: "injuryRisk",
      riskLevel: injuryRisk >= 80 ? "high" : "moderate",
    };
  }

  if (readinessScore < 40) {
    return {
      state: "overreached",
      riskLevel: "high",
    };
  }

  if (readinessScore < 60) {
    return {
      state: "fatigued",
      riskLevel: readinessScore < 50 ? "high" : "moderate",
    };
  }

  if (readinessScore >= 60 && readinessScore <= 80) {
    return {
      state: fatigueFlag ? "fatigued" : "ready",
      riskLevel: fatigueFlag ? "moderate" : "low",
    };
  }

  return {
    state: readinessScore >= 85 ? "recovered" : "ready",
    riskLevel: "low",
  };
}
