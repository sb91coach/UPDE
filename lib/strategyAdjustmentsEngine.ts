/**
 * Strategic adjustments engine: derives high-signal recommendations
 * from injury data, constraint notes, milestone deviation, and risk drivers.
 */

import type { StrategyGoal } from "@/lib/strategyStore";
import type { ExecutionProbabilityResult } from "@/lib/goalEngine";

export type AdjustmentSource = "injury" | "notes" | "deviation" | "risk" | "load" | "category";

export type StrategicAdjustment = {
  id: string;
  title: string;
  recommendation: string;
  rationale: string;
  priority: 1 | 2 | 3;
  source: AdjustmentSource;
};

const LOWER_BODY_KEYWORDS = /\b(lower back|back|spine|lumbar|hip|knee|knees|quad|hamstring|calf|ankle|foot|it band|glute|squat|deadlift|lunges?|running|impact|jumping)\b/i;
const UPPER_BODY_KEYWORDS = /\b(shoulder|elbow|wrist|neck|cervical|bench|press|overhead|row|pull)\b/i;
const LOAD_KEYWORDS = /\b(heavy|load|max|1rm|intensity|weighted|compression)\b/i;
const CARDIO_KEYWORDS = /\b(run|running|volume|mile|km|distance|aerobic|endurance)\b/i;
const SCHEDULE_KEYWORDS = /\b(schedule|busy|work|travel|limited|days? per week|hours?|time)\b/i;
const RECOVERY_KEYWORDS = /\b(recovery|sleep|stress|fatigue|overtraining|rest)\b/i;
const IMPACT_KEYWORDS = /\b(impact|pounding|plyometric|jump|landing)\b/i;

function inferFromInjury(
  type?: string,
  severity?: "low" | "moderate" | "high",
  notes?: string
): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  const t = (type ?? "").toLowerCase();
  const n = (notes ?? "").toLowerCase();
  const combined = `${t} ${n}`;
  const sev = severity ?? "moderate";

  if (sev === "high") {
    out.push({
      id: "inj-sev-high",
      title: "Extend foundation phase",
      recommendation: "Add 2–3 weeks to your foundation phase and keep intensity in the 60–70% range until you have a clear rehab sign-off.",
      rationale: "High-severity injury needs more time to settle before progressive load.",
      priority: 1,
      source: "injury",
    });
    out.push({
      id: "inj-sev-cap",
      title: "Cap weekly progression",
      recommendation: "Limit weekly volume or load increases to 3–5% until you have 2 consecutive weeks pain-free at current load.",
      rationale: "Slower progression reduces re-injury risk and lets you monitor response.",
      priority: 1,
      source: "injury",
    });
  } else if (sev === "moderate") {
    out.push({
      id: "inj-sev-mod",
      title: "Extend foundation by 1–2 weeks",
      recommendation: "Shift 1–2 weeks from Build into Foundation so you can introduce load more gradually.",
      rationale: "Moderate severity benefits from a longer ramp before higher intensity.",
      priority: 1,
      source: "injury",
    });
    out.push({
      id: "inj-mod-rate",
      title: "Reduce weekly volume step-ups",
      recommendation: "Use 5–6% weekly volume increases instead of 8–10% while the injury is active.",
      rationale: "Slightly flatter progression is easier to tolerate and adjust if symptoms flare.",
      priority: 2,
      source: "injury",
    });
  }

  if (LOWER_BODY_KEYWORDS.test(combined)) {
    out.push({
      id: "inj-lower",
      title: "Adjust lower-body loading",
      recommendation: "Prioritise bilateral, controlled movements; reduce or substitute high-impact and heavy axial load (e.g. running, heavy squats/deadlifts) until symptoms allow.",
      rationale: "Your notes mention lower-body or spinal load—programme should respect that until you’re ready to progress.",
      priority: 1,
      source: "injury",
    });
  }
  if (UPPER_BODY_KEYWORDS.test(combined)) {
    out.push({
      id: "inj-upper",
      title: "Modify upper-body intensity",
      recommendation: "Cap pressing and pulling intensity in the Build phase; use tempo and range-of-motion progressions before adding load.",
      rationale: "Upper-body or shoulder/elbow issues respond better to graded exposure than big jumps in load.",
      priority: 1,
      source: "injury",
    });
  }
  if (CARDIO_KEYWORDS.test(combined) && (type ?? notes)) {
    out.push({
      id: "inj-cardio",
      title: "Soft-surface and volume control",
      recommendation: "If running is in the plan, prefer soft surfaces and cap weekly distance increases at 5–8%; consider cross-training to maintain fitness without aggravating the issue.",
      rationale: "Running and distance load are sensitive—your notes suggest tailoring volume and surface to your current capacity.",
      priority: 2,
      source: "injury",
    });
  }
  if (IMPACT_KEYWORDS.test(combined)) {
    out.push({
      id: "inj-impact",
      title: "Defer high-impact work",
      recommendation: "Delay plyometrics and high-impact drills until Foundation is pain-free; substitute with low-impact options in the meantime.",
      rationale: "Impact and landing stress can flare the area you’ve noted—ease back in only when ready.",
      priority: 2,
      source: "injury",
    });
  }
  if (LOAD_KEYWORDS.test(combined)) {
    out.push({
      id: "inj-load",
      title: "Ramp max-effort work slowly",
      recommendation: "Keep top sets at 80–85% for 1–2 weeks longer than planned before introducing 90%+ efforts.",
      rationale: "Heavy and max loads need a conservative build when you’re managing an injury.",
      priority: 2,
      source: "injury",
    });
  }

  if (notes && notes.trim().length > 20 && out.length === 0) {
    out.push({
      id: "inj-notes",
      title: "Use your notes to shape the plan",
      recommendation: "Your limitation notes should drive exercise selection and load: avoid or regress anything that touches on the areas you described until you’re confident they’re ready.",
      rationale: "We’ve used your injury notes to flag this—apply them when choosing exercises and intensity each week.",
      priority: 2,
      source: "injury",
    });
  }

  return out;
}

