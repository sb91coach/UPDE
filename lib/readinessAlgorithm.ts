/**
 * Tactical Human Performance — Readiness & Risk Algorithm
 *
 * Calculates readiness, risk, and capacity buffer per individual.
 * Powers: Readiness tiles, Exposure vs Capacity, Predictive risk, Performance risk group, Heatmap.
 */

const CLAMP = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

// ---------------------------------------------------------------------------
// DATA INPUT STRUCTURE
// ---------------------------------------------------------------------------

export type ReadinessInput = {
  id: number | string;
  sleep_hours: number;
  sleep_quality: number;
  fatigue_level: number;
  stress_level: number;
  knee_pain: number;
  back_pain: number;
  shin_pain: number;
  shoulder_pain: number;
  strength_index: number;
  endurance_index: number;
  durability_index: number;
  training_load: number;
  operational_hours: number;
  high_intensity_exposure: boolean;
  load_carriage_exposure: boolean;
  capacity_score: number;
};

// ---------------------------------------------------------------------------
// OUTPUT TYPES
// ---------------------------------------------------------------------------

export type ReadinessStatus = "READY" | "MANAGE" | "RISK";
export type ReadinessStatusColor = "green" | "amber" | "red";
export type BufferStatus = "SAFE" | "BALANCED" | "OVERLOAD RISK";
export type TrendIndicator = "IMPROVING" | "STABLE" | "DECLINING";
export type RiskLevel = "HIGH" | "MODERATE" | "LOW";

export type ReadinessResult = {
  id: number | string;
  recoveryScore: number;
  structuralScore: number;
  operationalScore: number;
  exposureScore: number;
  readinessScore: number;
  readinessStatus: ReadinessStatus;
  readinessStatusColor: ReadinessStatusColor;
  capacityBuffer: number;
  bufferStatus: BufferStatus;
  trend: TrendIndicator;
  riskLevel: RiskLevel;
};

export type CalculateReadinessOptions = {
  /** Last 7 readiness scores, most recent first (index 0 = today/latest). Used for trend. */
  recentReadinessScores?: number[];
};

// ---------------------------------------------------------------------------
// STEP 1 — RECOVERY SCORE
// ---------------------------------------------------------------------------

