/**
 * Full macro engine — adaptive performance nutrition intelligence.
 * Training-linked carb periodisation, injury-aware modulation, recovery adjustment,
 * behaviour-aware simplification. Outputs structured targets and evidence-based guidance.
 */

import type { RecoveryBandwidth } from "./fatigueModel";

export type TrainingBlockType = "neural" | "hypertrophy" | "aerobic";
export type NutritionGoal = "gain" | "maintain" | "recomposition" | "endurance_bias";
export type SessionIntensity = "low" | "moderate" | "high";

export type NutritionInputs = {
  /** kg; if null, targets use default weight for g/kg and calories may be null */
  bodyweight_kg?: number | null;
  goal: NutritionGoal;
  /** Sessions per week */
  weekly_volume: number;
  /** Today's session intensity */
  session_intensity: SessionIntensity;
  /** Training block type for today */
  training_block_type: TrainingBlockType;
  /** Active (unresolved) injuries present */
  active_injuries: boolean;
  /** Tendon-classified injury (for collagen protocol) */
  tendon_injury?: boolean;
  recovery_bandwidth: RecoveryBandwidth;
  readiness_score: number;
  /** 0–100; high = simplify guidance */
  behaviour_drift_friction?: number;
  deload_week?: boolean;
};

export type MacroTarget = { g: number; gPerKg: number };

export type NutritionOutput = {
  totalCalories: number | null;
  proteinTarget: MacroTarget;
  carbTarget: MacroTarget;
  fatTarget: MacroTarget;
  carbTimingStrategy: string;
  intraSessionFuel: string;
  postSessionRecovery: string;
  hydrationStrategy: string;
  sodiumAdjustment: number;
  omega3Recommendation: string;
  creatineRecommendation: string;
  collagenProtocol: string | null;
  explanation: string;
  /** Numeric hydration target (L) for UI */
  hydrationLitres?: number;
  /** When behaviour drift is high, guidance is simplified */
  simplified?: boolean;
};

const DEFAULT_WEIGHT_KG = 75;

/**
 * Full adaptive macro and fueling guidance.
 */
