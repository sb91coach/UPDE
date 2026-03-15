/**
 * Central performance intelligence layer.
 * All modules read/write through this engine; every update triggers recalculateAll().
 */

import {
  loadStrategyGoals,
  saveStrategyGoals,
  addStrategyGoal as addStrategyGoalStore,
  removeStrategyGoal as removeStrategyGoalStore,
  type StrategyGoal,
  type MilestoneProgressEntry,
} from "@/lib/strategyStore";
import { getMacroLogs, getBodyComposition, type DailyMacroLog, type BodyComposition } from "@/lib/nutritionStore";
import {
  calculateExecutionProbabilityDynamic,
  type ExecutionProbabilityResult,
  type KpiSuggestion,
} from "@/lib/goalEngine";
import { emit } from "@/lib/performanceEvents";
import { interpretFeedback, type FeedbackInterpretation } from "@/lib/feedbackInterpreter";

export type ReadinessBreakdown = {
  recovery: number;
  loadBalance: number;
  nutrition: number;
  injury: number;
  sentiment: number;
};

export type ProgrammeInjuryAdjustment = {
  swapExercises: boolean;
  reduceIntensity: boolean;
  showAdjustmentBanner: boolean;
  reason: string | null;
};

export type ProgrammeData = {
  roadmapPhases: { name: string; startWeek: number; endWeek: number }[];
  weeklyTargets: { week: number; volumeKm?: number; focus: string }[];
  injuryAdjusted: boolean;
  volumeCapPercent: number | null;
  foundationExtendedWeeks: number;
};

export type NutritionData = {
  macroLogs: DailyMacroLog[];
  bodyComposition: BodyComposition | null;
  weeklyCalorieTarget: number | null;
  deficitDetected: boolean;
  recoveryRiskFlag: boolean;
};

export type InjuryData = {
  active: boolean;
  severity: "low" | "moderate" | "high" | null;
  type: string | null;
  limitationNotes: string | null;
  sourceGoalId: string | null;
};

export type Metrics = {
  executionProbability: ExecutionProbabilityResult | null;
  injuryRiskScore: number;
  recoveryStatus: "low" | "moderate" | "high";
  performanceForecastSlope: number;
  loadProgressionPercent: number;
  nutritionAlignmentScore: number;
};

export type PerformanceState = {
  goals: StrategyGoal[];
  programmeData: ProgrammeData;
  nutritionData: NutritionData;
  injuryData: InjuryData;
  milestoneProgress: Record<string, MilestoneProgressEntry[]>;
  forecasts: { slope: number; confidence: string }[];
  metrics: Metrics;
  strategicInsights: string[];
  /** Data-driven composite readiness (0–100) */
  readinessComposite: number;
  /** Per-factor breakdown for dial display */
  readinessBreakdown: ReadinessBreakdown;
  /** Last session feedback interpretation (free-text) */
  sessionFeedbackInterpretation: FeedbackInterpretation | null;
  /** Programme adjustment flags when injury detected */
  programmeInjuryAdjustment: ProgrammeInjuryAdjustment;
};

const DEFAULT_PROGRAMME: ProgrammeData = {
  roadmapPhases: [],
  weeklyTargets: [],
  injuryAdjusted: false,
  volumeCapPercent: null,
  foundationExtendedWeeks: 0,
};

const DEFAULT_NUTRITION: NutritionData = {
  macroLogs: [],
  bodyComposition: null,
  weeklyCalorieTarget: null,
  deficitDetected: false,
  recoveryRiskFlag: false,
};

const DEFAULT_INJURY: InjuryData = {
  active: false,
  severity: null,
  type: null,
  limitationNotes: null,
  sourceGoalId: null,
};

const DEFAULT_METRICS: Metrics = {
  executionProbability: null,
  injuryRiskScore: 0,
  recoveryStatus: "moderate",
  performanceForecastSlope: 0,
  loadProgressionPercent: 0,
  nutritionAlignmentScore: 100,
};

