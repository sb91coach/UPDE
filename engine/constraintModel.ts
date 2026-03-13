/**
 * Constraint intelligence — work stress, travel, cognitive load.
 * When volatility rises: reduce bilateral load, increase unilateral tempo,
 * shift intensity distribution, modify weekly density.
 */

export type ConstraintInputs = {
  /** 1–5 scale */
  work_stress?: number | null;
  /** Travel this week */
  travel_week?: boolean | null;
  /** 1–5 scale */
  cognitive_load?: number | null;
  /** Optional: sleep volatility low / medium / high */
  sleep_volatility?: "low" | "medium" | "high" | null;
};

export type VolatilityLevel = "low" | "medium" | "high";

export type ConstraintRecommendations = {
  volatility: VolatilityLevel;
  reduceBilateralLoad: boolean;
  increaseUnilateralTempo: boolean;
  shiftIntensityDistribution: boolean;
  modifyWeeklyDensity: boolean;
  /** Short narrative for coach brief */
  summary: string;
};

/**
 * Compute volatility from constraint inputs (work, travel, cognitive, sleep).
 */
export function constraintVolatility(profile: ConstraintInputs): VolatilityLevel {
  const w = profile.work_stress ?? 0;
  const c = profile.cognitive_load ?? 0;
  const travel = profile.travel_week === true ? 1 : 0;
  const sleepV = profile.sleep_volatility === "high" ? 1 : profile.sleep_volatility === "medium" ? 0.5 : 0;
  const raw = (w / 5) * 0.35 + (c / 5) * 0.35 + travel * 0.2 + sleepV * 0.2;
  if (raw >= 0.6) return "high";
  if (raw >= 0.35) return "medium";
  return "low";
}

/**
 * Recommendations when volatility rises: bilateral reduction, unilateral tempo,
 * intensity shift, weekly density.
 */
export function getConstraintRecommendations(profile: ConstraintInputs): ConstraintRecommendations {
  const vol = constraintVolatility(profile);
  const reduceBilateral = vol === "high" || vol === "medium";
  const increaseUnilateral = vol === "high";
  const shiftIntensity = vol === "high";
  const modifyDensity = vol !== "low";

  let summary = "Constraints are low; full programme supported.";
  if (vol === "medium") {
    summary = "Moderate constraints (work/travel/cognitive load). Consider slightly reduced bilateral volume and more unilateral tempo work.";
  } else if (vol === "high") {
    summary = "High constraint week. Reduce bilateral load, increase unilateral tempo, shift intensity distribution, and consider fewer sessions or shorter density.";
  }

  return {
    volatility: vol,
    reduceBilateralLoad: reduceBilateral,
    increaseUnilateralTempo: increaseUnilateral,
    shiftIntensityDistribution: shiftIntensity,
    modifyWeeklyDensity: modifyDensity,
    summary,
  };
}