export function getNutritionGuidance(inputs: NutritionInputs): NutritionOutput {
  const {
    bodyweight_kg,
    goal,
    weekly_volume,
    session_intensity,
    training_block_type,
    active_injuries,
    tendon_injury = false,
    recovery_bandwidth,
    readiness_score,
    behaviour_drift_friction = 0,
    deload_week = false,
  } = inputs;

  const bw = bodyweight_kg ?? DEFAULT_WEIGHT_KG;
  const hasWeight = bodyweight_kg != null && bodyweight_kg > 0;
  const simplified = behaviour_drift_friction >= 50;

  // —— Protein (injury → up to 2.2 g/kg) ——
  const proteinPerKg = active_injuries ? 2.2 : training_block_type === "aerobic" ? 1.5 : 1.8;
  const proteinG = Math.round(proteinPerKg * bw);
  const proteinTarget: MacroTarget = { g: proteinG, gPerKg: Math.round(proteinPerKg * 100) / 100 };

  // —— Carbs ——
  // High neural → higher carbs; aerobic density → steady distribution; low readiness → moderate
  const neuralHigh = training_block_type === "neural" && session_intensity === "high";
  const aerobicDense = training_block_type === "aerobic" && weekly_volume >= 4;
  let carbPerKg = 4;
  if (neuralHigh) carbPerKg = 5.5;
  else if (aerobicDense) carbPerKg = 5;
  if (readiness_score > 75) carbPerKg *= 1.1;
  if (readiness_score < 50) carbPerKg *= 0.85; // moderate carbs, protein maintained
  if (simplified) carbPerKg = Math.min(carbPerKg, 4); // simplify
  const carbG = Math.round(carbPerKg * bw);
  const carbTarget: MacroTarget = { g: carbG, gPerKg: Math.round(carbPerKg * 100) / 100 };

  // —— Fat ——
  const fatPerKg = goal === "endurance_bias" ? 0.9 : 1.0;
  const fatG = Math.round(Math.max(45, fatPerKg * bw));
  const fatTarget: MacroTarget = { g: fatG, gPerKg: Math.round(fatPerKg * 100) / 100 };

  // —— Total calories (deload taper; recovery +5%) ——
  let totalCalories: number | null = null;
  if (hasWeight) {
    let kcal = proteinG * 4 + carbG * 4 + fatG * 9;
    if (recovery_bandwidth === "compressed" || recovery_bandwidth === "critical") kcal *= 1.05;
    if (deload_week) kcal *= 0.92;
    if (goal === "gain") kcal *= 1.05;
    if (goal === "recomposition") kcal *= 0.98;
    totalCalories = Math.round(kcal);
  }

  // —— Carb timing ——
  let carbTimingStrategy: string;
  if (neuralHigh) {
    carbTimingStrategy = "Higher carbs pre-session (1–1.5 g/kg 60–90 min prior) and post-session (1 g/kg within 2 h) for glycogen and CNS.";
  } else if (aerobicDense) {
    carbTimingStrategy = "Steady carb distribution across the day; no single large spike. Support sustained aerobic demand.";
  } else if (readiness_score < 50) {
    carbTimingStrategy = "Moderate carbs; prioritise around session only. Maintain protein at target.";
  } else {
    carbTimingStrategy = "Distribute carbs across 3–4 feedings; bias around training window.";
  }
  if (simplified) carbTimingStrategy = "Keep carbs around training. No strict timing rules.";

  // —— Intra-session fuel ——
  let intraSessionFuel: string;
  if (session_intensity === "high" && !simplified) {
    intraSessionFuel = "Optional: 30–60 g carbohydrate per hour for sessions > 90 min. Electrolytes if high sweat.";
  } else if (training_block_type === "aerobic" && weekly_volume >= 4) {
    intraSessionFuel = "30–60 g/hr for sessions > 90 min. Steady intake preferred over bolus.";
  } else {
    intraSessionFuel = "Not required for typical session length. Hydration and electrolytes if needed.";
  }
  if (simplified) intraSessionFuel = "Hydration focus. Add carbs only if session long or you feel low.";

  // —— Post-session recovery ——
  let postSessionRecovery: string;
  if (neuralHigh) {
    postSessionRecovery = "1 g/kg carb + 0.25–0.3 g/kg protein within 2 h. Supports glycogen and MPS.";
  } else if (active_injuries) {
    postSessionRecovery = "Protein-first (30–40 g); adequate carbs. Supports repair and adaptation.";
  } else {
    postSessionRecovery = "Protein 30–40 g; moderate carbs. Full meal within 2 h acceptable.";
  }
  if (simplified) postSessionRecovery = "Protein-rich meal within 2 h. Don't skip recovery eating.";

  // —— Hydration ——
  let hydrationLitres = 2.5;
  if (training_block_type === "aerobic" && weekly_volume >= 4) hydrationLitres += 0.5;
  if (session_intensity === "high") hydrationLitres += 0.3;
  hydrationLitres = Math.round(hydrationLitres * 10) / 10;
  const hydrationStrategy =
    hydrationLitres +
    " L baseline. Increase on high-intensity or long sessions. Spread intake; small amounts pre/during/post.";

  // —— Sodium ——
  let sodiumAdjustment = 0;
  if (session_intensity === "high") sodiumAdjustment += 1;
  if (training_block_type === "aerobic" && session_intensity !== "low") sodiumAdjustment += 0.5;
  sodiumAdjustment = Math.round(sodiumAdjustment * 10) / 10;

  // —— Omega-3 ——
  let omega3Recommendation: string;
  if (recovery_bandwidth === "compressed" || recovery_bandwidth === "critical") {
    omega3Recommendation = "2–3 g EPA+DHA daily. Supports recovery and inflammatory balance.";
  } else if (active_injuries) {
    omega3Recommendation = "2–3 g EPA+DHA. Evidence for modulation of inflammatory response.";
  } else {
    omega3Recommendation = "1–2 g EPA+DHA daily if not consistently hitting fatty fish. Optional but supported.";
  }

  // —— Creatine ——
  const creatineRecommendation =
    "3–5 g creatine monohydrate daily. Evidence for strength and power; timing non-critical. Contraindicated only in specific medical conditions.";

  // —— Collagen (tendon injury) ——
  let collagenProtocol: string | null = null;
  if (tendon_injury) {
    collagenProtocol =
      "10–15 g collagen (or gelatin) with 30–60 mg vitamin C, 30–60 min before tendon-loading session. Evidence for tendon matrix support.";
  }

  // —— Explanation (concise) ——
  const parts: string[] = [];
  if (neuralHigh) parts.push("Neural day: higher carbs pre/post and optional intra-session.");
  if (aerobicDense) parts.push("Aerobic density: steady carb distribution and hydration.");
  if (deload_week) parts.push("Deload: slight caloric taper.");
  if (active_injuries) parts.push("Injury: protein at 2.2 g/kg; collagen protocol if tendon.");
  if (readiness_score < 50) parts.push("Low readiness: moderate carbs, protein maintained.");
  if (simplified) parts.push("Simplified guidance due to engagement; focus on protein minimum and recovery.");
  if (recovery_bandwidth !== "adequate") parts.push("Recovery compressed: kcal and omega-3 emphasis.");
  const explanation = parts.length > 0 ? parts.join(" ") : "Targets aligned to training and recovery.";

  const output: NutritionOutput = {
    totalCalories,
    proteinTarget,
    carbTarget,
    fatTarget,
    carbTimingStrategy,
    intraSessionFuel,
    postSessionRecovery,
    hydrationStrategy,
    sodiumAdjustment,
    omega3Recommendation,
    creatineRecommendation,
    collagenProtocol,
    explanation,
    hydrationLitres,
  };
  if (simplified) output.simplified = true;
  return output;
}

/** Legacy shape: flat g targets + dailyCaloriesTarget, fuelingStrategy, recoveryFocus for backward compatibility. */
export type NutritionOutputLegacy = {
  dailyCaloriesTarget: number | null;
  carbTarget: number;
  proteinTarget: number;
  proteinTargetRange?: [number, number];
  fatTarget: number;
  hydrationTarget: number;
  sodiumAdjustment: number;
  fuelingStrategy: string;
  recoveryFocus: string;
};

export function getNutritionGuidanceLegacy(inputs: NutritionInputs): NutritionOutputLegacy {
  const out = getNutritionGuidance(inputs);
  const bw = inputs.bodyweight_kg ?? DEFAULT_WEIGHT_KG;
  return {
    dailyCaloriesTarget: out.totalCalories,
    carbTarget: out.carbTarget.g,
    proteinTarget: out.proteinTarget.g,
    proteinTargetRange: inputs.active_injuries
      ? [Math.round(1.8 * bw), Math.round(2.2 * bw)]
      : undefined,
    fatTarget: out.fatTarget.g,
    hydrationTarget: out.hydrationLitres ?? 2.5,
    sodiumAdjustment: out.sodiumAdjustment,
    fuelingStrategy: out.carbTimingStrategy + " " + out.postSessionRecovery,
    recoveryFocus: out.omega3Recommendation + (out.collagenProtocol ? " " + out.collagenProtocol : ""),
  };
}
