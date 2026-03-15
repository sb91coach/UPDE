/**
 * Exercise Intelligence — metadata for internal library and research-based selection.
 * AI uses this to substitute exercises automatically when needed.
 */

import type { CapacityDomain } from "./capacity";
import type { EquipmentEnvironment } from "./equipment";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "push"
  | "pull"
  | "carry"
  | "lunge"
  | "jump"
  | "run"
  | "row"
  | "other";

export type ExerciseMetadata = {
  movementPattern: MovementPattern;
  capacityTrained: CapacityDomain;
  equipmentRequired: EquipmentEnvironment[];
  fatigueCost: number; // 0–10
  skillComplexity: number; // 0–10
  jointStress: Record<string, number>; // e.g. knee: 7, spine: 5
};

export type ExerciseWithIntelligence = {
  id: string;
  name: string;
  metadata: ExerciseMetadata;
};