function inferFromConstraints(constraints?: string, category?: string): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  const c = (constraints ?? "").toLowerCase();
  if (!c.trim()) return out;

  if (SCHEDULE_KEYWORDS.test(c)) {
    out.push({
      id: "con-schedule",
      title: "Match volume to available time",
      recommendation: "Reduce planned sessions or session length so your weekly plan fits your real schedule; protect 1–2 key sessions and treat the rest as optional.",
      rationale: "Your constraints mention schedule or time—programme should be feasible within the hours you have.",
      priority: 1,
      source: "notes",
    });
  }
  if (RECOVERY_KEYWORDS.test(c)) {
    out.push({
      id: "con-recovery",
      title: "Add a recovery buffer",
      recommendation: "Insert a deload or light week every 3–4 weeks, and cap the number of high-intensity sessions per week to 2 until recovery improves.",
      rationale: "You’ve noted recovery, sleep, or stress—building in more recovery helps sustainability.",
      priority: 1,
      source: "notes",
    });
  }
  if (c.length > 80) {
    out.push({
      id: "con-complex",
      title: "Simplify the first block",
      recommendation: "Focus the first 2–3 weeks on a small set of priorities (e.g. one main lift and one conditioning metric) so you can adapt to your constraints without overload.",
      rationale: "Several constraints are in play—starting simple makes it easier to adjust as you go.",
      priority: 2,
      source: "notes",
    });
  }

  return out;
}

function inferFromDeviation(
  milestoneProgress: StrategyGoal["milestoneProgress"],
  milestones: { id: string; label: string; week: number }[]
): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  if (!milestoneProgress?.length) return out;

  const withDev = milestoneProgress.filter((m) => m.deviation != null) as { milestoneId: string; deviation: number }[];
  if (withDev.length === 0) return out;

  const avgDev = withDev.reduce((a, m) => a + m.deviation!, 0) / withDev.length;
  const maxDev = Math.max(...withDev.map((m) => m.deviation!));
  const behindCount = withDev.filter((m) => m.deviation! > 5).length;

  if (avgDev > 15 || maxDev > 20) {
    out.push({
      id: "dev-major",
      title: "Delay peak and add catch-up",
      recommendation: "Shift the start of your peak phase back by 1–2 weeks and add a single recovery microcycle (e.g. one week at ~70% volume) before the next build block.",
      rationale: "Milestone results are meaningfully behind target—a short delay and a recovery week improve the chance of hitting the next checkpoint.",
      priority: 1,
      source: "deviation",
    });
  } else if (avgDev > 10 || behindCount >= 2) {
    out.push({
      id: "dev-moderate",
      title: "Light week before next push",
      recommendation: "Insert one reduced-volume week (about 20% less than planned) before your next intensity block so you can consolidate and then push again.",
      rationale: "A couple of milestones are behind—a brief pullback helps you get back on track without forcing the timeline.",
      priority: 2,
      source: "deviation",
    });
  }

  if (behindCount >= 1 && withDev.length >= 2) {
    out.push({
      id: "dev-review",
      title: "Recheck targets and pacing",
      recommendation: "Review whether your target and weekly progression are still realistic; if you’re consistently behind, consider a small target adjustment or a short deadline extension.",
      rationale: "Repeated deviation suggests the plan may be too aggressive—a small tweak can improve execution.",
      priority: 2,
      source: "deviation",
    });
  }

  return out;
}