const DEFAULT_READINESS_BREAKDOWN: ReadinessBreakdown = {
  recovery: 70,
  loadBalance: 70,
  nutrition: 100,
  injury: 100,
  sentiment: 70,
};

const DEFAULT_PROGRAMME_INJURY_ADJUSTMENT: ProgrammeInjuryAdjustment = {
  swapExercises: false,
  reduceIntensity: false,
  showAdjustmentBanner: false,
  reason: null,
};

/**
 * Dependency matrix (logical):
 * - Milestone deviation increase → execution probability, weekly targets, notify Programme
 * - Injury active → extend foundation, reduce weekly volume, programme adjustments, lower forecast slope
 * - Nutrition deficit → reduce adaptation rate, flag recovery risk
 * - Programme load spike → injury risk probability, roadmap pacing
 */
class PerformanceEngineClass {
  state: PerformanceState = {
    goals: [],
    programmeData: DEFAULT_PROGRAMME,
    nutritionData: DEFAULT_NUTRITION,
    injuryData: DEFAULT_INJURY,
    milestoneProgress: {},
    forecasts: [],
    metrics: DEFAULT_METRICS,
    strategicInsights: [],
    readinessComposite: 70,
    readinessBreakdown: DEFAULT_READINESS_BREAKDOWN,
    sessionFeedbackInterpretation: null,
    programmeInjuryAdjustment: DEFAULT_PROGRAMME_INJURY_ADJUSTMENT,
  };

  private _hydrated = false;

  private hydrate(): void {
    if (this._hydrated) return;
    this.state.goals = loadStrategyGoals();
    this.state.milestoneProgress = {};
    this.state.goals.forEach((g) => {
      if (g.milestoneProgress?.length) this.state.milestoneProgress[g.id] = g.milestoneProgress;
    });
    this.state.nutritionData = {
      ...DEFAULT_NUTRITION,
      macroLogs: getMacroLogs(),
      bodyComposition: getBodyComposition(),
    };
    const activeGoal = this.state.goals.find((g) => g.injuryStatus?.active);
    if (activeGoal?.injuryStatus) {
      this.state.injuryData = {
        active: true,
        severity: activeGoal.injuryStatus.severity ?? null,
        type: activeGoal.injuryStatus.type ?? null,
        limitationNotes: activeGoal.injuryStatus.limitationNotes ?? null,
        sourceGoalId: activeGoal.id,
      };
    } else {
      this.state.injuryData = DEFAULT_INJURY;
    }
    this._hydrated = true;
    this.recalculateAll();
  }

  getState(): PerformanceState {
    this.hydrate();
    return this.state;
  }

  getGoals(): StrategyGoal[] {
    this.hydrate();
    return this.state.goals;
  }

  getProgrammeData(): ProgrammeData {
    this.hydrate();
    return this.state.programmeData;
  }

  getNutritionData(): NutritionData {
    this.hydrate();
    return this.state.nutritionData;
  }

  getInjuryData(): InjuryData {
    this.hydrate();
    return this.state.injuryData;
  }

  getMetrics(): Metrics {
    this.hydrate();
    return this.state.metrics;
  }

  getStrategicInsights(): string[] {
    this.hydrate();
    return this.state.strategicInsights;
  }

  getReadinessComposite(): number {
    this.hydrate();
    return this.state.readinessComposite;
  }

  getReadinessBreakdown(): ReadinessBreakdown {
    this.hydrate();
    return this.state.readinessBreakdown;
  }

  getProgrammeInjuryAdjustment(): ProgrammeInjuryAdjustment {
    this.hydrate();
    return this.state.programmeInjuryAdjustment;
  }

  interpretSessionFeedback(freeText: string): FeedbackInterpretation {
    this.hydrate();
    const interp = interpretFeedback(freeText);
    this.state.sessionFeedbackInterpretation = interp;
    const hasPain = interp.kneePain || interp.shoulderPain || interp.backPain;
    if (hasPain && this.state.goals.length > 0) {
      const area = interp.rawAreas[0] ?? "general";
      this.updateInjury({
        active: true,
        severity: "moderate",
        type: area,
        limitationNotes: freeText.slice(0, 200),
        sourceGoalId: this.state.goals[0].id,
      });
    }
    this.recalculateAll();
    return interp;
  }

