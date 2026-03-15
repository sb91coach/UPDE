/**
 * Readiness Model — daily inputs that generate a readiness score.
 * Influences: training intensity, volume, exercise substitution, recovery sessions, temporary rehab blocks.
 */

export type ReadinessInputs = {
  sleep: number; // 0–10 or hours
  fatigue: number; // 0–10
  soreness: number; // 0–10
  stress: number; // 0–10
  pain: number; // 0–10
  motivation: number; // 0–10
};

export type ReadinessScore = {
  score: number; // 0–100
  influences: {
    trainingIntensity: number;
    trainingVolume: number;
    suggestSubstitution: boolean;
    suggestRecoverySession: boolean;
    suggestRehabBlock: boolean;
  };
};
