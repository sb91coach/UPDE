/**
 * Training Modification Engine — determines whether a planned session should be modified.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

export type SessionType = "red" | "green" | "recovery";

export type TrainingAdjustmentInput = {
  /** Readiness score 0–100 */
  readinessScore: number;
  /** Fatigue flag from readiness analysis */
  fatigueFlag: boolean;
  /** Athlete state from athlete state detector */
  athleteState: "recovered" | "ready" | "fatigued" | "overreached" | "injuryRisk";
  /** Planned session type (red = high load, green = moderate, recovery = light) */
  plannedSessionType: SessionType;
  /** Optional: has plyometrics in session */
  hasPlyometrics?: boolean;
};

export type TrainingAdjustmentOutput = {
  modifySession: boolean;
  sessionType: SessionType;
  intensityAdjustment: number;
  volumeAdjustment: number;
  notes: string[];
};

/**
 * IF readinessScore < 60 → convert Red day to Green day
 * IF readinessScore < 45 → convert session to recovery
 * IF fatigueFlag true → reduce intensity 10–20%
 * IF athleteState = fatigued → reduce plyometrics volume
 */
export function computeTrainingAdjustment(
  input: TrainingAdjustmentInput
): TrainingAdjustmentOutput {
  const notes: string[] = [];
  let sessionType = input.plannedSessionType;
  let intensityAdjustment = 0;
  let volumeAdjustment = 0;

  if (input.readinessScore < 45) {
    sessionType = "recovery";
    intensityAdjustment = -40;
    volumeAdjustment = -50;
    notes.push("Readiness low; session converted to recovery.");
  } else if (input.readinessScore < 60) {
    if (input.plannedSessionType === "red") {
      sessionType = "green";
      intensityAdjustment = -15;
      volumeAdjustment = -20;
      notes.push("Red day converted to green; intensity and volume reduced.");
    } else if (input.plannedSessionType === "green") {
      intensityAdjustment = -10;
      volumeAdjustment = -15;
      notes.push("Moderate reduction applied for readiness.");
    }
  }

  if (input.fatigueFlag && sessionType !== "recovery") {
    const reduction = input.readinessScore < 50 ? 20 : 10;
    intensityAdjustment = Math.min(intensityAdjustment, -reduction);
    if (volumeAdjustment === 0) volumeAdjustment = -reduction;
    notes.push(`Fatigue flag: intensity reduced by ${reduction}%.`);
  }

  if (input.athleteState === "fatigued" && input.hasPlyometrics) {
    volumeAdjustment = Math.min(volumeAdjustment, -25);
    notes.push("Plyometrics volume reduced (fatigued state).");
  }

  if (input.athleteState === "overreached") {
    sessionType = "recovery";
    intensityAdjustment = Math.min(intensityAdjustment, -50);
    volumeAdjustment = Math.min(volumeAdjustment, -60);
    notes.push("Overreached state; recovery session recommended.");
  }

  const modifySession =
    sessionType !== input.plannedSessionType ||
    intensityAdjustment !== 0 ||
    volumeAdjustment !== 0;

  return {
    modifySession,
    sessionType,
    intensityAdjustment,
    volumeAdjustment,
    notes,
  };
}
