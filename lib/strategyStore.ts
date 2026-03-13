import type { GoalRoadmapResult } from "@/lib/goalEngine";

export type RoadmapData = GoalRoadmapResult;

export type MilestoneProgressEntry = {
  milestoneId: string;
  completed: boolean;
  actualValue?: number;
  deviation?: number;
};

export type InjuryStatus = {
  active: boolean;
  type?: string;
  severity?: "low" | "moderate" | "high";
  limitationNotes?: string;
};

export interface StrategyGoal {
  id: string;
  title: string;
  category: string;
  deadline: string;
  eventDistance?: number;
  injuryStatus?: InjuryStatus;
  milestoneProgress?: MilestoneProgressEntry[];
  goalDetails?: unknown;
  roadmap: RoadmapData;
  createdAt: string;
}

const STORAGE_KEY = "upde_strategy_goals";

export function loadStrategyGoals(): StrategyGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((g) => migrateGoal(g as Record<string, unknown>)).filter((g): g is StrategyGoal => g != null);
  } catch {
    return [];
  }
}

function migrateGoal(g: Record<string, unknown>): StrategyGoal | null {
  const roadmap = g.roadmap && typeof g.roadmap === "object" && Array.isArray((g.roadmap as RoadmapData).phases)
    ? (g.roadmap as RoadmapData)
    : null;
  if (!roadmap) return null;
  return {
    id: typeof g.id === "string" ? g.id : crypto.randomUUID(),
    title: typeof g.title === "string" ? g.title : "Goal",
    category: typeof g.category === "string" ? g.category : "Custom",
    deadline: typeof g.deadline === "string" ? g.deadline : new Date().toISOString().slice(0, 10),
    eventDistance: typeof g.eventDistance === "number" ? g.eventDistance : undefined,
    injuryStatus: g.injuryStatus && typeof g.injuryStatus === "object" ? (g.injuryStatus as InjuryStatus) : undefined,
    milestoneProgress: Array.isArray(g.milestoneProgress) ? (g.milestoneProgress as MilestoneProgressEntry[]) : undefined,
    goalDetails: g.goalDetails,
    roadmap,
    createdAt: typeof g.createdAt === "string" ? g.createdAt : new Date().toISOString(),
  };
}

export function saveStrategyGoals(goals: StrategyGoal[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch {
    // ignore
  }
}

export function addStrategyGoal(goal: Omit<StrategyGoal, "id" | "createdAt">): StrategyGoal {
  const full: StrategyGoal = {
    ...goal,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const goals = loadStrategyGoals();
  goals.push(full);
  saveStrategyGoals(goals);
  return full;
}

export function removeStrategyGoal(id: string): StrategyGoal[] {
  const goals = loadStrategyGoals().filter((g) => g.id !== id);
  saveStrategyGoals(goals);
  return goals;
}

export function getStrategyGoals(): StrategyGoal[] {
  return loadStrategyGoals();
}

export function setStrategyGoals(goals: StrategyGoal[]): void {
  saveStrategyGoals(goals);
}

export function updateStrategyGoal(id: string, updates: Partial<Omit<StrategyGoal, "id" | "createdAt">>): StrategyGoal | null {
  const goals = loadStrategyGoals();
  const idx = goals.findIndex((g) => g.id === id);
  if (idx < 0) return null;
  goals[idx] = { ...goals[idx], ...updates };
  saveStrategyGoals(goals);
  return goals[idx];
}