function inferFromRisk(execution: ExecutionProbabilityResult | null, totalWeeks: number): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  if (!execution?.riskDrivers?.length) return out;

  if (execution.riskDrivers.some((r) => r.includes("Unrealistic") || r.includes("Aggressive"))) {
    out.push({
      id: "risk-kpi",
      title: "Soften targets or extend deadline",
      recommendation: "Either reduce one or two KPI targets by 5–10%, or extend the goal deadline by 2–4 weeks so weekly required improvement is more achievable.",
      rationale: "Current targets and timeline are flagged as aggressive—a small adjustment improves execution probability.",
      priority: 1,
      source: "risk",
    });
  }
  if (execution.riskDrivers.some((r) => r.includes("Short timeline"))) {
    out.push({
      id: "risk-timeline",
      title: "Prioritise and extend if possible",
      recommendation: totalWeeks < 6
        ? "With very few weeks left, focus on 1–2 non-negotiable outcomes and treat the rest as secondary; if the deadline is flexible, adding 2–4 weeks will help."
        : "Concentrate on the next 1–2 milestones; if you can extend the deadline slightly, do it to reduce time pressure.",
      rationale: "Short timeline is a key risk—narrowing focus or extending the date reduces that pressure.",
      priority: 1,
      source: "risk",
    });
  }
  if (execution.riskDrivers.some((r) => r.includes("Heavy constraints"))) {
    out.push({
      id: "risk-constraints",
      title: "Simplify the plan",
      recommendation: "Strip the programme down to the minimum effective dose: one main focus per phase and fewer optional sessions so constraints don’t derail you.",
      rationale: "Heavy constraints make a complex plan hard to execute—simplifying increases the chance of consistency.",
      priority: 2,
      source: "risk",
    });
  }
  if (execution.riskDrivers.some((r) => r.includes("injury"))) {
    out.push({
      id: "risk-injury",
      title: "Keep injury as the main governor",
      recommendation: "Let pain and tolerance drive progression: only add load or volume when the injury is stable, and pull back as soon as symptoms increase.",
      rationale: "Execution probability is reduced by active injury—prioritising injury response keeps the plan sustainable.",
      priority: 2,
      source: "risk",
    });
  }

  return out;
}

function inferFromLoad(goal: StrategyGoal): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  const dist = goal.eventDistance;
  const totalWeeks = goal.roadmap?.totalWeeks ?? 0;
  const category = goal.category;

  if (dist != null && dist >= 42 && totalWeeks > 0 && totalWeeks < 18) {
    out.push({
      id: "load-marathon",
      title: "Marathon on a short timeline",
      recommendation: "Use a longer foundation (4–5 weeks) and keep weekly distance increases to 8–10% max; plan a 2–3 week taper and avoid back-to-back long runs.",
      rationale: "Marathon distance with limited weeks needs a conservative build and a clear taper.",
      priority: 1,
      source: "load",
    });
  }
  if ((category === "Endurance" || category === "Marathon") && dist != null && dist > 21 && totalWeeks > 0 && totalWeeks < 14) {
    out.push({
      id: "load-half-plus",
      title: "Half-marathon+ with limited time",
      recommendation: "Extend foundation by 1–2 weeks and cap peak weekly volume at 1.2× race distance to reduce injury risk.",
      rationale: "Longer distance with fewer weeks benefits from a steadier build and a volume cap.",
      priority: 2,
      source: "load",
    });
  }
  if (category === "Tactical" && (goal.goalDetails as { loadWeight?: number; loadCarriageDistance?: number } | undefined)?.loadWeight) {
    out.push({
      id: "load-tactical",
      title: "Load carriage progression",
      recommendation: "Progress load and distance separately: fix one variable (e.g. distance) while increasing the other (load), then switch. Avoid increasing both in the same week.",
      rationale: "Staggering load and distance progressions reduces injury risk and improves adaptation.",
      priority: 2,
      source: "load",
    });
  }

  return out;
}

export function getStrategicAdjustments(
  goal: StrategyGoal | null,
  execution: ExecutionProbabilityResult | null
): StrategicAdjustment[] {
  if (!goal) return [];

  const injury = goal.injuryStatus?.active
    ? inferFromInjury(goal.injuryStatus.type, goal.injuryStatus.severity, goal.injuryStatus.limitationNotes)
    : [];
  const notes = inferFromConstraints(goal.roadmap?.constraints, goal.category);
  const deviation = inferFromDeviation(goal.milestoneProgress, goal.roadmap?.milestones ?? []);
  const risk = inferFromRisk(execution, goal.roadmap?.totalWeeks ?? 0);
  const load = inferFromLoad(goal);

  const all = [...injury, ...notes, ...deviation, ...risk, ...load];
  const seen = new Set<string>();
  const deduped = all.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  return deduped.sort((a, b) => a.priority - b.priority);
}
