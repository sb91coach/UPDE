/**
 * Adaptive Training Controller — combines all adaptive systems.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

import { analyseReadiness, type ReadinessAnalysisInput } from "./readinessAnalysis";
import { detectAthleteState } from "./athleteState";
import { computeTrainingAdjustment, type SessionType } from "./trainingAdjustment";
import { recommendSubstitutions, type ExerciseSubstitutionInput } from "./exerciseSubstitution";
import { parseSessionFeedback } from "./sessionFeedbackParser";

export type AdaptiveControllerInput = {
  /** Inputs for readiness analysis */
  readiness: ReadinessAnalysisInput;
  /** Planned session type (red | green | recovery) */
  plannedSessionType: SessionType;
  /** Optional: planned exercise names */
  plannedExercises?: string[];
  /** Optional: athlete written feedback (e.g. "Knee pain after split squats") */
  athleteFeedback?: string;
  /** Optional: has plyometrics in session */
  hasPlyometrics?: boolean;
};

export type AdaptiveControllerOutput = {
  sessionModified: boolean;
  recommendedSessionType: SessionType;
  intensityAdjustment: number;
  volumeAdjustment: number;
  exerciseChanges: { remove: string; replace: string; reason: string }[];
  coachingNotes: string[];
};

/**
 * Orchestrates readiness analysis, athlete state, training adjustment,
 * feedback parsing, and exercise substitution.
 */
export function runAdaptiveController(
  input: AdaptiveControllerInput
): AdaptiveControllerOutput {
  const coachingNotes: string[] = [];

  const readinessResult = analyseReadiness(input.readiness);
  const athleteStateResult = detectAthleteState({
    readinessScore: readinessResult.readinessScore,
    fatigueFlag: readinessResult.fatigueFlag,
  });

  const adjustmentResult = computeTrainingAdjustment({
    readinessScore: readinessResult.readinessScore,
    fatigueFlag: readinessResult.fatigueFlag,
    athleteState: athleteStateResult.state,
    plannedSessionType: input.plannedSessionType,
    hasPlyometrics: input.hasPlyometrics,
  });

  coachingNotes.push(...adjustmentResult.notes);

  let exerciseChanges: { remove: string; replace: string; reason: string }[] = [];

  const feedbackParse = input.athleteFeedback
    ? parseSessionFeedback(input.athleteFeedback)
    : null;

  if (feedbackParse?.joint || feedbackParse?.relatedExercise) {
    const subInput: ExerciseSubstitutionInput = {
      plannedExercises: input.plannedExercises,
    };
    if (feedbackParse.joint === "knee") subInput.kneePain = true;
    if (feedbackParse.joint === "shoulder") subInput.shoulderPain = true;
    if (feedbackParse.joint === "back" || feedbackParse.joint === "lumbar")
      subInput.lumbarFatigue = true;

    const subResult = recommendSubstitutions(subInput);
    exerciseChanges = subResult.substitutions.map((s) => ({
      remove: s.remove,
      replace: s.replace,
      reason: s.reason,
    }));
    coachingNotes.push(
      ...subResult.substitutions.map((s) => `Substitution: ${s.remove} → ${s.replace}. ${s.reason}`)
    );
  }

  return {
    sessionModified: adjustmentResult.modifySession || exerciseChanges.length > 0,
    recommendedSessionType: adjustmentResult.sessionType,
    intensityAdjustment: adjustmentResult.intensityAdjustment,
    volumeAdjustment: adjustmentResult.volumeAdjustment,
    exerciseChanges,
    coachingNotes,
  };
}
