/**
 * Nutrition data persistence — localStorage only. No external libraries.
 */

export interface DailyMacroLog {
  date: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
}

export interface BodyComposition {
  bodyweight: number;
  bodyFat: number;
  muscleMass: number;
  lastUpdated: string;
  waistCm?: number;
}

const MACRO_LOGS_KEY = "nutrition_macro_logs";
const BODY_COMP_KEY = "nutrition_body_composition";

function safeParse<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function saveMacroLog(log: DailyMacroLog): void {
  const logs = getMacroLogs();
  const idx = logs.findIndex((l) => l.date === log.date);
  const next = idx >= 0 ? logs.map((l, i) => (i === idx ? log : l)) : [...logs, log];
  next.sort((a, b) => a.date.localeCompare(b.date));
  safeSet(MACRO_LOGS_KEY, JSON.stringify(next));
}

export function getMacroLogs(): DailyMacroLog[] {
  const raw = safeParse<DailyMacroLog[] | null>(MACRO_LOGS_KEY, null);
  return Array.isArray(raw) ? raw : [];
}

export function saveBodyComposition(data: BodyComposition): void {
  const withDate = { ...data, lastUpdated: data.lastUpdated || new Date().toISOString().slice(0, 10) };
  safeSet(BODY_COMP_KEY, JSON.stringify(withDate));
}

export function getBodyComposition(): BodyComposition | null {
  const raw = safeParse<BodyComposition | null>(BODY_COMP_KEY, null);
  if (raw == null || typeof raw.bodyweight !== "number") return null;
  return {
    bodyweight: raw.bodyweight,
    bodyFat: typeof raw.bodyFat === "number" ? raw.bodyFat : 0,
    muscleMass: typeof raw.muscleMass === "number" ? raw.muscleMass : raw.bodyweight * 0.9,
    lastUpdated: typeof raw.lastUpdated === "string" ? raw.lastUpdated : new Date().toISOString().slice(0, 10),
    waistCm: typeof raw.waistCm === "number" ? raw.waistCm : undefined,
  };
}
