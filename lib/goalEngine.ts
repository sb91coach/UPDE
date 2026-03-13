/**
 * Goal Roadmap Engine — phases, milestones, weekly targets, KPIs from goal input.
 */

export type Phase = {
  id: string;
  name: string;
  startWeek: number;
  endWeek: number;
  description: string;
};

export type Milestone = {
  id: string;
  label: string;
  percent: number;
  week: number;
  targetDescription: string;
};

export type WeeklyTarget = {
  week: number;
  focus: string;
  targetValue?: number;
  unit?: string;
  volumeKm?: number;
};

export type KpiSuggestion = {
  id: string;
  name: string;
  unit: string;
  currentValue: number | null;
  targetValue: number;
  ratePerWeek: number;
  risk: "green" | "amber" | "red";
};

/** Current benchmark values (e.g. from profile) for tracking. */
export type CurrentBenchmarks = {
  back_squat?: number | null;
  bench_press?: number | null;
  deadlift?: number | null;
  overhead_press?: number | null;
  two_mile_time_sec?: number | null;
  [key: string]: number | null | undefined;
};

/** User-specified targets for weightlifting or time-based goals. */
export type TargetAchievements = {
  squat_kg?: number;
  bench_kg?: number;
  deadlift_kg?: number;
  overhead_press_kg?: number;
  target_time_sec?: number;
  target_time_label?: string;
};

export type GoalDetails = {
  currentValue?: number;
  targetValue?: number;
  distance?: number;
  currentTime?: number;
  targetTime?: number;
  currentBodyweight?: number;
  targetBodyweight?: number;
  currentBodyFat?: number;
  targetBodyFat?: number;
  leanMass?: number;
  primaryLift?: string;
  current1RM?: number;
  target1RM?: number;
  primaryKpi?: string;
  skillType?: string;
  currentProficiency?: number;
  targetProficiency?: number;
  loadCarriageDistance?: number;
  loadWeight?: number;
  weeklyVolumeKm?: number;
  longRunBaselineKm?: number;
  customKpiName?: string;
  [key: string]: unknown;
};

export type GoalRoadmapInput = {
  goalTitle: string;
  category: string;
  deadline: string;
  priority: string;
  constraints?: string;
  targetAchievements?: TargetAchievements;
  currentBenchmarks?: CurrentBenchmarks | null;
  eventDistance?: number;
  injuryStatus?: { active: boolean; severity?: "low" | "moderate" | "high" };
  goalDetails?: GoalDetails;
};

export type GoalRoadmapResult = {
  goalTitle: string;
  deadline: string;
  phases: Phase[];
  milestones: Milestone[];
  weeklyTargets: WeeklyTarget[];
  kpis: KpiSuggestion[];
  totalWeeks: number;
  priority: string;
  constraints?: string;
  goalDetails?: GoalDetails;
};

const CATEGORY_KPIS: Record<string, { name: string; unit: string; targetDelta: number }[]> = {
  Performance: [
    { name: "PPS", unit: "%", targetDelta: 12 },
    { name: "Velocity", unit: "%", targetDelta: 8 },
    { name: "VO2 proxy", unit: "mL/kg/min", targetDelta: 4 },
  ],
  "Body Composition": [
    { name: "Body fat", unit: "%", targetDelta: -3 },
    { name: "Lean mass", unit: "kg", targetDelta: 2 },
  ],
  Strength: [
    { name: "Squat 1RM", unit: "kg", targetDelta: 15 },
    { name: "Bench 1RM", unit: "kg", targetDelta: 10 },
    { name: "Deadlift 1RM", unit: "kg", targetDelta: 20 },
    { name: "Overhead 1RM", unit: "kg", targetDelta: 8 },
  ],
  Endurance: [
    { name: "Threshold pace", unit: "/km", targetDelta: -15 },
    { name: "Long duration", unit: "sec", targetDelta: 1800 },
  ],
  Marathon: [
    { name: "Threshold pace", unit: "/km", targetDelta: -15 },
    { name: "Long duration", unit: "sec", targetDelta: 1800 },
  ],
  Skill: [
    { name: "Skill score", unit: "pts", targetDelta: 20 },
    { name: "Consistency", unit: "%", targetDelta: 15 },
  ],
  Tactical: [
    { name: "Load carriage", unit: "kg·km", targetDelta: 25 },
    { name: "Work capacity", unit: "pts", targetDelta: 18 },
  ],
  Custom: [
    { name: "Primary metric", unit: "units", targetDelta: 10 },
    { name: "Secondary metric", unit: "units", targetDelta: 5 },
  ],
};