  updateGoal(goalId: string, updates: Partial<Omit<StrategyGoal, "id" | "createdAt">>): void {
    this.hydrate();
    const idx = this.state.goals.findIndex((g) => g.id === goalId);
    if (idx < 0) return;
    this.state.goals[idx] = { ...this.state.goals[idx], ...updates };
    saveStrategyGoals(this.state.goals);
    emit("goalUpdated", { goalId, updates });
    this.recalculateAll();
  }

  addGoal(goal: Omit<StrategyGoal, "id" | "createdAt">): StrategyGoal {
    this.hydrate();
    const added = addStrategyGoalStore(goal);
    this.state.goals = loadStrategyGoals();
    emit("goalUpdated", { goalId: added.id, updates: goal });
    this.recalculateAll();
    return added;
  }

  removeGoal(goalId: string): StrategyGoal[] {
    this.hydrate();
    const next = removeStrategyGoalStore(goalId);
    this.state.goals = next;
    emit("goalsReplaced", { goals: next });
    this.recalculateAll();
    return next;
  }

  setGoals(goals: StrategyGoal[]): void {
    this.hydrate();
    this.state.goals = goals;
    saveStrategyGoals(goals);
    emit("goalsReplaced", { goals });
    this.recalculateAll();
  }

  updateMilestone(goalId: string, milestoneProgress: MilestoneProgressEntry[]): void {
    this.hydrate();
    this.state.milestoneProgress[goalId] = milestoneProgress;
    const g = this.state.goals.find((go) => go.id === goalId);
    if (g) {
      g.milestoneProgress = milestoneProgress;
      saveStrategyGoals(this.state.goals);
    }
    emit("milestoneUpdated", { goalId, milestoneProgress });
    this.recalculateAll();
  }

  updateProgramme(data: Partial<ProgrammeData>): void {
    this.hydrate();
    this.state.programmeData = { ...this.state.programmeData, ...data };
    emit("programmeUpdated", this.state.programmeData);
    this.recalculateAll();
  }

  updateNutrition(data: Partial<NutritionData>): void {
    this.hydrate();
    this.state.nutritionData = { ...this.state.nutritionData, ...data };
    emit("nutritionUpdated", this.state.nutritionData);
    this.recalculateAll();
  }

  updateInjury(data: Partial<InjuryData>): void {
    this.hydrate();
    this.state.injuryData = { ...this.state.injuryData, ...data };
    emit("injuryUpdated", this.state.injuryData);
    this.recalculateAll();
  }

  recalculateAll(): void {
    this.hydrate();
    this.calculateExecutionProbability();
    this.calculateInjuryRisk();
    this.calculateRecoveryStatus();
    this.calculatePerformanceForecast();
    this.calculateLoadProgression();
    this.calculateNutritionAlignment();
    this.calculateReadiness();
    this.state.programmeData = this.deriveProgrammeData();
    this.state.injuryData = this.deriveInjuryData();
    this.adjustProgrammeForInjury();
    this.state.strategicInsights = this.generateStrategicInsights();
    emit("stateRecalculated", this.state);
    emit("strategicInsightsUpdated", this.state.strategicInsights);
  }

  private calculateExecutionProbability(): void {
    const selected = this.state.goals[0];
    if (!selected?.roadmap) {
      this.state.metrics.executionProbability = null;
      return;
    }
    const r = selected.roadmap;
    this.state.metrics.executionProbability = calculateExecutionProbabilityDynamic(
      r.totalWeeks,
      r.priority,
      (r.constraints ?? "").length,
      r.kpis,
      {
        injuryActive: selected.injuryStatus?.active,
        injurySeverity: selected.injuryStatus?.severity,
        milestoneDeviations: selected.milestoneProgress?.map((m) => m.deviation ?? 0).filter((d) => d !== 0),
        eventDistanceKm: selected.eventDistance,
      }
    );
  }

