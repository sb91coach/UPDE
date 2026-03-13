/**
 * Fueling Strategy Engine — estimates macro targets and timing from event and goal.
 * Pure logic; no side effects.
 */

export type Intensity = "low" | "moderate" | "high";
export type Goal = "performance" | "cut" | "maintenance" | "mass";

/** Optional body composition from store — used for lean-mass protein and deficit/surplus. */
export type BodyCompositionInput = {
  bodyweight: number;
  bodyFat: number;
  muscleMass: number;
  lastUpdated: string;
  waistCm?: number;
};

export type FuelStrategyInput = {
  eventType: string;
  durationMinutes: number;
  intensity: Intensity;
  bodyweight: number;
  goal: Goal;
  /** When provided, protein may use lean mass and carbs/calories adapt to body fat and goal. */
  bodyComposition?: BodyCompositionInput | null;
};

export type FuelStrategyOutput = {
  totalCalories: number;
  carbsGrams: number;
  proteinGrams: number;
  fatsGrams: number;
  preEventStrategy: string;
  intraEventStrategy: string;
  postEventStrategy: string;
};

const CARB_PER_KG: Record<Intensity, [number, number]> = {
  low: [3, 5],
  moderate: [5, 7],
  high: [6, 10],
};

/** Event-type carb modifier: scale the intensity-based carbs (e.g. Rest Day = lower, Endurance = higher). */
const EVENT_CARB_MODIFIER: Record<string, number> = {
  "Rest Day": 0.5,
  "Skill / Mobility": 0.7,
  Strength: 1,
  Hypertrophy: 1.05,
  HIIT: 1.1,
  Endurance: 1.25,
};

const PROTEIN_PER_KG: [number, number] = [1.6, 2.2];
const CALORIES_PER_GRAM_CARB = 4;
const CALORIES_PER_GRAM_PROTEIN = 4;
const CALORIES_PER_GRAM_FAT = 9;

function goalMultiplier(goal: Goal): number {
  switch (goal) {
    case "cut":
      return 0.85;
    case "maintenance":
      return 1;
    case "performance":
      return 1.05;
    case "mass":
      return 1.15;
    default:
      return 1;
  }
}

/**
 * Estimate maintenance calories (no deficit/surplus). Used when goal is cut or mass and body comp is available.
 */
export function calculateMaintenanceCalories(
  bodyweight: number,
  bodyFat?: number
): number {
  const leanFactor = bodyFat != null && bodyFat > 0 ? 1 - bodyFat / 100 : 1;
  const base = 22 * bodyweight * leanFactor + 500;
  return Math.round(base);
}

