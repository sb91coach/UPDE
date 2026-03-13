"use client";

import {
  extractTrend,
  generateProjection,
  calculateConfidence,
} from "@/lib/forecastEngine";
import type { ForecastResult } from "@/types/forecast";

const DEFAULT_WEEKS_FORWARD = 8;
const DEFAULT_DECAY_CONSTANT = 0.12;
const CONSISTENCY_MIN = 0.8;
const CONSISTENCY_MAX = 1.1;

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance =
    arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function usePerformanceForecast(
  historicalData: number[],
  adherence: number,
  consistencyScore: number,
  weeksForward: number = DEFAULT_WEEKS_FORWARD
): ForecastResult {
  const weeks = Math.min(Math.max(historicalData.length, 2), 12);
  const slope = extractTrend(historicalData, weeks);
  const volatility = stdDev(historicalData);
  const adherenceClamped = Math.max(0, Math.min(1, adherence));
  const consistencyFactor =
    CONSISTENCY_MIN +
    (CONSISTENCY_MAX - CONSISTENCY_MIN) * Math.max(0, Math.min(1, consistencyScore / 100));
  const currentValue =
    historicalData.length > 0
      ? historicalData[historicalData.length - 1]
      : 0;

  const projected = generateProjection(
    currentValue,
    slope,
    weeksForward,
    consistencyFactor,
    DEFAULT_DECAY_CONSTANT
  );

  const confidence = calculateConfidence(
    historicalData,
    adherenceClamped,
    volatility
  );

  return {
    historical: [...historicalData],
    projected,
    slope,
    confidence,
  };
}