  private calculateInjuryRisk(): void {
    if (this.state.injuryData.active && this.state.injuryData.severity === "high") {
      this.state.metrics.injuryRiskScore = 75;
    } else if (this.state.injuryData.active && this.state.injuryData.severity === "moderate") {
      this.state.metrics.injuryRiskScore = 50;
    } else if (this.state.injuryData.active) {
      this.state.metrics.injuryRiskScore = 30;
    } else {
      this.state.metrics.injuryRiskScore = Math.min(25, this.state.metrics.loadProgressionPercent);
    }
  }

  private calculateRecoveryStatus(): void {
    if (this.state.nutritionData.deficitDetected || this.state.nutritionData.recoveryRiskFlag) {
      this.state.metrics.recoveryStatus = "low";
    } else if (this.state.injuryData.active) {
      this.state.metrics.recoveryStatus = "moderate";
    } else {
      this.state.metrics.recoveryStatus = "high";
    }
  }

  private calculatePerformanceForecast(): void {
    let slope = 2;
    if (this.state.injuryData.active) slope -= 0.8;
    if (this.state.nutritionData.deficitDetected) slope -= 0.5;
    const exec = this.state.metrics.executionProbability;
    if (exec && exec.confidenceBand === "low") slope -= 0.5;
    this.state.metrics.performanceForecastSlope = Math.max(0, slope);
    this.state.forecasts = [{ slope: this.state.metrics.performanceForecastSlope, confidence: exec?.confidenceBand ?? "moderate" }];
  }

  private calculateLoadProgression(): void {
    const prog = this.state.programmeData;
    const cap = prog.volumeCapPercent ?? 100;
    this.state.metrics.loadProgressionPercent = Math.min(100, cap);
  }

  private calculateNutritionAlignment(): void {
    const logs = this.state.nutritionData.macroLogs;
    const last7 = logs.slice(-7);
    const avgCal = last7.length ? last7.reduce((s, l) => s + l.calories, 0) / last7.length : 0;
    this.state.nutritionData.deficitDetected = avgCal > 0 && avgCal < 2000;
    this.state.nutritionData.recoveryRiskFlag =
      this.state.nutritionData.deficitDetected || (avgCal > 0 && avgCal < 1800 && !this.state.nutritionData.bodyComposition);
    let score = 100;
    if (this.state.nutritionData.deficitDetected) score -= 25;
    if (this.state.nutritionData.recoveryRiskFlag) score -= 15;
    this.state.metrics.nutritionAlignmentScore = Math.max(0, score);
  }