function getEventSpecificStrategies(
  eventType: string,
  durationMinutes: number,
  carbsGrams: number,
  proteinGrams: number,
  bodyweight: number
): { pre: string; intra: string; post: string } {
  const intraLong =
    durationMinutes > 90
      ? "30–60g carbs per hour during the session (gel, drink, or banana)."
      : "Not required for sessions under 90 min.";

  switch (eventType) {
    case "Rest Day":
      return {
        pre: "No pre-session timing. Focus on consistent meals: moderate carbs, prioritise protein (1.6–2g/kg) and fats. Keep fibre and hydration up.",
        intra: "N/A — no session.",
        post: "Even intake across the day. Slightly lower total carbs; use fats for satiety. Target: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    case "Skill / Mobility":
      return {
        pre: "Light meal 1–2h before: 0.5–1g/kg carbs, small protein. Avoid heavy fibre or fat close to session.",
        intra: "Water and electrolytes only unless session exceeds 90 min.",
        post: "Standard recovery: 0.25–0.3g/kg protein within 1–2h. Carbs only if you have another session later. Target: ~" + proteinGrams + "g protein.",
      };
    case "Strength":
      return {
        pre: "2–3h before: 1–2g/kg carbs, 0.2–0.3g/kg protein. 30–60 min before: 0.5–1g/kg carbs if tolerated (e.g. banana, rice cakes).",
        intra: intraLong,
        post: "Within 30–60 min: 1–1.2g/kg carbs + 0.25–0.3g/kg protein. Repeat in 2h if same-day load. Target today: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    case "Hypertrophy":
      return {
        pre: "2–3h before: 1–2g/kg carbs, 0.25–0.35g/kg protein. Closer to session: 0.5–1g/kg carbs to fuel volume.",
        intra: intraLong,
        post: "Within 30–60 min: 1–1.2g/kg carbs + 0.3–0.4g/kg protein. Prioritise protein spread across 4–6 meals. Target: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    case "Endurance":
      return {
        pre: "2–3h before: 2–3g/kg carbs, light protein. Top up 30–60 min before with 0.5–1g/kg carbs. Carb-load optional if race or very long session.",
        intra: intraLong,
        post: "Within 30–60 min: 1.2–1.5g/kg carbs + 0.25–0.3g/kg protein. Refill glycogen; repeat carbs in 2h if needed. Target: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    case "HIIT":
      return {
        pre: "1.5–2h before: 1–1.5g/kg carbs, 0.2g/kg protein. 30–45 min before: 0.3–0.5g/kg carbs (easy to digest).",
        intra: intraLong,
        post: "Within 30–45 min: 1–1.2g/kg carbs + 0.25–0.3g/kg protein. Quick refuel to support recovery and any later activity. Target: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    default:
      return {
        pre: "2–3 hours before: 1–2g/kg carbs, 0.2–0.3g/kg protein. 30–60 min before: 0.5–1g/kg carbs if tolerated. Event: " + eventType + ".",
        intra: intraLong,
        post: "Within 30–60 min: 1–1.2g/kg carbs + 0.25–0.3g/kg protein. Target today: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
  }
}

export function generateFuelStrategy(input: FuelStrategyInput): FuelStrategyOutput {
  const { eventType, durationMinutes, intensity, bodyweight, goal, bodyComposition } = input;
  const [carbLow, carbHigh] = CARB_PER_KG[intensity];
  let modifier = EVENT_CARB_MODIFIER[eventType] ?? 1;
  if (bodyComposition && bodyComposition.bodyFat > 20) {
    modifier = modifier * 0.9;
  }
  const carbPerKg = ((carbLow + carbHigh) / 2) * modifier;
  let carbsGrams = Math.round(Math.max(0, carbPerKg * bodyweight));
  const [proteinLow, proteinHigh] = PROTEIN_PER_KG;
  let proteinPerKg = (proteinLow + proteinHigh) / 2;
  if (bodyComposition && goal === "performance" && bodyComposition.muscleMass > 0) {
    proteinPerKg = 2.2;
  }
  const proteinGrams = bodyComposition && goal === "performance" && bodyComposition.muscleMass > 0
    ? Math.round(2.2 * bodyComposition.muscleMass)
    : Math.round(proteinPerKg * bodyweight);
  let baseCalories =
    carbsGrams * CALORIES_PER_GRAM_CARB +
    proteinGrams * CALORIES_PER_GRAM_PROTEIN;
  let mult = goalMultiplier(goal);
  let targetCalories = Math.round(
    (baseCalories + 50 * bodyweight) * mult
  );
  if (bodyComposition && (goal === "cut" || goal === "mass")) {
    const maintenance = calculateMaintenanceCalories(bodyweight, bodyComposition.bodyFat);
    if (goal === "cut") {
      targetCalories = Math.max(1200, Math.round(maintenance - 400));
    } else if (goal === "mass") {
      targetCalories = Math.round(maintenance + 325);
    }
  }
  const remainingCals = Math.max(0, targetCalories - baseCalories);
  const fatsGrams = Math.round(remainingCals / CALORIES_PER_GRAM_FAT);
  const totalCalories =
    carbsGrams * CALORIES_PER_GRAM_CARB +
    proteinGrams * CALORIES_PER_GRAM_PROTEIN +
    fatsGrams * CALORIES_PER_GRAM_FAT;

  const { pre, intra, post } = getEventSpecificStrategies(
    eventType,
    durationMinutes,
    carbsGrams,
    proteinGrams,
    bodyweight
  );

  return {
    totalCalories,
    carbsGrams,
    proteinGrams,
    fatsGrams,
    preEventStrategy: pre,
    intraEventStrategy: intra,
    postEventStrategy: post,
  };
}