function getPhases(totalWeeks: number): Phase[] {
  if (totalWeeks <= 4) {
    return [
      { id: "p1", name: "Foundation", startWeek: 1, endWeek: totalWeeks, description: "Base building and assessment." },
    ];
  }
  if (totalWeeks <= 8) {
    return [
      { id: "p1", name: "Foundation", startWeek: 1, endWeek: Math.floor(totalWeeks * 0.35), description: "Establish baseline and habits." },
      { id: "p2", name: "Build", startWeek: Math.floor(totalWeeks * 0.35) + 1, endWeek: Math.floor(totalWeeks * 0.7), description: "Progressive overload and volume." },
      { id: "p3", name: "Peak", startWeek: Math.floor(totalWeeks * 0.7) + 1, endWeek: totalWeeks, description: "Peak performance and taper." },
    ];
  }
  const f = Math.floor(totalWeeks * 0.2);
  const b = Math.floor(totalWeeks * 0.45);
  const p = Math.floor(totalWeeks * 0.75);
  return [
    { id: "p1", name: "Foundation", startWeek: 1, endWeek: f, description: "Base building, screening, and capacity." },
    { id: "p2", name: "Build", startWeek: f + 1, endWeek: b, description: "Structured progression and volume." },
    { id: "p3", name: "Peak", startWeek: b + 1, endWeek: p, description: "Intensity and specificity." },
    { id: "p4", name: "Consolidate", startWeek: p + 1, endWeek: totalWeeks, description: "Refinement and readiness." },
  ];
}

function getMilestones(totalWeeks: number): Milestone[] {
  return [
    { id: "m1", label: "25%", percent: 25, week: Math.max(1, Math.floor(totalWeeks * 0.25)), targetDescription: "First checkpoint — baseline reassessment." },
    { id: "m2", label: "50%", percent: 50, week: Math.max(1, Math.floor(totalWeeks * 0.5)), targetDescription: "Midpoint — progress review and taper check." },
    { id: "m3", label: "75%", percent: 75, week: Math.max(1, Math.floor(totalWeeks * 0.75)), targetDescription: "Peak phase — final intensity block." },
    { id: "m4", label: "100%", percent: 100, week: totalWeeks, targetDescription: "Goal deadline — event or target day." },
  ];
}

function getWeeklyTargets(totalWeeks: number, category: string): WeeklyTarget[] {
  const out: WeeklyTarget[] = [];
  const focuses = ["Volume", "Intensity", "Recovery", "Skill", "Assessment"];
  for (let w = 1; w <= totalWeeks; w++) {
    out.push({
      week: w,
      focus: focuses[(w - 1) % focuses.length],
      targetValue: w * 2,
      unit: category === "Strength" ? "kg" : "%",
    });
  }
  return out;
}

/**
 * Required weekly volume progression (km) for distance-based events.
 * Taper in final 2–3 weeks.
 */
export function calculateVolumeProgression(distanceKm: number, weeksRemaining: number): { week: number; volumeKm: number }[] {
  if (weeksRemaining < 1) return [];
  const taperWeeks = Math.min(3, Math.max(2, Math.floor(weeksRemaining * 0.15)));
  const buildWeeks = weeksRemaining - taperWeeks;
  if (buildWeeks < 1) return [];
  const baseWeekly = distanceKm * 0.4;
  const peakWeekly = distanceKm * 1.2;
  const progression = (peakWeekly - baseWeekly) / Math.max(buildWeeks - 1, 1);
  const out: { week: number; volumeKm: number }[] = [];
  for (let w = 1; w <= weeksRemaining; w++) {
    if (w <= buildWeeks) {
      out.push({ week: w, volumeKm: Math.round((baseWeekly + (w - 1) * progression) * 10) / 10 });
    } else {
      const taperProgress = (w - buildWeeks) / taperWeeks;
      out.push({ week: w, volumeKm: Math.round((peakWeekly * (1 - taperProgress * 0.5)) * 10) / 10 });
    }
  }
  return out;
}