function calcRecoveryScore(r: ReadinessInput): number {
  const SleepScore = (r.sleep_hours / 8) * 100;
  const QualityScore = r.sleep_quality * 20;
  const FatiguePenalty = r.fatigue_level * 10;
  const StressPenalty = r.stress_level * 10;
  const raw =
    SleepScore * 0.4 +
    QualityScore * 0.3 -
    FatiguePenalty * 0.2 -
    StressPenalty * 0.1;
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 2 — STRUCTURAL INTEGRITY SCORE
// ---------------------------------------------------------------------------

function calcStructuralScore(r: ReadinessInput): number {
  const PainTotal =
    r.knee_pain + r.back_pain + r.shin_pain + r.shoulder_pain;
  const raw = 100 - PainTotal * 15;
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 3 — OPERATIONAL OUTPUT SCORE
// ---------------------------------------------------------------------------

function calcOperationalScore(r: ReadinessInput): number {
  const raw =
    r.strength_index * 0.35 +
    r.endurance_index * 0.35 +
    r.durability_index * 0.3;
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 4 — EXPOSURE SCORE
// ---------------------------------------------------------------------------

function calcExposureScore(r: ReadinessInput): number {
  const raw =
    r.training_load * 8 +
    r.operational_hours * 4 +
    (r.high_intensity_exposure ? 10 : 0) +
    (r.load_carriage_exposure ? 8 : 0);
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 5 — FINAL READINESS SCORE
// ---------------------------------------------------------------------------

function calcReadinessScore(
  recovery: number,
  structural: number,
  operational: number,
  exposure: number
): number {
  const raw =
    recovery * 0.3 +
    structural * 0.25 +
    operational * 0.25 -
    exposure * 0.2;
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 6 — READINESS STATUS
// ---------------------------------------------------------------------------

function getReadinessStatus(readiness: number): {
  status: ReadinessStatus;
  color: ReadinessStatusColor;
} {
  if (readiness >= 75) return { status: "READY", color: "green" };
  if (readiness >= 60) return { status: "MANAGE", color: "amber" };
  return { status: "RISK", color: "red" };
}

// ---------------------------------------------------------------------------
// STEP 7 — CAPACITY BUFFER
// ---------------------------------------------------------------------------

function getCapacityBuffer(
  capacity_score: number,
  exposureScore: number
): { buffer: number; status: BufferStatus } {
  const buffer = capacity_score - exposureScore;
  if (buffer > 10) return { buffer, status: "SAFE" };
  if (buffer >= -10) return { buffer, status: "BALANCED" };
  return { buffer, status: "OVERLOAD RISK" };
}

// ---------------------------------------------------------------------------
// STEP 8 — TREND DETECTION
// ---------------------------------------------------------------------------

function getTrend(recentReadinessScores: number[]): TrendIndicator {
  // Need at least 3 scores (newest first: [today, yesterday, 2 days ago])
  if (recentReadinessScores.length < 3) return "STABLE";
  const [a, b, c] = recentReadinessScores;
  // Consecutive decrease: a < b < c (each day lower)
  if (a < b && b < c) return "DECLINING";
  // Consecutive increase: a > b > c
  if (a > b && b > c) return "IMPROVING";
  return "STABLE";
}

// ---------------------------------------------------------------------------
// STEP 9 — PREDICTIVE RISK DETECTION
// ---------------------------------------------------------------------------

function getRiskLevel(
  recoveryScore: number,
  structuralScore: number,
  exposureScore: number,
  trend: TrendIndicator,
  bufferStatus: BufferStatus
): RiskLevel {
  let signals = 0;
  if (recoveryScore < 50) signals++;
  if (structuralScore < 60) signals++;
  if (exposureScore > 70) signals++;
  if (trend === "DECLINING") signals++;
  if (bufferStatus === "OVERLOAD RISK") signals++;

  if (signals >= 3) return "HIGH";
  if (signals === 2) return "MODERATE";
  return "LOW";
}

// ---------------------------------------------------------------------------
// MAIN ENTRY — CALCULATE READINESS FOR ONE RECORD
// ---------------------------------------------------------------------------

/**
 * Calculate readiness, risk, and capacity buffer for one individual.
 *
 * @param record - Single individual record (raw inputs)
 * @param options - Optional: recentReadinessScores (most recent first) for trend
 * @returns Full result for dashboard consumption
 */
export function calculateReadiness(
  record: ReadinessInput,
  options?: CalculateReadinessOptions
): ReadinessResult {
  const recoveryScore = calcRecoveryScore(record);
  const structuralScore = calcStructuralScore(record);
  const operationalScore = calcOperationalScore(record);
  const exposureScore = calcExposureScore(record);
  const readinessScore = calcReadinessScore(
    recoveryScore,
    structuralScore,
    operationalScore,
    exposureScore
  );
  const { status: readinessStatus, color: readinessStatusColor } =
    getReadinessStatus(readinessScore);
  const { buffer: capacityBuffer, status: bufferStatus } = getCapacityBuffer(
    record.capacity_score,
    exposureScore
  );
  const recent = options?.recentReadinessScores ?? [];
  const trendScores = [readinessScore, ...recent].slice(0, 7);
  const trend = getTrend(trendScores);
  const riskLevel = getRiskLevel(
    recoveryScore,
    structuralScore,
    exposureScore,
    trend,
    bufferStatus
  );

  return {
    id: record.id,
    recoveryScore,
    structuralScore,
    operationalScore,
    exposureScore,
    readinessScore,
    readinessStatus,
    readinessStatusColor,
    capacityBuffer,
    bufferStatus,
    trend,
    riskLevel,
  };
}

// ---------------------------------------------------------------------------
// BATCH — CALCULATE FOR MULTIPLE RECORDS WITH HISTORY
// ---------------------------------------------------------------------------

export type ReadinessHistoryMap = Record<string | number, number[]>;

/**
 * Calculate readiness for multiple records. Use when you have a list of
 * current records and optional per-ID history of past readiness scores.
 *
 * @param records - Array of individual records
 * @param historyById - Optional map: id -> recentReadinessScores (most recent first)
 */
export function calculateReadinessBatch(
  records: ReadinessInput[],
  historyById?: ReadinessHistoryMap
): ReadinessResult[] {
  return records.map((r) =>
    calculateReadiness(r, {
      recentReadinessScores: historyById?.[String(r.id)] ?? historyById?.[Number(r.id)],
    })
  );
}
