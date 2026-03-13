/**
 * Behavioural drift engine — track engagement and friction.
 * Session completion, RPE inflation, log detail, missed sessions, neutral sentiment.
 * Outputs friction index, compliance velocity, engagement level, simplification recommendation.
 */

export type ComplianceWeek = {
  week: number;
  done: number;
  planned: number;
};

export type DebriefSummary = {
  how_felt: number;
  niggles: string | null;
  ready_next: number;
};

export type BehaviourDriftInputs = {
  /** Last 2–4 weeks: completed vs planned sessions per week */
  compliance_weeks?: ComplianceWeek[];
  /** Recent debriefs (e.g. last 5–10) for sentiment and log detail */
  recent_debriefs?: DebriefSummary[];
  /** Optional: average perceived RPE vs prescribed (e.g. 7.2 vs 7) → inflation if actual > prescribed */
  rpe_inflation?: number; // e.g. 0.2 = 0.2 higher on average
};

export type ComplianceVelocity = "rising" | "stable" | "falling";
export type EngagementLevel = "high" | "moderate" | "low";

export type BehaviourDriftOutput = {
  frictionIndex: number;
  complianceVelocity: ComplianceVelocity;
  engagementLevel: EngagementLevel;
  simplificationRecommended: boolean;
};

const NEUTRAL_KEYWORDS = ["ok", "fine", "same", "n/a", "none", "—", "-", ""];

function isNeutralNiggles(niggles: string | null): boolean {
  if (!niggles || !niggles.trim()) return true;
  const t = niggles.trim().toLowerCase();
  return NEUTRAL_KEYWORDS.some((k) => t === k || t.startsWith(k + " ") || t.endsWith(" " + k));
}

function isNeutralSentiment(how_felt: number, ready_next: number): boolean {
  return how_felt >= 2.5 && how_felt <= 3.5 && ready_next >= 2.5 && ready_next <= 3.5;
}

/**
 * Compute compliance velocity from last weeks vs previous weeks.
 */
function getComplianceVelocity(weeks: ComplianceWeek[]): ComplianceVelocity {
  if (weeks.length < 2) return "stable";
  const recent = weeks.slice(0, 2);
  const older = weeks.slice(2, 4);
  const recentRate =
    recent.reduce((s, w) => s + w.done, 0) / Math.max(1, recent.reduce((s, w) => s + w.planned, 0));
  const olderRate =
    older.length === 0
      ? recentRate
      : older.reduce((s, w) => s + w.done, 0) / Math.max(1, older.reduce((s, w) => s + w.planned, 0));
  const delta = recentRate - olderRate;
  if (delta > 0.1) return "rising";
  if (delta < -0.1) return "falling";
  return "stable";
}

/**
 * Friction index 0–100 from compliance, debrief detail, sentiment, and consecutive misses.
 */
function getFrictionIndex(inputs: BehaviourDriftInputs): number {
  let score = 0;
  const weeks = inputs.compliance_weeks ?? [];
  const debriefs = inputs.recent_debriefs ?? [];

  if (weeks.length > 0) {
    const totalDone = weeks.reduce((s, w) => s + w.done, 0);
    const totalPlanned = weeks.reduce((s, w) => s + w.planned, 0);
    const compliance = totalPlanned > 0 ? totalDone / totalPlanned : 1;
    score += (1 - compliance) * 40;
    const consecutiveMissed = weeks.filter((w) => w.planned > 0 && w.done < w.planned * 0.5).length;
    score += Math.min(20, consecutiveMissed * 8);
  }

  if (debriefs.length > 0) {
    const shortDetail = debriefs.filter((d) => (d.niggles?.length ?? 0) < 4).length;
    score += (shortDetail / debriefs.length) * 15;
    const neutral = debriefs.filter((d) => isNeutralSentiment(d.how_felt, d.ready_next) && isNeutralNiggles(d.niggles)).length;
    score += (neutral / debriefs.length) * 15;
  }

  if (inputs.rpe_inflation != null && inputs.rpe_inflation > 0) {
    score += Math.min(10, inputs.rpe_inflation * 20);
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Engagement level from friction and compliance velocity.
 */
function getEngagementLevel(frictionIndex: number, complianceVelocity: ComplianceVelocity): EngagementLevel {
  if (frictionIndex >= 55 || complianceVelocity === "falling") return "low";
  if (frictionIndex >= 35 || complianceVelocity === "stable") return "moderate";
  return "high";
}

/**
 * Single entry point: compute behaviour drift output.
 */
export function getBehaviourDrift(inputs: BehaviourDriftInputs): BehaviourDriftOutput {
  const weeks = inputs.compliance_weeks ?? [];
  const frictionIndex = getFrictionIndex(inputs);
  const complianceVelocity = getComplianceVelocity(weeks);
  const engagementLevel = getEngagementLevel(frictionIndex, complianceVelocity);
  const simplificationRecommended = frictionIndex >= 50 || engagementLevel === "low";

  return {
    frictionIndex,
    complianceVelocity,
    engagementLevel,
    simplificationRecommended,
  };
}