function getPhasesWithDistance(totalWeeks: number, eventDistanceKm: number): Phase[] {
  const taperWeeks = Math.min(3, Math.max(2, Math.floor(totalWeeks * 0.15)));
  if (eventDistanceKm < 10) {
    const foundEnd = Math.min(2, Math.max(1, totalWeeks - 2));
    const buildEnd = Math.max(foundEnd + 1, totalWeeks - taperWeeks);
    return [
      { id: "p1", name: "Foundation", startWeek: 1, endWeek: foundEnd, description: "Short base." },
      { id: "p2", name: "Build", startWeek: foundEnd + 1, endWeek: buildEnd, description: "Build to race." },
      { id: "p3", name: "Taper", startWeek: buildEnd + 1, endWeek: totalWeeks, description: "Taper." },
    ];
  }
  if (eventDistanceKm <= 21.1) {
    const f = Math.floor(totalWeeks * 0.25);
    const b = Math.floor(totalWeeks * 0.6);
    return [
      { id: "p1", name: "Foundation", startWeek: 1, endWeek: f, description: "Base building." },
      { id: "p2", name: "Build", startWeek: f + 1, endWeek: b, description: "Progressive volume." },
      { id: "p3", name: "Peak", startWeek: b + 1, endWeek: totalWeeks - taperWeeks, description: "Peak load." },
      { id: "p4", name: "Taper", startWeek: totalWeeks - taperWeeks + 1, endWeek: totalWeeks, description: "Taper 2–3 weeks." },
    ];
  }
  const f = Math.floor(totalWeeks * 0.3);
  const b = Math.floor(totalWeeks * 0.55);
  const p = Math.floor(totalWeeks * 0.8);
  return [
    { id: "p1", name: "Foundation", startWeek: 1, endWeek: f, description: "Extended foundation." },
    { id: "p2", name: "Build", startWeek: f + 1, endWeek: b, description: "Progressive overload." },
    { id: "p3", name: "Peak", startWeek: b + 1, endWeek: p, description: "Peak phase." },
    { id: "p4", name: "Taper", startWeek: p + 1, endWeek: totalWeeks, description: "Taper." },
  ];
}

function riskFromRate(ratePerWeek: number, priority: string): "green" | "amber" | "red" {
  const aggressive = Math.abs(ratePerWeek);
  if (aggressive > 3 && priority !== "High") return "red";
  if (aggressive > 2) return "amber";
  return "green";
}

