/**
 * Minimal "today's session" summary for the dashboard.
 * Derives phase, adaptation, and a single session card line without duplicating full buildSession.
 */

const PHASES = [
  "Accumulation",
  "Accumulation",
  "Intensification",
  "Intensification",
  "Overreach",
  "Deload",
];

export type TodaySessionSummary = {
  sessionTitle: string;
  duration: string;
  intensity: string;
  exercisesCount: number;
  detail: string;
};

type ProfileInput = {
  current_week?: number | null;
  days_per_week?: number | null;
  minutes_per_session?: number | null;
  checkin_date?: string | null;
  checkin_readiness?: number | null;
  checkin_feel?: string | null;
  checkin_pain?: string | null;
  checkin_energy?: string | null;
  checkin_sleep?: string | null;
  focus?: string | null;
  goal?: string | null;
};

function getAdaptation(p: ProfileInput): "reduce" | "normal" | "increase" {
  const today = new Date().toISOString().slice(0, 10);
  if (p.checkin_date !== today) return "normal";
  const readiness = p.checkin_readiness ?? 7;
  const feel = p.checkin_feel ?? "okay";
  const pain = p.checkin_pain ?? "none";
  const energy = p.checkin_energy ?? "medium";
  const sleep = p.checkin_sleep ?? "okay";
  if (pain === "yes" || feel === "poor" || energy === "low" || sleep === "poor" || readiness < 5)
    return "reduce";
  if (feel === "good" && (energy === "high" || sleep === "good") && readiness >= 7 && pain === "none")
    return "increase";
  return "normal";
}

/**
 * Returns a single-session summary for "today" based on day of week and profile.
 * Uses simple rules: middle day = Regeneration, else Lower Body / Upper Body style.
 */
export function getTodaySessionSummary(profile: ProfileInput): TodaySessionSummary {
  const week = profile.current_week ?? 1;
  const phase = PHASES[(week - 1) % PHASES.length] ?? "Accumulation";
  const daysPerWeek = Math.min(5, Math.max(2, profile.days_per_week ?? 3));
  const sessionMins = Math.min(90, Math.max(30, profile.minutes_per_session ?? 60));
  const adaptation = getAdaptation(profile);

  const dayOfWeek = new Date().getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const sessionIndex = Math.min(todayIndex, daysPerWeek - 1);
  const isRecoveryDay = sessionIndex === Math.floor(daysPerWeek / 2);

  if (isRecoveryDay) {
    return {
      sessionTitle: "Regeneration",
      duration: "20–30 min",
      intensity: "Low",
      exercisesCount: 1,
      detail: "Zone 1 · Mobility · Parasympathetic breathing",
    };
  }

  const focus = (profile.focus ?? profile.goal ?? "").toLowerCase();
  const isPower = focus.includes("power") || focus.includes("neural");
  const title = isPower ? "Lower Body · RFD / Power" : "Lower Body Strength · Neural Bias";
  const intensity = adaptation === "reduce" ? "Moderate" : "Moderate–High";
  const mins = adaptation === "reduce" ? `${sessionMins - 20}–${sessionMins - 10}` : `${sessionMins - 10}–${sessionMins}`;

  return {
    sessionTitle: title,
    duration: `${mins} min`,
    intensity,
    exercisesCount: 4,
    detail: `${mins} min · 4 exercises · ${intensity} intensity`,
  };
}
