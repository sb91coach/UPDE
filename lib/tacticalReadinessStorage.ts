/**
 * Tactical Readiness Entry — flat structure for input form and radar.
 * Used by /app/tactical/input and /app/tactical/radar.
 */

export const TACTICAL_READINESS_STORAGE_KEY = "tactical-readiness-entries";

export type ReadinessEntry = {
  id: string;
  date: string;
  sleep_hours: number;
  sleep_quality: number;
  fatigue_level: number;
  stress_level: number;
  knee_pain: number;
  back_pain: number;
  shin_pain: number;
  shoulder_pain: number;
  hip_pain: number;
  ankle_pain: number;
  elbow_pain: number;
  neck_pain: number;
  muscle_tightness: number;
  joint_stiffness: number;
  tendon_irritation: number;
  movement_restriction: number;
  strength_index: number;
  explosive_power: number;
  neuromuscular_readiness: number;
  aerobic_capacity: number;
  movement_durability: number;
  coordination_quality: number;
  neuromuscular_fatigue: number;
  central_fatigue: number;
  training_load: number;
  operational_hours: number;
  high_intensity_exposure: boolean;
  external_workload: "light" | "moderate" | "heavy";
};

export function loadReadinessEntries(): ReadinessEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TACTICAL_READINESS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveReadinessEntries(entries: ReadinessEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TACTICAL_READINESS_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

/** Get unique ID labels from stored entries (e.g. ["ID 1", "ID 2"]). */
export function getStoredIdList(entries: ReadinessEntry[]): string[] {
  const set = new Set<string>();
  entries.forEach((e) => set.add(e.id));
  return Array.from(set).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

export type PillarScores = {
  recovery: number;
  structuralIntegrity: number;
  strengthCapacity: number;
  aerobicCapacity: number;
  movementDurability: number;
};

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

/** Compute the five radar pillars (0–100) from a single readiness entry. */
export function getPillarScoresFromEntry(entry: ReadinessEntry): PillarScores {
  const sleepContrib = (entry.sleep_hours / 8) * 40;
  const qualityContrib = (entry.sleep_quality / 5) * 30;
  const fatiguePenalty = (entry.fatigue_level / 5) * 15;
  const stressPenalty = (entry.stress_level / 5) * 15;
  const recovery = clamp(sleepContrib + qualityContrib - fatiguePenalty - stressPenalty, 0, 100);

  const painTotal =
    entry.knee_pain +
    entry.back_pain +
    entry.shin_pain +
    entry.shoulder_pain +
    entry.hip_pain +
    entry.ankle_pain +
    entry.elbow_pain +
    entry.neck_pain;
  const tissueTotal =
    entry.muscle_tightness +
    entry.joint_stiffness +
    entry.tendon_irritation +
    entry.movement_restriction;
  const structuralIntegrity = clamp(100 - (painTotal / 8) * 12 - (tissueTotal / 4) * 10, 0, 100);

  const strengthCapacity =
    (entry.strength_index + entry.explosive_power + entry.neuromuscular_readiness) / 3;
  const aerobicCapacity = entry.aerobic_capacity;
  const movementDurability = (entry.movement_durability + entry.coordination_quality) / 2;

  return {
    recovery,
    structuralIntegrity,
    strengthCapacity,
    aerobicCapacity,
    movementDurability,
  };
}