export function generateGoalRoadmap(input: GoalRoadmapInput): GoalRoadmapResult {
  const { goalTitle, category, deadline, priority } = input;
  const end = new Date(deadline);
  const start = new Date();
  let totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));

  const gd = input.goalDetails;
  const eventDistanceKm = input.eventDistance ?? gd?.distance;
  const isDistanceCategory = (category === "Endurance" || category === "Tactical" || category === "Marathon") && eventDistanceKm != null && eventDistanceKm > 0;
  const injuryActive = input.injuryStatus?.active === true;

  let phases = isDistanceCategory && eventDistanceKm
    ? getPhasesWithDistance(totalWeeks, eventDistanceKm)
    : getPhases(totalWeeks);

  if (injuryActive && phases.length > 0) {
    const foundation = phases[0];
    const extendBy = Math.max(1, Math.floor((foundation.endWeek - foundation.startWeek + 1) * 0.15));
    const newEnd = Math.min(foundation.endWeek + extendBy, totalWeeks);
    const shift = newEnd - foundation.endWeek;
    phases = [
      { ...foundation, endWeek: newEnd, description: foundation.description + " Extended for injury management." },
      ...phases.slice(1).map((p) => ({
        ...p,
        startWeek: p.startWeek + shift,
        endWeek: Math.min(p.endWeek + shift, totalWeeks),
      })),
    ];
  }

  const milestones = getMilestones(totalWeeks);
  let weeklyTargets = getWeeklyTargets(totalWeeks, category);

  if (isDistanceCategory && eventDistanceKm) {
    const volProgression = calculateVolumeProgression(eventDistanceKm, totalWeeks);
    const volMap = new Map(volProgression.map((v) => [v.week, v.volumeKm]));
    weeklyTargets = weeklyTargets.map((wt) => ({
      ...wt,
      volumeKm: volMap.get(wt.week),
    }));
  }

  const targets = input.targetAchievements;
  const current = input.currentBenchmarks;
  const kpiTemplates = CATEGORY_KPIS[category] ?? CATEGORY_KPIS.Custom;

  const strengthMap: Record<string, { key: string; target?: number }> = {
    "Squat 1RM": { key: "back_squat", target: targets?.squat_kg },
    "Bench 1RM": { key: "bench_press", target: targets?.bench_kg },
    "Deadlift 1RM": { key: "deadlift", target: targets?.deadlift_kg },
    "Overhead 1RM": { key: "overhead_press", target: targets?.overhead_press_kg },
  };
  const enduranceCurrent = gd?.currentTime ?? current?.two_mile_time_sec;
  const enduranceTarget = gd?.targetTime ?? targets?.target_time_sec;
  const isTimeCategory = category === "Endurance" || category === "Marathon";

  const kpis: KpiSuggestion[] = kpiTemplates.map((t, i) => {
    let targetValue: number;
    let currentValue: number | null = null;
    if (category === "Strength" && strengthMap[t.name]) {
      const { key, target } = strengthMap[t.name];
      targetValue = target ?? gd?.target1RM ?? (70 + t.targetDelta + i * 5);
      const cur = current?.[key];
      currentValue = (gd?.current1RM != null ? gd.current1RM : cur != null && cur > 0 ? cur : null) as number | null;
    } else if (category === "Body Composition" && (t.name === "Body fat" || t.name === "Lean mass")) {
      targetValue = t.name === "Body fat" ? (gd?.targetBodyFat ?? 70 + t.targetDelta) : (gd?.targetBodyweight ?? 70 + t.targetDelta);
      currentValue = t.name === "Body fat" ? (gd?.currentBodyFat ?? null) : (gd?.currentBodyweight ?? null);
    } else if (gd?.targetValue != null && (category === "Performance" || category === "Custom" || (category === "Skill" && t.name === "Skill score"))) {
      targetValue = category === "Skill" ? (gd?.targetProficiency ?? gd.targetValue) : gd.targetValue;
      currentValue = category === "Skill" ? (gd?.currentProficiency ?? gd.currentValue ?? null) : (gd.currentValue ?? null);
    } else if (isTimeCategory && t.name === "Long duration" && t.unit === "sec") {
      targetValue = enduranceTarget ?? 3600 + t.targetDelta;
      currentValue = enduranceCurrent ?? null;
    } else if (isTimeCategory && (t.name === "Threshold pace" || t.name === "Long duration")) {
      targetValue = enduranceTarget ? Math.round(enduranceTarget / 60) : 70 + t.targetDelta;
      currentValue = enduranceCurrent != null ? Math.round(enduranceCurrent / 60) : null;
    } else if (category === "Tactical" && gd?.targetTime != null) {
      targetValue = Math.round((gd.targetTime ?? 0) / 60);
      currentValue = gd.currentTime != null ? Math.round(gd.currentTime / 60) : null;
    } else {
      targetValue = gd?.targetValue ?? 70 + t.targetDelta + i * 5;
      currentValue = gd?.currentValue ?? 70 + i * 3;
    }
    const effectiveCurrent = currentValue ?? targetValue - t.targetDelta - i * 2;
    const ratePerWeek = totalWeeks > 0 ? (targetValue - effectiveCurrent) / totalWeeks : 0;
    return {
      id: `kpi-${i}`,
      name: t.name,
      unit: t.unit,
      currentValue,
      targetValue,
      ratePerWeek: Math.round(ratePerWeek * 100) / 100,
      risk: riskFromRate(ratePerWeek, priority),
    };
  });

  return {
    goalTitle: input.goalTitle,
    deadline: input.deadline,
    phases,
    milestones,
    weeklyTargets,
    kpis,
    totalWeeks,
    priority,
    constraints: input.constraints,
    goalDetails: input.goalDetails,
  };
}