  calculateReadiness(): void {
    const recovery = this.state.metrics.recoveryStatus === "high" ? 85 : this.state.metrics.recoveryStatus === "moderate" ? 65 : 45;
    const loadBalance = Math.max(0, 100 - this.state.metrics.loadProgressionPercent);
    const nutrition = this.state.metrics.nutritionAlignmentScore;
    const injury = this.state.injuryData.active
      ? (this.state.injuryData.severity === "high" ? 30 : this.state.injuryData.severity === "moderate" ? 50 : 70)
      : 100;
    const feedback = this.state.sessionFeedbackInterpretation;
    const sentiment = feedback?.sentiment === "positive" ? 90 : feedback?.sentiment === "negative" ? 40 : 70;
    this.state.readinessBreakdown = {
      recovery,
      loadBalance,
      nutrition,
      injury,
      sentiment,
    };
    const w = { recovery: 0.25, loadBalance: 0.2, nutrition: 0.2, injury: 0.2, sentiment: 0.15 };
    this.state.readinessComposite = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          recovery * w.recovery +
            loadBalance * w.loadBalance +
            nutrition * w.nutrition +
            injury * w.injury +
            sentiment * w.sentiment
        )
      )
    );
  }

  private adjustProgrammeForInjury(): void {
    const active = this.state.injuryData.active;
    const feedback = this.state.sessionFeedbackInterpretation;
    const hasPainFromFeedback = feedback?.kneePain || feedback?.shoulderPain || feedback?.backPain;
    if (!active && !hasPainFromFeedback) {
      this.state.programmeInjuryAdjustment = DEFAULT_PROGRAMME_INJURY_ADJUSTMENT;
      return;
    }
    const reason = this.state.injuryData.type
      ? `${this.state.injuryData.type} limitation`
      : feedback?.rawAreas?.length
        ? `${feedback.rawAreas.join("/")} pain from feedback`
        : "Injury flagged";
    this.state.programmeInjuryAdjustment = {
      swapExercises: true,
      reduceIntensity: true,
      showAdjustmentBanner: true,
      reason,
    };
  }

  private deriveProgrammeData(): ProgrammeData {
    const g = this.state.goals.find((x) => x.roadmap?.phases?.length);
    if (!g?.roadmap) return { ...this.state.programmeData, roadmapPhases: [], weeklyTargets: [] };
    const injuryActive = g.injuryStatus?.active ?? false;
    const phases = g.roadmap.phases.map((p) => ({ name: p.name, startWeek: p.startWeek, endWeek: p.endWeek }));
    const weeklyTargets = g.roadmap.weeklyTargets ?? [];
    return {
      roadmapPhases: phases,
      weeklyTargets,
      injuryAdjusted: injuryActive,
      volumeCapPercent: injuryActive ? 85 : null,
      foundationExtendedWeeks: injuryActive ? 2 : 0,
    };
  }

  private deriveInjuryData(): InjuryData {
    const active = this.state.goals.find((g) => g.injuryStatus?.active);
    if (!active?.injuryStatus) return DEFAULT_INJURY;
    return {
      active: true,
      severity: active.injuryStatus.severity ?? null,
      type: active.injuryStatus.type ?? null,
      limitationNotes: active.injuryStatus.limitationNotes ?? null,
      sourceGoalId: active.id,
    };
  }

  generateStrategicInsights(): string[] {
    const out: string[] = [];
    const g = this.state.goals[0];
    if (g?.milestoneProgress?.length) {
      const devs = g.milestoneProgress.map((m) => m.deviation ?? 0).filter((d) => d !== 0);
      const avg = devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : 0;
      if (avg > 10) {
        const behind = g.milestoneProgress.filter((m) => (m.deviation ?? 0) > 8);
        behind.forEach((m, i) => out.push(`Milestone ${i + 1} behind by ${Math.round(m.deviation ?? 0)}%`));
      }
    }
    if (this.state.metrics.loadProgressionPercent > 0 && this.state.programmeData.volumeCapPercent != null) {
      const excess = this.state.metrics.loadProgressionPercent - (this.state.programmeData.volumeCapPercent ?? 100);
      if (excess > 10) out.push(`Volume progression exceeds safe threshold by ${Math.round(excess)}%`);
    }
    if (this.state.nutritionData.deficitDetected) {
      out.push("Nutrition deficit may limit peak phase adaptation");
    }
    if (this.state.injuryData.active) {
      out.push("Active injury: foundation extended and volume capped");
    }
    const exec = this.state.metrics.executionProbability;
    if (exec && exec.confidenceBand === "low" && exec.riskDrivers?.length) {
      out.push(`Execution risk: ${exec.riskDrivers[0]}`);
    }
    return out;
  }

  /** Profile snapshot for identity/capacity/recovery breakdown (pass from dashboard). */
  calculateCapacityBreakdown(snapshot: {
    aerobic_score?: number;
    strength_upper?: number;
    strength_lower?: number;
    loadProgressionPercent?: number;
    nutritionAlignmentScore?: number;
  } | null): {
    score: number;
    trend: "up" | "down" | "stable";
    delta: number;
    contributors: { name: string; value: number }[];
    limitingFactor: string | null;
    programmeInfluence: string | null;
  } {
    this.hydrate();
    const a = snapshot?.aerobic_score ?? 60;
    const s = (snapshot?.strength_upper ?? 60 + (snapshot?.strength_lower ?? 60)) / 2;
    const load = snapshot?.loadProgressionPercent ?? this.state.metrics.loadProgressionPercent;
    const nut = snapshot?.nutritionAlignmentScore ?? this.state.metrics.nutritionAlignmentScore;
    const score = Math.round((a * 0.5 + s * 0.5) * 0.6 + (100 - load) * 0.2 + nut * 0.01 * 20);
    const capped = Math.max(0, Math.min(100, score));
    const contributors = [
      { name: "Aerobic", value: a },
      { name: "Strength", value: Math.round(s) },
      { name: "Load balance", value: 100 - load },
      { name: "Nutrition", value: nut },
    ];
    const limiting = nut < 70 ? "Nutrition" : load > 80 ? "Load" : a < s ? "Aerobic" : "Strength";
    const programmeInfluence = this.state.programmeData.injuryAdjusted ? "Volume capped for injury" : "Full programme load";
    return {
      score: capped,
      trend: capped >= 72 ? "up" : capped <= 55 ? "down" : "stable",
      delta: capped >= 72 ? 4 : capped <= 55 ? -3 : 0,
      contributors,
      limitingFactor: limiting,
      programmeInfluence,
    };
  }

  calculateRecoveryBreakdown(snapshot: { sleep_score?: number; stress_level?: number } | null): {
    score: number;
    trend: "up" | "down" | "stable";
    delta: number;
    contributors: { name: string; value: number }[];
    limitingFactor: string | null;
    programmeInfluence: string | null;
  } {
    this.hydrate();
    const rb = this.state.readinessBreakdown;
    const sleep = snapshot?.sleep_score ?? 70;
    const stress = 100 - (snapshot?.stress_level ?? 40);
    const score = Math.round(
      rb.recovery * 0.35 + rb.loadBalance * 0.2 + rb.nutrition * 0.2 + rb.injury * 0.15 + rb.sentiment * 0.1
    );
    const capped = Math.max(0, Math.min(100, score));
    const contributors = [
      { name: "Recovery", value: rb.recovery },
      { name: "Load", value: rb.loadBalance },
      { name: "Nutrition", value: rb.nutrition },
      { name: "Injury", value: rb.injury },
      { name: "Sentiment", value: rb.sentiment },
    ];
    const limiting =
      rb.injury < 60 ? "Injury" : rb.recovery < 60 ? "Recovery" : rb.nutrition < 70 ? "Nutrition" : null;
    return {
      score: capped,
      trend: capped >= 70 ? "up" : capped <= 50 ? "down" : "stable",
      delta: capped >= 70 ? 3 : capped <= 50 ? -4 : 0,
      contributors,
      limitingFactor: limiting,
      programmeInfluence: this.state.injuryData.active ? "Recovery prioritised in programme" : null,
    };
  }

  calculateIdentityProfile(snapshot: {
    aerobic_score?: number;
    strength_upper?: number;
    strength_lower?: number;
    primary_limiter?: string;
    goal?: string;
    focus?: string;
  } | null): {
    score: number;
    trend: "up" | "down" | "stable";
    delta: number;
    contributors: { name: string; value: number }[];
    limitingFactor: string | null;
    programmeInfluence: string | null;
    strengthBiasPercent: number;
    aerobicBiasPercent: number;
    loadTolerance: string;
  } {
    this.hydrate();
    const a = snapshot?.aerobic_score ?? 60;
    const su = snapshot?.strength_upper ?? 60;
    const sl = snapshot?.strength_lower ?? 60;
    const strength = (su + sl) / 2;
    const total = a + strength;
    const strengthBiasPercent = total > 0 ? Math.round((strength / total) * 100) : 50;
    const aerobicBiasPercent = total > 0 ? Math.round((a / total) * 100) : 50;
    const score = Math.round((a * 0.5 + strength * 0.5));
    const loadTolerance =
      this.state.metrics.loadProgressionPercent > 85 ? "Capped" : this.state.metrics.loadProgressionPercent > 60 ? "Moderate" : "High";
    return {
      score: Math.max(0, Math.min(100, score)),
      trend: score >= 70 ? "up" : score <= 50 ? "down" : "stable",
      delta: score >= 70 ? 2 : score <= 50 ? -2 : 0,
      contributors: [
        { name: "Aerobic", value: a },
        { name: "Strength (upper)", value: su },
        { name: "Strength (lower)", value: sl },
      ],
      limitingFactor: snapshot?.primary_limiter ?? null,
      programmeInfluence: this.state.programmeData.roadmapPhases.length ? "Aligned to current phase" : null,
      strengthBiasPercent,
      aerobicBiasPercent,
      loadTolerance,
    };
  }

  calculateTrendDeltas(snapshot: {
    aerobic_score?: number;
    strength_upper?: number;
    strength_lower?: number;
    sleep_score?: number;
    readiness_score?: number;
  } | null): Record<string, number[]> {
    this.hydrate();
    const a = snapshot?.aerobic_score ?? 65;
    const s = ((snapshot?.strength_upper ?? 60) + (snapshot?.strength_lower ?? 60)) / 2;
    const sleep = snapshot?.sleep_score ?? 70;
    const readiness = snapshot?.readiness_score ?? this.state.readinessComposite;
    const gen = (base: number, drift: number) =>
      Array.from({ length: 6 }, (_, i) => Math.max(0, Math.min(100, base + (i - 2) * drift + (i % 2 === 0 ? 1 : -1))));
    return {
      "Aerobic Capacity": gen(a, 1.5),
      "Sleep Quality": gen(sleep, 0.8),
      "Hip Mobility": gen(65, 0.5),
      "Strength (Upper)": gen(snapshot?.strength_upper ?? 60, 1),
      "Strength (Lower)": gen(snapshot?.strength_lower ?? 60, 1),
      "Work Capacity": gen((a + s) / 2, 1.2),
      Recovery: gen(readiness, 1),
      Capacity: gen((a * 0.5 + s * 0.5), 1),
    };
  }

  getDecisionTransparency(snapshot: {
    current_week?: number;
    goal?: string;
    focus?: string;
    primary_limiter?: string;
  } | null): {
    phaseExplanation: string;
    focusExplanation: string;
    capacityReasoning: string;
    riskFlags: string[];
  } {
    this.hydrate();
    const week = snapshot?.current_week ?? 1;
    const phase =
      week <= 2 ? "Accumulation" : week <= 4 ? "Intensification" : week <= 5 ? "Overreach" : "Deload";
    const phaseExplanation = `Week ${week}: ${phase} — ${phase === "Accumulation" ? "Building volume and base." : phase === "Intensification" ? "Increasing intensity and specificity." : phase === "Overreach" ? "Short overload before taper." : "Recovery and consolidation."}`;
    const focusExplanation = snapshot?.goal || snapshot?.focus
      ? `Programme targets ${snapshot.goal || snapshot.focus}. Primary limiter: ${snapshot.primary_limiter ?? "—"}.`
      : "No specific goal set. Set a goal in Strategy to align programme.";
    const cap = this.calculateCapacityBreakdown(null);
    const capacityReasoning = cap.limitingFactor
      ? `Capacity limited by ${cap.limitingFactor}. ${cap.programmeInfluence ?? ""}`
      : `Capacity at ${cap.score}/100. ${cap.programmeInfluence ?? ""}`;
    const riskFlags: string[] = [];
    if (this.state.injuryData.active) riskFlags.push("Active injury");
    if (this.state.nutritionData.deficitDetected) riskFlags.push("Nutrition deficit");
    if (this.state.metrics.injuryRiskScore > 50) riskFlags.push("Elevated injury risk");
    return { phaseExplanation, focusExplanation, capacityReasoning, riskFlags };
  }

  invalidate(): void {
    this._hydrated = false;
  }
}

export const PerformanceEngine = new PerformanceEngineClass();
