/**
 * Performance Forecast Engine — pure functions for 8–12 week PPS projection.
 * No side effects, no external libraries, TypeScript strict.
 */

/**
 * Linear regression on the last `weeks` data points.
 * Returns slope (rate of change per week).
 */
export function extractTrend(data: number[], weeks: number): number {
  if (data.length === 0 || weeks < 1) return 0;
  const n = Math.min(weeks, data.length);
  const start = data.length - n;
  const slice = data.slice(start, start + n);
  const count = slice.length;
  if (count < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < count; i++) {
    const x = i;
    const y = slice[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = count * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  return (count * sumXY - sumX * sumY) / denominator;
}

/**
 * Exponential decay: slope * Math.exp(-decayConstant * weekIndex)
 */
export function applyDecay(slope: number, weekIndex: number, decayConstant: number): number {
  return slope * Math.exp(-decayConstant * weekIndex);
}

/**
 * Projected weekly values:
 * current + (decayedSlope × consistencyFactor × weekIndex) per week.
 * Clamped: maxHistorical + 25% upper, -100% lower.
 */
export function generateProjection(
  currentValue: number,
  slope: number,
  weeksForward: number,
  consistencyFactor: number,
  decayConstant: number
): number[] {
  const out: number[] = [];
  const maxHistorical = currentValue;
  const upperClamp = maxHistorical + Math.max(maxHistorical * 0.25, 25);
  const lowerClamp = -100;

  for (let w = 0; w < weeksForward; w++) {
    const decayed = applyDecay(slope, w, decayConstant);
    const delta = decayed * consistencyFactor * (w + 1);
    let val = currentValue + delta;
    val = Math.max(lowerClamp, Math.min(upperClamp, val));
    out.push(val);
  }

  return out;
}

/**
 * R² from regression, combined with adherence (0–1), penalized by volatility (std dev).
 * Returns confidence score 0–1.
 */
export function calculateConfidence(
  data: number[],
  adherence: number,
  volatility: number
): number {
  if (data.length < 2) return Math.max(0, Math.min(1, adherence));

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = data[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const meanY = sumY / n;
  const ssTot = sumYY - n * meanY * meanY;
  if (ssTot <= 0) return Math.max(0, Math.min(1, adherence));

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return Math.max(0, Math.min(1, adherence));

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = meanY - slope * (sumX / n);

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    ssRes += (data[i] - pred) ** 2;
  }

  const r2 = 1 - ssRes / ssTot;
  const r2Clamped = Math.max(0, Math.min(1, r2));

  const volPenalty = Math.max(0, 1 - volatility / 50);
  const combined = (r2Clamped * 0.5 + adherence * 0.5) * volPenalty;
  return Math.max(0, Math.min(1, combined));
}
