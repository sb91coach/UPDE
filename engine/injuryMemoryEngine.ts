/**
 * Persistent injury memory engine.
 * Log, update, resolve injuries; classify and calculate risk.
 * Used by guardrails and programme modification.
 */

export type InjuryRiskLevel = "low" | "moderate" | "high";

export type InjuryEntry = {
  id: string;
  profile_id: string;
  body_part: string;
  severity: number;
  context: string | null;
  first_reported: string;
  last_reported: string;
  resolved: boolean;
  resolved_at: string | null;
  classification: string | null;
  risk_level: InjuryRiskLevel;
};

export type InjuryPayload = {
  body_part: string;
  severity: number;
  context?: string | null;
  classification?: string | null;
};

/** Classify injury from context/body part (e.g. tendon irritation, instability, overload). */
export function classifyInjury(context: string, bodyPart?: string): string {
  const c = (context ?? "").toLowerCase();
  const b = (bodyPart ?? "").toLowerCase();
  if (c.includes("tendon") || c.includes("tendin") || b.includes("patella") && c.includes("front")) return "tendon irritation";
  if (c.includes("instab") || c.includes("giving way") || c.includes("buckle")) return "instability";
  if (c.includes("overload") || c.includes("load") || c.includes("volume")) return "overload";
  if (c.includes("stiff") || c.includes("tight")) return "stiffness";
  if (c.includes("sharp") || c.includes("acute")) return "acute irritation";
  return "general discomfort";
}

/**
 * Calculate risk_level from severity (1–10) and optional report count (frequency).
 * Higher severity + more reports → higher risk.
 */
export function calculateInjuryRisk(severity: number, reportCount: number = 1): InjuryRiskLevel {
  const s = Math.max(1, Math.min(10, severity));
  const f = Math.max(1, reportCount);
  const score = (s / 10) * 0.7 + Math.min(1, f / 4) * 0.3;
  if (score >= 0.6) return "high";
  if (score >= 0.35) return "moderate";
  return "low";
}

/** Filter to active (unresolved) injuries. */
export function getActiveInjuries(entries: InjuryEntry[]): InjuryEntry[] {
  return entries.filter((e) => !e.resolved);
}

/** Build payload for logging a new injury (sets first_reported, last_reported, risk_level). */
export function logInjury(payload: InjuryPayload, existingCountForBodyPart: number = 0): Omit<InjuryEntry, "id" | "profile_id"> & { risk_level: InjuryRiskLevel } {
  const now = new Date().toISOString();
  const classification = payload.classification ?? classifyInjury(payload.context ?? "", payload.body_part);
  const risk_level = calculateInjuryRisk(payload.severity, existingCountForBodyPart + 1);
  return {
    body_part: payload.body_part,
    severity: payload.severity,
    context: payload.context ?? null,
    first_reported: now,
    last_reported: now,
    resolved: false,
    resolved_at: null,
    classification,
    risk_level,
  };
}

/** Build payload for updating an injury (e.g. re-report: update last_reported, optionally severity/context). */
export function updateInjury(
  existing: InjuryEntry,
  updates: Partial<Pick<InjuryPayload, "severity" | "context">>,
  reportCount: number
): Partial<InjuryEntry> {
  const now = new Date().toISOString();
  const severity = updates.severity ?? existing.severity;
  const context = updates.context ?? existing.context;
  const classification = updates.context ? classifyInjury(updates.context, existing.body_part) : existing.classification;
  const risk_level = calculateInjuryRisk(severity, reportCount);
  return {
    last_reported: now,
    severity,
    context,
    classification,
    risk_level,
  };
}

/** Build payload for resolving an injury (set resolved, resolved_at). */
export function resolveInjury(): Pick<InjuryEntry, "resolved" | "resolved_at"> {
  const now = new Date().toISOString();
  return {
    resolved: true,
    resolved_at: now,
  };
}
