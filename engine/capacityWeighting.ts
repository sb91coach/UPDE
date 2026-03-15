/**
 * Capacity weighting: AI dynamically weights the six capacities based on
 * user goal, goal timeline, performance diagnostics, training history, readiness trends.
 * Example: Durability 30%, Energy 25%, Force Production 20%, Force Expression 15%, Movement 5%, Recovery 5%.
 */

import type { CapacityDomain } from "@/types/capacity";

export type CapacityWeightInput = {
  goal?: string | null;
  goalTimelineWeeks?: number | null;
  performanceDiagnosticsSummary?: string | null;
  trainingHistorySummary?: string | null;
  readinessTrend?: "improving" | "stable" | "declining" | null;
};

export type CapacityWeights = Record<CapacityDomain, number>;

const DOMAINS: CapacityDomain[] = [
  "force_production",
  "force_expression",
  "energy_system_efficiency",
  "movement_integrity",
  "durability",
  "recovery_capacity",
];

/** Default weights (e.g. durability-focused): Durability 30%, Energy 25%, Force Prod 20%, Force Expr 15%, Movement 5%, Recovery 5%. */
const DEFAULT_WEIGHTS: CapacityWeights = {
  force_production: 0.2,
  force_expression: 0.15,
  energy_system_efficiency: 0.25,
  movement_integrity: 0.05,
  durability: 0.3,
  recovery_capacity: 0.05,
};

/**
 * Get capacity weights for programme generation and diagnostics.
 * Weights are normalised to sum to 1.
 */
export function getCapacityWeights(input: CapacityWeightInput): CapacityWeights {
  const goal = (input.goal ?? "").toLowerCase();
  const timeline = input.goalTimelineWeeks ?? 12;
  const trend = input.readinessTrend ?? "stable";

  let w = { ...DEFAULT_WEIGHTS };

  if (goal.includes("strength") || goal.includes("force") || goal.includes("power")) {
    w.force_production = 0.28;
    w.force_expression = 0.22;
    w.durability = 0.2;
    w.energy_system_efficiency = 0.15;
    w.movement_integrity = 0.08;
    w.recovery_capacity = 0.07;
  } else if (goal.includes("endurance") || goal.includes("aerobic") || goal.includes("running")) {
    w.energy_system_efficiency = 0.35;
    w.durability = 0.3;
    w.force_production = 0.15;
    w.force_expression = 0.05;
    w.movement_integrity = 0.08;
    w.recovery_capacity = 0.07;
  } else if (goal.includes("durability") || goal.includes("resilience")) {
    w.durability = 0.35;
    w.energy_system_efficiency = 0.25;
    w.recovery_capacity = 0.15;
    w.force_production = 0.12;
    w.force_expression = 0.08;
    w.movement_integrity = 0.05;
  }

  if (trend === "declining") {
    w.recovery_capacity = Math.min(0.25, w.recovery_capacity + 0.1);
    const scale = 1 - (w.recovery_capacity - (DEFAULT_WEIGHTS.recovery_capacity));
    DOMAINS.forEach((d) => {
      if (d !== "recovery_capacity") w[d] = (w[d] * (1 - w.recovery_capacity)) / (1 - DEFAULT_WEIGHTS.recovery_capacity);
    });
  }

  const sum = DOMAINS.reduce((s, d) => s + w[d], 0);
  const normalised: CapacityWeights = {} as CapacityWeights;
  DOMAINS.forEach((d) => (normalised[d] = w[d] / sum));
  return normalised;
}
