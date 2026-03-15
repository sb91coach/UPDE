/**
 * Unit Readiness Map — data for 2D readiness grid.
 * Maps stored ReadinessEntry to algorithm output and fatigue score.
 */

import { calculateReadiness, type ReadinessInput, type ReadinessResult } from "@/lib/readinessAlgorithm";
import type { ReadinessEntry } from "@/lib/tacticalReadinessStorage";

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

/** Convert stored entry to algorithm input (uses latest 4 pain sites + derived capacity). */
function entryToReadinessInput(entry: ReadinessEntry): ReadinessInput {
  const capacity_score =
    (entry.strength_index + entry.aerobic_capacity + entry.movement_durability) / 3;
  return {
    id: entry.id,
    sleep_hours: entry.sleep_hours,
    sleep_quality: entry.sleep_quality,
    fatigue_level: entry.fatigue_level,
    stress_level: entry.stress_level,
    knee_pain: entry.knee_pain,
    back_pain: entry.back_pain,
    shin_pain: entry.shin_pain,
    shoulder_pain: entry.shoulder_pain,
    strength_index: entry.strength_index,
    endurance_index: entry.aerobic_capacity,
    durability_index: entry.movement_durability,
    training_load: entry.training_load,
    operational_hours: entry.operational_hours,
    high_intensity_exposure: entry.high_intensity_exposure,
    load_carriage_exposure: false,
    capacity_score,
  };
}

/**
 * Fatigue score 0–100 from exposure and fatigue indicators.
 * Formula: (exposureScore * 0.6) + (neuromuscular_fatigue * 20) + (central_fatigue * 20), clamped.
 * Entry fatigue values are 0–10 scale → scale to 0–20 contribution each.
 */
function computeFatigueScore(
  exposureScore: number,
  neuromuscular_fatigue: number,
  central_fatigue: number
): number {
  const raw =
    exposureScore * 0.6 +
    (neuromuscular_fatigue / 10) * 20 +
    (central_fatigue / 10) * 20;
  return clamp(raw, 0, 100);
}

export type MapPoint = {
  id: string;
  readinessScore: number;
  fatigueScore: number;
  exposureScore: number;
  riskLevel: ReadinessResult["riskLevel"];
  capacityBuffer: number;
  readinessStatusColor: ReadinessResult["readinessStatusColor"];
};

/** Get latest entry per ID from entries (by date). */
function getLatestById(entries: ReadinessEntry[]): Map<string, ReadinessEntry> {
  const byId = new Map<string, ReadinessEntry>();
  entries.forEach((e) => {
    const existing = byId.get(e.id);
    if (!existing || e.date > existing.date) byId.set(e.id, e);
  });
  return byId;
}

/**
 * Build map plot data from stored readiness entries.
 * One point per ID (latest entry); includes readiness, fatigue, risk, buffer.
 */
export function getMapDataFromEntries(entries: ReadinessEntry[]): MapPoint[] {
  const latestById = getLatestById(entries);
  const points: MapPoint[] = [];
  latestById.forEach((entry, id) => {
    const input = entryToReadinessInput(entry);
    const result = calculateReadiness(input);
    const fatigueScore = computeFatigueScore(
      result.exposureScore,
      entry.neuromuscular_fatigue,
      entry.central_fatigue
    );
    points.push({
      id,
      readinessScore: Math.round(result.readinessScore * 10) / 10,
      fatigueScore: Math.round(fatigueScore * 10) / 10,
      exposureScore: result.exposureScore,
      riskLevel: result.riskLevel,
      capacityBuffer: result.capacityBuffer,
      readinessStatusColor: result.readinessStatusColor,
    });
  });
  return points.sort((a, b) => {
    const na = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

// ---------------------------------------------------------------------------
// Command Readiness — full algorithm output per ID and trend data
// ---------------------------------------------------------------------------

export type FullReadinessRow = { id: string } & ReadinessResult;

/**
 * Full readiness result per ID (latest entry per ID).
 * Used by Command Readiness page for dial, secondary metrics, risk summary.
 */
export function getFullReadinessFromEntries(entries: ReadinessEntry[]): FullReadinessRow[] {
  const latestById = getLatestById(entries);
  const rows: FullReadinessRow[] = [];
  latestById.forEach((entry, id) => {
    const input = entryToReadinessInput(entry);
    const result = calculateReadiness(input);
    rows.push({ ...result, id: String(id) });
  });
  return rows.sort((a, b) => {
    const na = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

export type TrendDataPoint = { date: string; avgReadiness: number };

/**
 * Average readiness by date for the last N days (from entries).
 * Each date: average of readiness scores from all entries on that date.
 */
export function getReadinessTrendData(
  entries: ReadinessEntry[],
  lastNDays: number
): TrendDataPoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lastNDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const byDate = new Map<string, number[]>();
  entries.forEach((entry) => {
    if (entry.date >= cutoffStr) {
      const input = entryToReadinessInput(entry);
      const result = calculateReadiness(input);
      const list = byDate.get(entry.date) ?? [];
      list.push(result.readinessScore);
      byDate.set(entry.date, list);
    }
  });
  const points: TrendDataPoint[] = [];
  byDate.forEach((scores, date) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    points.push({ date, avgReadiness: Math.round(avg * 10) / 10 });
  });
  return points.sort((a, b) => a.date.localeCompare(b.date));
}