export function calculateExecutionProbability(
  totalWeeks: number,
  priority: string,
  constraintsLength: number,
  kpis: KpiSuggestion[]
): { percentage: number; band: "low" | "medium" | "high" } {
  let p = 70;
  if (totalWeeks >= 12) p += 10;
  else if (totalWeeks >= 8) p += 5;
  else if (totalWeeks < 4) p -= 15;
  if (priority === "High") p += 5;
  if (priority === "Low") p -= 5;
  if (constraintsLength > 50) p -= 10;
  const redCount = kpis.filter((k) => k.risk === "red").length;
  const amberCount = kpis.filter((k) => k.risk === "amber").length;
  p -= redCount * 8;
  p -= amberCount * 3;
  p = Math.max(0, Math.min(100, p));
  const band = p >= 75 ? "high" : p >= 50 ? "medium" : "low";
  return { percentage: Math.round(p), band };
}

export type ExecutionProbabilityResult = {
  score: number;
  confidenceBand: "low" | "moderate" | "high";
  riskDrivers: string[];
};

export function calculateExecutionProbabilityDynamic(
  totalWeeks: number,
  priority: string,
  constraintsLength: number,
  kpis: KpiSuggestion[],
  options?: {
    injurySeverity?: "low" | "moderate" | "high";
    injuryActive?: boolean;
    milestoneDeviations?: number[];
    eventDistanceKm?: number;
    historicalPpsTrend?: number;
  }
): ExecutionProbabilityResult {
  const riskDrivers: string[] = [];
  let p = 70;

  if (totalWeeks >= 12) p += 10;
  else if (totalWeeks >= 8) p += 5;
  else if (totalWeeks < 4) {
    p -= 15;
    riskDrivers.push("Short timeline");
  }
  if (priority === "High") p += 5;
  if (priority === "Low") {
    p -= 5;
    riskDrivers.push("Low priority");
  }
  if (constraintsLength > 50) {
    p -= 10;
    riskDrivers.push("Heavy constraints");
  }

  const redCount = kpis.filter((k) => k.risk === "red").length;
  const amberCount = kpis.filter((k) => k.risk === "amber").length;
  p -= redCount * 8;
  p -= amberCount * 3;
  if (redCount > 0) riskDrivers.push("Unrealistic KPI targets");
  if (amberCount > 0) riskDrivers.push("Aggressive progression");

  if (options?.injuryActive) {
    const sev = options.injurySeverity ?? "moderate";
    if (sev === "high") {
      p -= 20;
      riskDrivers.push("Active injury (high severity)");
    } else if (sev === "moderate") {
      p -= 12;
      riskDrivers.push("Active injury (moderate)");
    } else {
      p -= 5;
      riskDrivers.push("Active injury (low)");
    }
  }

  if (options?.milestoneDeviations?.length) {
    const avgDev = options.milestoneDeviations.reduce((a, b) => a + b, 0) / options.milestoneDeviations.length;
    if (avgDev > 15) {
      p -= 15;
      riskDrivers.push("Milestone deviation >15%");
    } else if (avgDev > 10) {
      p -= 8;
      riskDrivers.push("Milestone deviation >10%");
    }
  }

  if (options?.eventDistanceKm != null && options.eventDistanceKm >= 42) {
    p -= 5;
    riskDrivers.push("Marathon+ distance load");
  }

  if (options?.historicalPpsTrend != null && options.historicalPpsTrend < 0) {
    p -= 5;
    riskDrivers.push("Declining PPS trend");
  }

  p = Math.max(0, Math.min(100, p));
  const confidenceBand = p >= 75 ? "high" : p >= 50 ? "moderate" : "low";
  return { score: Math.round(p), confidenceBand, riskDrivers };
}
