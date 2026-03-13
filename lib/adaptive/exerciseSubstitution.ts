/**
 * Exercise Substitution Engine — recommends substitutions when risk is detected.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

export type SubstitutionRecommendation = {
  remove: string;
  replace: string;
  reason: string;
};

export type ExerciseSubstitutionInput = {
  /** Detected pain/risk: joint or region */
  kneePain?: boolean;
  lumbarFatigue?: boolean;
  shoulderPain?: boolean;
  /** Optional: other restriction (e.g. "ankle") */
  otherRestrictions?: string[];
  /** Planned exercises (names) for context */
  plannedExercises?: string[];
};

export type ExerciseSubstitutionOutput = {
  substitutions: SubstitutionRecommendation[];
};

const SQUAT_PATTERN = [
  "Back Squat",
  "Front Squat",
  "Split Squat",
  "Lunge",
  "Bulgarian Split Squat",
];
const HINGE_PATTERN = ["Trap Bar Deadlift", "RDL", "Romanian Deadlift", "Hip Hinge"];
const OVERHEAD_PATTERN = ["Overhead Press", "Strict Press", "Push Press", "Snatch"];

/**
 * IF knee pain detected → remove squat pattern, suggest hinge/alternatives
 * IF lumbar fatigue detected → reduce hinge intensity / suggest regressions
 * IF shoulder pain detected → remove overhead pressing
 */
export function recommendSubstitutions(
  input: ExerciseSubstitutionInput
): ExerciseSubstitutionOutput {
  const substitutions: SubstitutionRecommendation[] = [];

  if (input.kneePain) {
    const planned = input.plannedExercises ?? [];
    for (const ex of SQUAT_PATTERN) {
      if (planned.some((p) => p.toLowerCase().includes(ex.toLowerCase()))) {
        substitutions.push({
          remove: ex,
          replace: "Trap Bar Deadlift",
          reason: "Knee pain detected; squat pattern replaced with hinge.",
        });
      }
    }
    if (substitutions.length === 0) {
      substitutions.push({
        remove: "Back Squat",
        replace: "Trap Bar Deadlift",
        reason: "Knee pain detected; avoid squat pattern.",
      });
    }
  }

  if (input.lumbarFatigue) {
    substitutions.push({
      remove: "Deadlift",
      replace: "Trap Bar Deadlift (reduced load)",
      reason: "Lumbar fatigue; reduce hinge intensity.",
    });
  }

  if (input.shoulderPain) {
    const hasOverhead = substitutions.some((s) =>
      OVERHEAD_PATTERN.some((ex) => s.remove.toLowerCase().includes(ex.toLowerCase()))
    );
    if (!hasOverhead) {
      substitutions.push({
        remove: "Overhead Press",
        replace: "Landmine Press",
        reason: "Shoulder pain detected; avoid overhead pressing.",
      });
    }
  }

  return { substitutions };
}
