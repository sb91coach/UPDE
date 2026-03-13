"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/lib/requireAuth";
import type { ProgrammeType } from "@/lib/trainingTargets";
import { getExerciseVideos } from "@/lib/exerciseVideos";
import { getBenchmarks } from "@/engine/benchmarkEngine";
import { prescribe } from "@/engine/prescriptionEngine";
import { getRiskSignals } from "@/engine/riskIndex";
import { generateWeeklyBrief } from "@/engine/weeklyBriefGenerator";
import { EXERCISE_DISPLAY_NAMES } from "@/lib/profile/benchmarkSchema";
import ProgrammeCard from "@/app/ui/ProgrammeCard";
import WeeklyBrief from "@/app/ui/WeeklyBrief";
import DailyAdvisories from "@/app/ui/DailyAdvisories";
import { getAdvisories } from "@/engine/advisoriesEngine";
import type { InjuryEntry } from "@/engine/injuryMemoryEngine";
import { getAdaptiveGuardrails, applyIntensityCap } from "@/engine/adaptiveGuardrails";
import type { BehaviourDriftOutput } from "@/engine/behaviourDriftModel";
import { PerformanceEngine } from "@/lib/performanceEngine";
import { subscribe as subscribePerformance } from "@/lib/performanceEvents";
import type { ProgrammeData, ProgrammeInjuryAdjustment } from "@/lib/performanceEngine";
import OSLayer from "@/app/components/OSLayer";
import WeekSelector from "@/app/components/programme/WeekSelector";
import ProgrammeWeekView from "@/app/components/programme/ProgrammeWeekView";
import type { ProgrammeWeekData } from "@/app/components/programme/ProgrammeWeekView";
import type { ProgrammeDayData } from "@/app/components/programme/DayAccordion";
import type { SessionBlockData } from "@/app/components/programme/SessionBlock";
import programme from "@/data/programmes";
import type { ProgrammeDay as ProgrammeDayFromData, ProgrammeSessionBlock } from "@/data/programmes";

function NavTab({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={active ? "active" : undefined}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

/* ======================================================
   PROFILE TYPE (linked from intake)
====================================================== */

type Profile = {
  id: string;
  goal: string;
  sport: string;
  experience: string;
  focus?: string;
  days_per_week: number;
  minutes_per_session: number;
  equipment?: string;
  sleep_score: number;
  stress_level: number;
  aerobic_score: number;
  strength_upper: number;
  strength_lower: number;
  mobility_score: number;
  readiness_score: number;
  primary_limiter: string;
  momentum: string;
  current_week: number;
  fatigue_score: number;
  deload_active: boolean;
  /* Daily check-in (adapts programme) */
  checkin_date?: string;
  checkin_readiness?: number;
  checkin_feel?: string;
  checkin_pain?: string;
  checkin_pain_areas?: string;
  checkin_energy?: string;
  checkin_sleep?: string;
  performance_benchmarks?: import("@/lib/profile/benchmarkSchema").PerformanceBenchmarks | null;
};

type AdaptationLevel = "reduce" | "normal" | "increase";

/* ======================================================
   PHASE MODEL (GPP → SPP → Performance/Peaking)
   Recovery programmed, not reactive. Conditioning supports strength.
====================================================== */

const PHASES = [
  "Accumulation",
  "Accumulation",
  "Intensification",
  "Intensification",
  "Overreach",
  "Deload",
];

const MACROCYCLE_LABELS: Record<string, string> = {
  Accumulation: "GPP",
  Intensification: "SPP",
  Overreach: "SPP",
  Deload: "Recovery",
};

/* Performance markers (philosophy): RFD, tendon stiffness, aerobic threshold,
   load carriage resilience, movement symmetry, nervous system readiness */
const PERFORMANCE_MARKERS = [
  "Rate of Force Development",
  "Aerobic Threshold Efficiency",
  "Load Carriage Resilience",
  "Movement Symmetry",
  "Nervous System Readiness",
];

export default function ProgrammePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [videoModal, setVideoModal] = useState<{
    videoId: string;
    label: string;
    startSeconds?: number;
    endSeconds?: number;
  } | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    readiness: 7,
    feel: "good" as "good" | "okay" | "poor",
    pain: "none" as "none" | "yes",
    painAreas: "",
    energy: "medium" as "low" | "medium" | "high",
    sleep: "good" as "poor" | "okay" | "good",
  });
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefSessionName, setDebriefSessionName] = useState<string | null>(null);
  const [debriefForm, setDebriefForm] = useState({ howFelt: 3, niggles: "", readyNext: 3 });
  const [debriefSubmitting, setDebriefSubmitting] = useState(false);
  const [injuries, setInjuries] = useState<InjuryEntry[]>([]);
  const [behaviourDrift, setBehaviourDrift] = useState<BehaviourDriftOutput | null>(null);
  const [programmeEngineData, setProgrammeEngineData] = useState<ProgrammeData | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<number>(0);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const lastDecisionLogDateRef = useRef<string | null>(null);
  const guardrailLoggedRef = useRef(false);
  const simplificationLoggedRef = useRef(false);
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(data);
    }

    load();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    fetch("/api/injuries")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setInjuries(d.entries ?? []))
      .catch(() => setInjuries([]));
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    fetch("/api/behaviour-drift")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? setBehaviourDrift(d as BehaviourDriftOutput) : setBehaviourDrift(null)))
      .catch(() => setBehaviourDrift(null));
  }, [profile?.id]);

  useEffect(() => {
    setProgrammeEngineData(PerformanceEngine.getProgrammeData());
    const unsubRecalc = subscribePerformance("stateRecalculated", () => {
      setProgrammeEngineData(PerformanceEngine.getProgrammeData());
    });
    const unsubProg = subscribePerformance("programmeUpdated", () => {
      setProgrammeEngineData(PerformanceEngine.getProgrammeData());
    });
    return () => {
      unsubRecalc();
      unsubProg();
    };
  }, []);

  useEffect(() => {
    if (profile?.current_week == null) return;
    const w = profile.current_week;
    const phase0Weeks = programme.phases[0]?.duration ?? 6;
    if (w <= phase0Weeks) {
      setSelectedPhase(0);
      setSelectedWeek(w);
    } else {
      setSelectedPhase(1);
      setSelectedWeek(Math.min(w - phase0Weeks, programme.phases[1]?.duration ?? 4));
    }
  }, [profile?.current_week]);

  useEffect(() => {
    const progPhase = programme.phases[selectedPhase];
    if (!progPhase || selectedWeek <= progPhase.duration) return;
    setSelectedWeek(progPhase.duration);
  }, [selectedPhase, selectedWeek]);

  useEffect(() => {
    if (!profile) return;
    const gr = getAdaptiveGuardrails({
      ...profile,
      fatigue_score: profile.fatigue_score,
      readiness_score: profile.readiness_score,
      sleep_score: profile.sleep_score,
      stress_level: profile.stress_level,
      activeInjuries: injuries,
      plannedSessions: profile.days_per_week ?? 4,
    });
    if (gr.reasons.length > 0 && !guardrailLoggedRef.current) {
      guardrailLoggedRef.current = true;
      fetch("/api/decision-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionType: "guardrail_applied",
          adjustmentMade: gr.reasons.join(" "),
          explanation: gr.reasons.join(" "),
          triggerVariables: { reasons: gr.reasons },
        }),
      }).catch(() => {});
    }
    if (gr.reasons.length === 0) guardrailLoggedRef.current = false;
  }, [profile, injuries]);

  useEffect(() => {
    if (!videoModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVideoModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [videoModal]);

  useEffect(() => {
    if (!checkinOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCheckinOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [checkinOpen]);

  useEffect(() => {
    if (!profile || !checkinOpen || profile.checkin_date !== todayStr) return;
    setCheckinForm({
      readiness: profile.checkin_readiness ?? 7,
      feel: (profile.checkin_feel as "good" | "okay" | "poor") ?? "okay",
      pain: (profile.checkin_pain as "none" | "yes") ?? "none",
      painAreas: profile.checkin_pain_areas ?? "",
      energy: (profile.checkin_energy as "low" | "medium" | "high") ?? "medium",
      sleep: (profile.checkin_sleep as "poor" | "okay" | "good") ?? "good",
    });
  }, [checkinOpen, profile, todayStr]);

  useEffect(() => {
    if (!profile?.id || !behaviourDrift?.simplificationRecommended || simplificationLoggedRef.current) return;
    simplificationLoggedRef.current = true;
    fetch("/api/decision-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decisionType: "behaviour_drift_simplification",
        adjustmentMade: "Weekly volume reduced 10–15%; submax bias applied.",
        explanation: "Engagement trending down — simplifying architecture to protect adherence.",
        triggerVariables: {
          frictionIndex: behaviourDrift.frictionIndex,
          complianceVelocity: behaviourDrift.complianceVelocity,
          engagementLevel: behaviourDrift.engagementLevel,
        },
      }),
    }).catch(() => {});
  }, [profile?.id, behaviourDrift?.simplificationRecommended, behaviourDrift?.frictionIndex, behaviourDrift?.complianceVelocity, behaviourDrift?.engagementLevel]);

  useEffect(() => {
    if (!profile?.id || lastDecisionLogDateRef.current === todayStr) return;
    const risk = getRiskSignals(profile);
    let adapt: AdaptationLevel = "normal";
    if (risk.shouldReduceVolume || risk.shouldReduceIntensity) adapt = "reduce";
    else if (profile.checkin_date === todayStr) {
      const r = profile.checkin_readiness ?? 7;
      const f = profile.checkin_feel ?? "okay";
      const pain = profile.checkin_pain ?? "none";
      const energy = profile.checkin_energy ?? "medium";
      const sleep = profile.checkin_sleep ?? "okay";
      if (pain === "yes" || f === "poor" || energy === "low" || sleep === "poor" || r < 5) adapt = "reduce";
    }
    if (adapt !== "reduce") return;
    lastDecisionLogDateRef.current = todayStr;
    supabase.from("decision_logs").insert({
      profile_id: profile.id,
      decision_type: "volume_reduction",
      trigger_variables: {
        fatigue_risk: risk.fatigueRisk,
        readiness: profile.checkin_readiness ?? null,
        sleep: profile.checkin_sleep ?? null,
        checkin_date: profile.checkin_date ?? null,
      },
      threshold_breached: risk.shouldReduceIntensity ? "fatigue_risk_high" : "fatigue_risk_volume",
      adjustment_made: "Volume and intensity reduced today",
      explanation: "Programme adapted due to recovery bandwidth and fatigue risk. Volume and intensity reduced to protect adaptation.",
    });
  }, [profile, todayStr]);

  async function submitCheckin() {
    setCheckinSubmitting(true);
    const updates = {
      checkin_date: todayStr,
      checkin_readiness: checkinForm.readiness,
      checkin_feel: checkinForm.feel,
      checkin_pain: checkinForm.pain,
      checkin_pain_areas: checkinForm.painAreas,
      checkin_energy: checkinForm.energy,
      checkin_sleep: checkinForm.sleep,
    };
    const { data: updated } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", p.id)
      .select()
      .single();
    setCheckinSubmitting(false);
    if (updated) setProfile(updated);
    setCheckinOpen(false);
  }

  if (!profile) return null;
  const p = profile;

  /* ======================================================
     DERIVED METRICS
  ======================================================= */

  const week = p.current_week || 1;
  const phase = PHASES[week - 1] || "Accumulation";
  const macrocycle = MACROCYCLE_LABELS[phase] || "GPP";
  const programmeType: ProgrammeType = (p.focus as ProgrammeType) || "hybrid";
  const trainingGoal = p.goal || p.sport || "General fitness";
  const sessionMins = p.minutes_per_session || 60;
  const daysPerWeek = p.days_per_week || 3;

  const strengthIndex =
    ((p.strength_upper || 60) + (p.strength_lower || 60)) / 2;

  const aerobicIndex = p.aerobic_score || 60;

  const recoveryIndex =
    (p.sleep_score || 60) * 0.6 +
    (100 - (p.stress_level || 40)) * 0.4;

  function getAdaptation(): AdaptationLevel {
    const risk = getRiskSignals(p);
    if (risk.shouldReduceVolume || risk.shouldReduceIntensity) return "reduce";
    if (p.checkin_date !== todayStr) return "normal";
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

  const programmeInjuryAdjustment = PerformanceEngine.getProgrammeInjuryAdjustment();
  const adaptation: AdaptationLevel =
    programmeInjuryAdjustment.reduceIntensity ? "reduce" : getAdaptation();

  const weeklyBriefData = generateWeeklyBrief({
    ...p,
    phase,
    macrocycle,
    current_week: week,
  });

  const readinessBias =
    p.readiness_score > 75 ? 1.05 :
    p.readiness_score > 65 ? 1 :
    0.9;

  const fatigueBias =
    p.fatigue_score > 60 ? 0.85 : 1;

  const isDeload =
    p.deload_active ||
    p.readiness_score < 55 ||
    p.fatigue_score > 75;

  const intensityScale =
    readinessBias * fatigueBias * (isDeload ? 0.85 : 1);

  const guardrails = getAdaptiveGuardrails({
    ...p,
    fatigue_score: p.fatigue_score,
    readiness_score: p.readiness_score,
    sleep_score: p.sleep_score,
    stress_level: p.stress_level,
    activeInjuries: injuries,
    plannedSessions: daysPerWeek,
  });

  const experience = p.experience?.toLowerCase() || "beginner";

  const setsMain =
    experience.includes("advanced") ? 5 :
    experience.includes("intermediate") ? 4 :
    3;

  const rpeTarget =
    experience.includes("advanced") ? "8–9" :
    experience.includes("intermediate") ? "7–8" :
    "6–7";

  function formatIntensityPct(base: number) {
    if (!p.strength_upper || !p.strength_lower)
      return `RPE ${rpeTarget}`;

    const scaled = base * intensityScale;
    return `${Math.round(scaled * 100)}%`;
  }

  /* ======================================================
     CONDITIONING — driven by programme type (from intake goal).
     Supports strength where applicable; emphasis matches training target.
  ======================================================= */

  function conditioningPrescription() {
    const aerobicBias =
      programmeType === "pure_endurance" ||
      programmeType === "aerobic_first" ||
      programmeType === "load_carriage_endurance";
    const strengthBias = programmeType === "strength" || programmeType === "power_speed";

    if (aerobicBias || aerobicIndex > strengthIndex) {
      const isLoadCarriage = programmeType === "load_carriage_endurance";
      return {
        description: isLoadCarriage ? "Load carriage + threshold" : "Threshold Intervals",
        prescription: isLoadCarriage
          ? "Loaded march 20–30 min · or 4×6 min @ 85–90% HRmax · 2 min recovery"
          : "4 × 6 min @ 85–90% HRmax · 2 min easy recovery",
        intent:
          "Aerobic threshold efficiency. " +
          (isLoadCarriage
            ? "Load carriage resilience for selection/operational demand. Conditioning integrated with strength."
            : "Conditioning integrated with strength — interference controlled."),
      };
    }

    if (strengthBias) {
      return {
        description: "Conditioning (minimal interference)",
        prescription:
          "15–20 min Zone 2 · or sled/assault bike 4×2 min · Rest 90s",
        intent:
          "Maintain aerobic base without compromising strength. Short, controlled.",
      };
    }

    return {
      description: "Zone 2 Aerobic Base",
      prescription:
        "30–40 min @ 65–75% HRmax · nasal breathing focus",
      intent:
        "Aerobic base & mitochondrial density. Human-first: sustainable output. Supports strength development.",
    };
  }

  /* ======================================================
     SESSION BUILDER — tactical alignment, movement quality,
     nervous system readiness, programmed recovery.
  ======================================================= */

  function buildSession(dayIndex: number, adapt: AdaptationLevel) {
    const recoveryDay = dayIndex === Math.floor(daysPerWeek / 2);

    let volScale = adapt === "reduce" ? 0.6 : adapt === "increase" ? 1.2 : 1;
    let intensityScaleAdapt = adapt === "reduce" ? 0.85 : adapt === "increase" ? 1.05 : 1;
    if (behaviourDrift?.simplificationRecommended) {
      volScale *= 0.85;
      intensityScaleAdapt *= 0.95;
    }
    const effectiveIntensity = intensityScale * intensityScaleAdapt;
    const setsAdapted = Math.max(2, Math.round(setsMain * volScale));
    const mainLiftAlt = adapt === "reduce" ? " (or Goblet Squat if pain)" : "";
    const accessoryNote =
      adapt === "reduce"
        ? " Reduced volume today. Option: substitute any exercise for a lighter variant."
        : adapt === "increase"
          ? " Optional: add 1 set or RPE +0.5 if feeling strong."
          : "";

    function prescribeAdapt(base: number) {
      if (!p.strength_upper || !p.strength_lower) return `RPE ${rpeTarget}`;
      const scaled = base * effectiveIntensity;
      return `${Math.round(scaled * 100)}%`;
    }

    if (recoveryDay) {
      const recoveryDetail =
        adapt === "reduce"
          ? "Zone 1 15–20 min · Mobility only · Breathing · HR < 110 bpm"
          : "Zone 1 20–30 min · Mobility circuits · Parasympathetic breathing · HR < 120 bpm";
      const recoveryLines =
        adapt === "reduce"
          ? ["Zone 1 15–20 min", "Mobility only", "Breathing", "HR < 110 bpm"]
          : ["Zone 1 20–30 min", "Mobility circuits", "Parasympathetic breathing", "HR < 120 bpm"];
      return {
        title: `Day ${dayIndex + 1} — Regeneration`,
        blocks: [
          {
            section: "Programmed Recovery (not reactive)",
            detail: recoveryDetail,
            detailLines: recoveryLines,
            notes:
              "Human-first: nervous system regulation and movement quality before output. Recovery is programmed — long-term adaptation over short-term peaks.",
            exerciseKeys: ["zone1", "mobility_circuits", "parasympathetic_breathing"],
          },
        ],
        card: {
          sessionTitle: "Regeneration",
          sessionSubtitle: "Programmed recovery",
          duration: "20–30 min",
          intensity: "Low",
          primaryFocus: "Nervous system regulation & mobility",
          exercises: [
            { letter: "A", title: "Zone 1 · Mobility · Breathing", prescription: recoveryDetail },
          ],
        },
      };
    }

    const conditioning = conditioningPrescription();
    const isLoadCarriage = programmeType === "load_carriage_endurance";
    const isStrength = programmeType === "strength";
    const isPower = programmeType === "power_speed";

    const mainLift =
      (isStrength ? "Back Squat" : isPower ? "Power Clean or Back Squat" : "Back Squat") + mainLiftAlt;
    const secondaryLift =
      isLoadCarriage ? "Weighted Pull-Up / Loaded carry prep" : "Weighted Pull-Up";

    const mainLiftKeys = isPower ? ["power_clean", "back_squat"] : ["back_squat"];
    const secondaryLiftKeys = isLoadCarriage
      ? ["weighted_pull_up", "loaded_carry"]
      : ["weighted_pull_up"];

    const blocks: { section: string; detail: string; notes: string; exerciseKeys?: string[]; detailLines?: string[] }[] = [
      {
        section: "Prep — Nervous System Readiness",
        detail:
          isPower
            ? "Jump rope 5 min · Dynamic mobility · 3×5 pogos · 3×3 broad jump"
            : "6 min progressive bike → Dynamic mobility → 3×5 pogos",
        detailLines: isPower
          ? ["Jump rope 5 min", "Dynamic mobility", "3×5 pogos", "3×3 broad jump"]
          : ["6 min progressive bike →", "Dynamic mobility → 3×5 pogos"],
        notes:
          "Clarity over complexity: prime CNS without fatigue. Movement quality and symmetry first.",
        exerciseKeys: isPower
          ? ["jump_rope", "dynamic_mobility", "pogos", "broad_jump"]
          : ["bike", "dynamic_mobility", "pogos"],
      },
      {
        section: isPower ? "Main Lift (RFD / Power)" : "Main Lift (RFD & Force Production)",
        detail:
          `${mainLift} · ${setsAdapted}×3–5 · ${prescribeAdapt(0.8)} · Tempo 31X1 · Rest 2–3 min`,
        detailLines: [
          `${mainLift} · ${setsAdapted}×3–5 · ${prescribeAdapt(0.8)} · Tempo 31X1 · Rest 2–3 min`,
        ],
        notes:
          (isStrength
            ? "Max strength focus. Terminate if bar speed drops >20%."
            : isLoadCarriage
              ? "Lower-body strength base for load carriage. Rate of force development."
              : "RFD & max force. Tactical alignment: lower-body strength base.") + accessoryNote,
        exerciseKeys: mainLiftKeys,
      },
      {
        section: "Secondary Lift",
        detail:
          `${secondaryLift} · ${setsAdapted}×5–6 · ${prescribeAdapt(0.75)} · Rest 2 min`,
        detailLines: [
          `${secondaryLift} · ${setsAdapted}×5–6 · ${prescribeAdapt(0.75)} · Rest 2 min`,
        ],
        notes:
          "Vertical pull, full ROM. Movement symmetry and durability. Strength integrated, not isolated." +
          accessoryNote,
        exerciseKeys: secondaryLiftKeys,
      },
      {
        section: "Accessory Block (Durability & Symmetry)",
        detail:
          adapt === "reduce"
            ? "Split Squat 2×6 ea · DB Press 2×8 · RDL 2×6 · Rest 90s"
            : adapt === "increase"
              ? "Split Squat 3×8 ea · DB Press 3×10 · RDL 3×8 · Optional +1 set each · Rest 60–90s"
              : "Split Squat 3×8 ea · DB Press 3×10 · RDL 3×8 · Rest 60–90s",
        detailLines:
          adapt === "reduce"
            ? ["Split Squat 2×6 ea", "DB Press 2×8", "RDL 2×6 · Rest 90s"]
            : adapt === "increase"
              ? ["Split Squat 3×8 ea", "DB Press 3×10", "RDL 3×8 · Optional +1 set each · Rest 60–90s"]
              : ["Split Squat 3×8 ea", "DB Press 3×10", "RDL 3×8 · Rest 60–90s"],
        notes:
          "Unilateral stability, tendon resilience, movement quality. Human-first: long-term resilience." +
          accessoryNote,
        exerciseKeys: ["split_squat", "db_press", "rdl"],
      },
    ];

    if (isLoadCarriage) {
      blocks.push({
        section: "Load Carriage Resilience",
        detail:
          adapt === "reduce"
            ? "Loaded march 1×600 m (lighter) · Med Ball 2×5 ea · Side Plank 2×20s"
            : adapt === "increase"
              ? "Loaded march 2×800 m · Med Ball 3×5 ea · Side Plank 3×30s · Optional +1 round"
              : "Loaded march 2×800 m (e.g. 15–25 kg) · Med Ball Rotational Throws 3×5 ea · Side Plank 3×30s",
        detailLines:
          adapt === "reduce"
            ? ["Loaded march 1×600 m (lighter)", "Med Ball 2×5 ea", "Side Plank 2×20s"]
            : adapt === "increase"
              ? ["Loaded march 2×800 m", "Med Ball 3×5 ea", "Side Plank 3×30s · Optional +1 round"]
              : ["Loaded march 2×800 m (e.g. 15–25 kg)", "Med Ball Rotational Throws 3×5 ea", "Side Plank 3×30s"],
        notes:
          "Operational demand: load carriage resilience. Rotational power and frontal plane stability.",
        exerciseKeys: ["loaded_march", "med_ball_rotational_throw", "side_plank"],
      });
    } else {
      const trunkLines =
        adapt === "reduce"
          ? ["Med Ball 2×5 ea", "Side Plank 2×20s"]
          : ["Med Ball Rotational Throws 3×5 ea", "Side Plank 3×30s"].concat(
              programmeType === "hybrid" || programmeType === "team_sport"
                ? [adapt === "increase" ? "Load carry 2×60 m" : "Load carry 2×60 m optional"]
                : []
            );
      blocks.push({
        section: "Trunk & Load Carriage Resilience",
        detail:
          adapt === "reduce"
            ? "Med Ball 2×5 ea · Side Plank 2×20s"
            : adapt === "increase"
              ? "Med Ball Rotational Throws 3×5 ea · Side Plank 3×30s" +
                (programmeType === "hybrid" || programmeType === "team_sport" ? " · Load carry 2×60 m" : "")
              : "Med Ball Rotational Throws 3×5 ea · Side Plank 3×30s" +
                (programmeType === "hybrid" || programmeType === "team_sport" ? " · Load carry 2×60 m optional" : ""),
        detailLines: trunkLines,
        notes:
          "Rotational power, frontal plane stability. Load carriage where relevant to goal.",
        exerciseKeys:
          programmeType === "hybrid" || programmeType === "team_sport"
            ? ["med_ball_rotational_throw", "side_plank", "loaded_carry"]
            : ["med_ball_rotational_throw", "side_plank"],
      });
    }

    const condDetail =
      adapt === "reduce"
        ? "15–20 min easy · Zone 2 or skip if needed"
        : adapt === "increase"
          ? `${conditioning.description} · ${conditioning.prescription} · Optional +5 min`
          : `${conditioning.description} · ${conditioning.prescription}`;
    blocks.push({
      section: "Energy System",
      detail: condDetail,
      detailLines: [condDetail],
      notes: conditioning.intent,
      exerciseKeys: ["threshold_intervals", "zone2"],
    });

    const benchmarks = getBenchmarks(p);
    const cardExercises: { letter: string; title: string; prescription: string; rest?: string }[] = [];
    const rpeT = rpeTarget;

    const pctA = applyIntensityCap(0.8, guardrails);
    const pctB = applyIntensityCap(0.75, guardrails);
    cardExercises.push({
      letter: "A",
      title: EXERCISE_DISPLAY_NAMES[mainLiftKeys[0]] ?? mainLift.split(" (or")[0].trim(),
      prescription: prescribe(benchmarks, mainLiftKeys[0], {
        sets: setsAdapted,
        reps: "3–5",
        percentage: pctA,
        rpeFallback: rpeT,
      }).display,
      rest: "2–3 min",
    });
    cardExercises.push({
      letter: "B",
      title: EXERCISE_DISPLAY_NAMES[secondaryLiftKeys[0]] ?? secondaryLift.split(" /")[0].trim(),
      prescription: prescribe(benchmarks, secondaryLiftKeys[0], {
        sets: setsAdapted,
        reps: "5–6",
        percentage: pctB,
        rpeFallback: rpeT,
      }).display,
      rest: "2 min",
    });
    cardExercises.push({
      letter: "C",
      title: "Accessory · Split Squat · DB Press · RDL",
      prescription:
        adapt === "reduce"
          ? "2×6 ea · 2×8 · 2×6 @ RPE 7"
          : adapt === "increase"
            ? "3×8 ea · 3×10 · 3×8 @ RPE 7–8 · Optional +1 set"
            : "3×8 ea · 3×10 · 3×8 @ RPE 7",
      rest: "60–90 sec",
    });
    cardExercises.push({
      letter: "D",
      title: conditioning.description,
      prescription: condDetail,
    });

    const card = {
      sessionTitle: isPower ? "Lower Body · RFD / Power" : "Lower Body Strength · Neural Bias",
      sessionSubtitle: isLoadCarriage ? "Load carriage emphasis" : undefined,
      duration: `${sessionMins - 10}–${sessionMins} min`,
      intensity: isStrength ? "High" : "Moderate–High",
      primaryFocus: isStrength ? "Maximal force output" : isPower ? "Rate of force development" : "Force output & work capacity",
      exercises: cardExercises,
    };

    return {
      title: `Day ${dayIndex + 1} — ${phase}`,
      blocks,
      card,
    };
  }

  const sessions = Array.from(
    { length: daysPerWeek },
    (_, i) => buildSession(i, adaptation)
  );

  /* Programme data from /data/programmes.ts: phase → week → days (unique per week/day) */
  const programmePhase = programme.phases[selectedPhase];
  const phaseWeekIndex = Math.min(Math.max(0, selectedWeek - 1), (programmePhase?.weeks?.length ?? 1) - 1);
  const weekData = programmePhase?.weeks?.[phaseWeekIndex];
  const programmeDays = weekData?.days ?? [];

  function mapProgrammeBlockToSessionBlock(b: ProgrammeSessionBlock): SessionBlockData {
    if (b.type === "performanceNotes") {
      return { type: "performanceNotes", text: b.text };
    }
    return {
      type: b.type,
      exercises: b.exercises ?? [],
    };
  }

  function mapProgrammeDayToWeekDay(d: ProgrammeDayFromData): ProgrammeDayData {
    return {
      day: d.day,
      type: d.type,
      title: d.title,
      duration: d.duration,
      performanceNotes: undefined,
      blocks: d.blocks.map(mapProgrammeBlockToSessionBlock),
    };
  }

  const programmeWeekData: ProgrammeWeekData = {
    week: selectedWeek,
    days: programmeDays.map(mapProgrammeDayToWeekDay),
  };

  const programmeAdvisories = getAdvisories({
    readiness: p.checkin_readiness ?? 7,
    feel: (p.checkin_feel as "good" | "okay" | "poor") ?? "okay",
    pain: (p.checkin_pain as "none" | "yes") ?? "none",
    painAreas: p.checkin_pain_areas ?? null,
    energy: (p.checkin_energy as "low" | "medium" | "high") ?? "medium",
    sleep: (p.checkin_sleep as "poor" | "okay" | "good") ?? "okay",
    adaptation,
    sessionFocus: "Lower body",
  });

  async function completeSession(name: string, sessionTitle?: string) {
    await supabase.from("session_logs").insert({
      profile_id: p.id,
      week,
      session_name: name,
      perceived_exertion: p.readiness_score,
      completed: true,
    });

    const focus =
      sessionTitle?.split(" · ")[0]?.trim() ||
      (name.toLowerCase().includes("lower") ? "Lower body" : name.toLowerCase().includes("upper") ? "Upper body" : null);

    await supabase
      .from("profiles")
      .update({
        fatigue_score: p.fatigue_score + 5,
        ...(focus ? { last_session_focus: focus } : {}),
      })
      .eq("id", p.id);

    setDebriefSessionName(name);
    setDebriefForm({ howFelt: 3, niggles: "", readyNext: 3 });
    setDebriefOpen(true);
  }

  async function submitDebrief() {
    if (!debriefSessionName) return;
    setDebriefSubmitting(true);
    await supabase.from("session_debriefs").insert({
      profile_id: p.id,
      session_name: debriefSessionName,
      week,
      how_felt: debriefForm.howFelt,
      niggles: debriefForm.niggles.trim() || null,
      ready_next: debriefForm.readyNext,
    });
    setDebriefSubmitting(false);
    setDebriefOpen(false);
    setDebriefSessionName(null);
    window.location.reload();
  }

  const pathname = usePathname();

  return (
    <RequireAuth>
      <OSLayer>
        <div className="outer">
          <nav className="programmeNav">
            <div className="programmeBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="programmeTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="container">
        <div className="header">
          <div className="phase">
            WEEK {week} · {phase} · {macrocycle}
          </div>

          <h1 className="headline">
            Adaptive Performance Programme
          </h1>

          <p className="builtFor">
            Built for: <strong>{trainingGoal}</strong>
            {sessionMins ? ` · ~${sessionMins} min sessions · ${daysPerWeek} days/week` : ""}
          </p>

          <p className="philosophy">
            Built with intent. Structured for adaptation. Designed for operational performance.
            Clarity over complexity — human-first, data-informed.
          </p>

          <div className="meta">
            Strength {Math.round(strengthIndex)} ·
            Aerobic {Math.round(aerobicIndex)} ·
            Recovery {Math.round(recoveryIndex)} ·
            Fatigue {p.fatigue_score}
          </div>

          <div className="markers">
            <span className="markersLabel">Performance markers:</span>
            {" "}
            {PERFORMANCE_MARKERS.slice(0, 3).join(" · ")}
            {" · "}
            <span className="markersMore">{PERFORMANCE_MARKERS.slice(3).join(" · ")}</span>
          </div>
        </div>

        <div className="checkinRow">
          <button
            type="button"
            className="dailyCheckinBtn"
            onClick={() => setCheckinOpen(true)}
            aria-label="Daily readiness check-in — adapt today's programme"
          >
            <span className="dailyCheckinBtnIcon">◇</span>
            {p.checkin_date === todayStr
              ? "Today’s check-in done — programme adapted"
              : "Daily check-in — adapt today’s programme"}
          </button>
          {adaptation !== "normal" && (
            <span className="adaptationBadge">
              {adaptation === "reduce"
                ? "Reduced volume & intensity today"
                : "Optional progressions today"}
            </span>
          )}
        </div>

        <div className="advisoriesWrap">
          <DailyAdvisories advisories={programmeAdvisories} />
        </div>

        {programmeEngineData && (programmeEngineData.injuryAdjusted || programmeEngineData.roadmapPhases.length > 0) && (
          <div className="programmeEngineBanner" style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(39, 224, 166, 0.08)", border: "1px solid rgba(39, 224, 166, 0.2)", borderRadius: 12, fontSize: 12 }}>
            <strong style={{ letterSpacing: "0.04em" }}>Strategy roadmap</strong>
            {programmeEngineData.injuryAdjusted && (
              <span style={{ display: "block", marginTop: 4, opacity: 0.9 }}>
                Foundation extended by {programmeEngineData.foundationExtendedWeeks} week(s). Volume cap {programmeEngineData.volumeCapPercent ?? 100}%.
              </span>
            )}
            {programmeEngineData.roadmapPhases.length > 0 && !programmeEngineData.injuryAdjusted && (
              <span style={{ display: "block", marginTop: 4, opacity: 0.9 }}>
                Phases: {programmeEngineData.roadmapPhases.map((ph) => `${ph.name} (W${ph.startWeek}–W${ph.endWeek})`).join(" · ")}
              </span>
            )}
          </div>
        )}

        {programmeInjuryAdjustment.showAdjustmentBanner && (
          <div className="programmeInjuryAdjustmentBanner" style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: 12, fontSize: 12 }}>
            <strong style={{ letterSpacing: "0.04em" }}>Injury adjustment</strong>
            <span style={{ display: "block", marginTop: 4, opacity: 0.9 }}>
              {programmeInjuryAdjustment.swapExercises && "Exercises swapped for joint-friendly options. "}
              {programmeInjuryAdjustment.reduceIntensity && "Intensity reduced. "}
              {programmeInjuryAdjustment.reason ?? "Programme adapted for current limitation."}
            </span>
          </div>
        )}

        <div className="briefAndLog">
          <div className="briefWrap">
            <WeeklyBrief
              weekNumber={weeklyBriefData.weekNumber}
              phaseIntent={weeklyBriefData.phaseIntent}
              systemBias={weeklyBriefData.systemBias}
              primaryLimiter={weeklyBriefData.primaryLimiter}
              recoveryBandwidth={weeklyBriefData.recoveryBandwidth}
              whyThisWeek={weeklyBriefData.whyThisWeek}
            />
          </div>
          <div className="decisionLogWrap performanceAdjustmentsWrap">
            <div className="performanceAdjustmentsTitle">Performance adjustments</div>
            <div className="performanceAdjustmentsSignal">
              <div className="performanceAdjustmentsSignalTitle">This week</div>
              <div className="performanceAdjustmentsSignalSub">{weeklyBriefData.whyThisWeek}</div>
            </div>
            {p.readiness_score >= 65 && (
              <div className="performanceAdjustmentsSignal">
                <div className="performanceAdjustmentsSignalTitle">Readiness</div>
                <div className="performanceAdjustmentsSignalSub">You&apos;re in a good window to train. Programme is aligned to your current state.</div>
              </div>
            )}
            {programmeAdvisories.length > 0 && (
              <div className="performanceAdjustmentsSignal">
                <div className="performanceAdjustmentsSignalTitle">{programmeAdvisories[0].label}</div>
                <div className="performanceAdjustmentsSignalSub">{programmeAdvisories[0].message}</div>
              </div>
            )}
          </div>
        </div>

        <div className="weekIntro">
          <h2 className="weekIntroTitle">Your sessions this week</h2>
          <p className="weekIntroSub">Tap a day to see the full session. Complete your check-in to adapt volume and intensity.</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", opacity: 0.7, marginBottom: 8 }}>
            PHASE: {programmePhase?.name ?? macrocycle}
            {programme.phases.length > 1 && (
              <span style={{ marginLeft: 12 }}>
                {programme.phases.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedPhase(i)}
                    style={{
                      marginRight: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      background: selectedPhase === i ? "rgba(47,128,237,0.3)" : "rgba(255,255,255,0.06)",
                      border: selectedPhase === i ? "1px solid rgba(47,128,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6,
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Phase {i + 1}
                  </button>
                ))}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Duration: {programmePhase?.duration ?? 6} weeks</div>
        </div>
        <WeekSelector
          totalWeeks={programmePhase?.duration ?? 6}
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
        />
        <ProgrammeWeekView
          weekData={programmeWeekData}
          expandedDayId={expandedDay}
          onExpandedDayChange={setExpandedDay}
        />

        {videoModal && (
          <div
            className="videoModalBackdrop"
            onClick={() => setVideoModal(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Exercise video"
          >
            <div className="videoModal" onClick={(e) => e.stopPropagation()}>
              <div className="videoModalHeader">
                <span>{videoModal.label}</span>
                <button
                  type="button"
                  className="videoModalClose"
                  onClick={() => setVideoModal(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="videoModalFrame">
                <iframe
                  src={`https://www.youtube.com/embed/${videoModal.videoId}?autoplay=1${videoModal.startSeconds != null ? `&start=${videoModal.startSeconds}` : ""}${videoModal.endSeconds != null ? `&end=${videoModal.endSeconds}` : ""}`}
                  title={videoModal.label}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {checkinOpen && (
          <div
            className="videoModalBackdrop checkinBackdrop"
            onClick={() => setCheckinOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Daily check-in"
          >
            <div className="checkinModal" onClick={(e) => e.stopPropagation()}>
              <div className="videoModalHeader">
                <span>Daily check-in</span>
                <button
                  type="button"
                  className="videoModalClose"
                  onClick={() => setCheckinOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="checkinIntro">
                Answer 5 quick questions. Your programme will adapt today’s session (volume, intensity, or alternatives).
              </p>
              <div className="checkinForm">
                <label>
                  <span>1. Readiness (1–10)</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={checkinForm.readiness}
                    onChange={(e) =>
                      setCheckinForm((f) => ({ ...f, readiness: +e.target.value }))
                    }
                  />
                  <span className="rangeVal">{checkinForm.readiness}</span>
                </label>
                <label>
                  <span>2. How do you feel?</span>
                  <select
                    value={checkinForm.feel}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        feel: e.target.value as "good" | "okay" | "poor",
                      }))
                    }
                  >
                    <option value="good">Good</option>
                    <option value="okay">Okay</option>
                    <option value="poor">Poor</option>
                  </select>
                </label>
                <label>
                  <span>3. Any pain?</span>
                  <select
                    value={checkinForm.pain}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        pain: e.target.value as "none" | "yes",
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="yes">Yes</option>
                  </select>
                  {checkinForm.pain === "yes" && (
                    <input
                      type="text"
                      placeholder="Where? (e.g. lower back, knee)"
                      value={checkinForm.painAreas}
                      onChange={(e) =>
                        setCheckinForm((f) => ({ ...f, painAreas: e.target.value }))
                      }
                      className="checkinText"
                    />
                  )}
                </label>
                <label>
                  <span>4. Energy level?</span>
                  <select
                    value={checkinForm.energy}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        energy: e.target.value as "low" | "medium" | "high",
                      }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label>
                  <span>5. Sleep last night?</span>
                  <select
                    value={checkinForm.sleep}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        sleep: e.target.value as "poor" | "okay" | "good",
                      }))
                    }
                  >
                    <option value="poor">Poor</option>
                    <option value="okay">Okay</option>
                    <option value="good">Good</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="completeBtn checkinSubmit"
                  onClick={submitCheckin}
                  disabled={checkinSubmitting}
                >
                  {checkinSubmitting ? "Saving…" : "Save & adapt programme"}
                </button>
              </div>
            </div>
          </div>
        )}

        {debriefOpen && (
          <div
            className="videoModalBackdrop checkinBackdrop"
            onClick={() => setDebriefOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Post-session debrief"
          >
            <div className="checkinModal" onClick={(e) => e.stopPropagation()}>
              <div className="videoModalHeader">
                <span>Quick debrief — {debriefSessionName}</span>
                <button
                  type="button"
                  className="videoModalClose"
                  onClick={() => setDebriefOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="checkinIntro">
                2–3 quick questions to recalibrate next session.
              </p>
              <div className="checkinForm">
                <label>
                  <span>1. How did that feel? (1–5)</span>
                  <select
                    value={debriefForm.howFelt}
                    onChange={(e) =>
                      setDebriefForm((f) => ({ ...f, howFelt: +e.target.value }))
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} — {n <= 2 ? "rough" : n === 3 ? "okay" : "good"}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>2. Any niggles or pain?</span>
                  <input
                    type="text"
                    placeholder="e.g. knee, lower back"
                    value={debriefForm.niggles}
                    onChange={(e) =>
                      setDebriefForm((f) => ({ ...f, niggles: e.target.value }))
                    }
                    className="checkinText"
                  />
                </label>
                <label>
                  <span>3. Ready for next session? (1–5)</span>
                  <select
                    value={debriefForm.readyNext}
                    onChange={(e) =>
                      setDebriefForm((f) => ({ ...f, readyNext: +e.target.value }))
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} — {n <= 2 ? "need recovery" : n === 3 ? "neutral" : "ready"}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="completeBtn checkinSubmit"
                  onClick={submitDebrief}
                  disabled={debriefSubmitting}
                >
                  {debriefSubmitting ? "Saving…" : "Done"}
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>

        <style jsx>{`
        .outer {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.12), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.08), transparent 40%),
            linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%);
          color: #fff;
          position: relative;
          overflow-x: hidden;
        }
        .outer::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.4;
          pointer-events: none;
        }
        .programmeNav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative;
          z-index: 1;
        }
        .programmeBrand {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.6;
        }
        .programmeTabs {
          display: flex;
          gap: 30px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
          position: relative;
          z-index: 1;
        }

        .header { margin-bottom:48px; }

        .phase {
          font-size:12px;
          opacity:0.6;
          letter-spacing:2px;
        }

        .headline {
          font-size:28px;
          font-weight:700;
          margin:16px 0 8px;
          letter-spacing:-0.02em;
          line-height:1.25;
        }

        .meta {
          opacity:0.7;
          font-size:14px;
        }

        .builtFor {
          font-size:14px;
          opacity:0.9;
          margin:8px 0 4px;
        }

        .builtFor strong { font-weight:600; }

        .philosophy {
          font-size:13px;
          opacity:0.8;
          max-width:720px;
          margin:12px 0 16px;
          line-height:1.5;
        }

        .markers {
          font-size:12px;
          opacity:0.65;
          margin-top:8px;
        }

        .markersLabel { opacity:0.85; }

        .markersMore { opacity:0.75; }

        .checkinRow {
          display:flex;
          align-items:center;
          gap:16px;
          flex-wrap:wrap;
          margin-bottom:28px;
          padding:20px 24px;
          background:linear-gradient(135deg, rgba(47,128,237,0.12), rgba(39,224,166,0.08));
          border:1px solid rgba(47,128,237,0.35);
          border-radius:16px;
        }

        .advisoriesWrap {
          margin-bottom:28px;
        }

        .dailyCheckinBtn {
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding:14px 24px;
          background:rgba(47,128,237,0.4);
          border:1px solid rgba(47,128,237,0.7);
          border-radius:12px;
          color:#fff;
          font-weight:600;
          font-size:15px;
          cursor:pointer;
          box-shadow:0 2px 12px rgba(47,128,237,0.25);
        }

        .dailyCheckinBtn:hover {
          background:rgba(47,128,237,0.55);
          box-shadow:0 4px 16px rgba(47,128,237,0.35);
        }

        .dailyCheckinBtnIcon {
          opacity:0.9;
          font-size:14px;
        }

        .adaptationBadge {
          font-size:12px;
          opacity:0.85;
          padding:6px 12px;
          background:rgba(39,224,166,0.15);
          border-radius:8px;
          color:#6ee7b7;
        }

        .checkinBackdrop { align-items:flex-start; padding-top:48px; }

        .checkinModal {
          background:#0A1220;
          border-radius:16px;
          overflow:hidden;
          max-width:420px;
          width:100%;
          border:1px solid rgba(255,255,255,0.1);
        }

        .checkinIntro {
          padding:0 18px 16px;
          font-size:13px;
          opacity:0.85;
          line-height:1.45;
        }

        .checkinForm {
          padding:0 18px 20px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .checkinForm label {
          display:flex;
          flex-direction:column;
          gap:6px;
          font-size:13px;
        }

        .checkinForm label span:first-of-type { opacity:0.9; }

        .checkinForm input[type="range"] {
          width:100%;
          accent-color:#2F80ED;
        }

        .checkinForm select {
          padding:8px 12px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:white;
          font-size:14px;
        }

        .checkinText {
          padding:8px 12px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:white;
          font-size:14px;
        }

        .rangeVal {
          font-weight:600;
          opacity:1;
        }

        .checkinSubmit { margin-top:8px; }

        .briefAndLog {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:28px;
          margin-bottom:40px;
        }
        @media (max-width: 768px) {
          .briefAndLog { grid-template-columns:1fr; }
        }
        .briefWrap, .decisionLogWrap { min-width:0; }

        .performanceAdjustmentsWrap {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px 20px;
        }
        .performanceAdjustmentsTitle {
          font-size: 11px;
          letter-spacing: 0.08em;
          opacity: 0.65;
          margin-bottom: 12px;
        }
        .performanceAdjustmentsSignal {
          background: rgba(255,255,255,0.05);
          padding: 18px;
          border-radius: 16px;
          margin-bottom: 12px;
        }
        .performanceAdjustmentsSignal:last-child { margin-bottom: 0; }
        .performanceAdjustmentsSignalTitle { font-weight: 600; margin-bottom: 4px; }
        .performanceAdjustmentsSignalSub { opacity: 0.6; font-size: 13px; line-height: 1.4; }

        .weekIntro {
          margin-bottom:28px;
        }
        .weekIntroTitle {
          font-size:18px;
          font-weight:600;
          margin:0 0 8px;
          letter-spacing:-0.01em;
        }
        .weekIntroSub {
          font-size:14px;
          opacity:0.8;
          margin:0;
          line-height:1.5;
        }

        .weekGrid {
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));
          gap:20px;
        }
        @media (max-width: 768px) {
          .weekGrid { grid-template-columns:1fr; }
        }

        .dayCard {
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:16px;
          overflow:hidden;
          transition:background 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .dayCardExpanded {
          background:rgba(255,255,255,0.07);
          border-color:rgba(47,128,237,0.25);
          box-shadow:0 8px 32px rgba(0,0,0,0.3);
        }

        .dayHeader {
          width:100%;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:18px 20px;
          font-size:15px;
          font-weight:600;
          text-align:left;
          color:inherit;
          background:none;
          border:none;
          cursor:pointer;
          transition:background 0.2s;
        }
        .dayHeader:hover {
          background:rgba(255,255,255,0.05);
        }
        .dayHeaderLabel { flex:1; }
        .dayHeaderChevron {
          font-size:10px;
          opacity:0.7;
          margin-left:8px;
        }

        .blocks {
          padding:0 20px 24px;
          margin-top:0;
          border-top:1px solid rgba(255,255,255,0.06);
          animation:dayExpand 0.25s ease-out;
        }
        @keyframes dayExpand {
          from { opacity:0; }
          to { opacity:1; }
        }

        .programmeCardWrap { margin:20px 0 28px; }

        .blockCard {
          margin-bottom:20px;
          padding:20px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:14px;
        }

        .blockCardHeader {
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:14px;
        }

        .blockCardStep {
          font-size:11px;
          font-weight:600;
          text-transform:uppercase;
          letter-spacing:0.06em;
          color:#2F80ED;
          opacity:0.95;
        }

        .blockCardSection {
          font-size:15px;
          font-weight:600;
          margin:0;
          color:#fff;
        }

        .blockDetailList {
          list-style:none;
          margin:0 0 12px;
          padding:0;
        }

        .blockDetailItem {
          font-size:15px;
          font-weight:500;
          line-height:1.5;
          padding:6px 0;
          border-bottom:1px solid rgba(255,255,255,0.05);
        }
        .blockDetailItem:last-child { border-bottom:none; }

        .blockNotes {
          display:flex;
          gap:10px;
          margin-top:12px;
          padding:12px 14px;
          background:rgba(0,0,0,0.2);
          border-radius:10px;
          border-left:3px solid rgba(47,128,237,0.5);
        }

        .blockNotesIcon { font-size:14px; flex-shrink:0; }
        .blockNotesText {
          font-size:13px;
          opacity:0.85;
          line-height:1.5;
          margin:0;
        }

        .exerciseVideos {
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          gap:8px;
          margin-top:14px;
        }

        .videoLabel {
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:0.05em;
          opacity:0.7;
          margin-right:8px;
        }

        .videoBtn {
          padding:8px 14px;
          font-size:13px;
          background:rgba(47,128,237,0.2);
          border:1px solid rgba(47,128,237,0.4);
          border-radius:8px;
          color:#93c5fd;
          cursor:pointer;
          transition:background 0.2s, border-color 0.2s;
        }

        .videoBtn:hover {
          background:rgba(47,128,237,0.35);
          border-color:rgba(47,128,237,0.6);
        }

        .sessionActions {
          margin-top:24px;
          padding:18px 20px;
          background:rgba(47,128,237,0.08);
          border:1px solid rgba(47,128,237,0.2);
          border-radius:12px;
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          gap:12px;
        }

        .sessionActionBtn {
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:12px 20px;
          background:rgba(47,128,237,0.3);
          border:1px solid rgba(47,128,237,0.5);
          border-radius:10px;
          color:#fff;
          font-size:14px;
          font-weight:600;
          cursor:pointer;
          transition:opacity 0.2s, transform 0.2s;
        }
        .sessionActionBtn:hover {
          opacity:0.95;
          transform:translateY(-1px);
        }
        .sessionActionIcon { font-size:16px; }
        .sessionActionHint {
          font-size:13px;
          opacity:0.75;
        }

        .videoModalBackdrop {
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.75);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:1000;
          padding:24px;
        }

        .videoModal {
          background:#0A1220;
          border-radius:16px;
          overflow:hidden;
          max-width:900px;
          width:100%;
          border:1px solid rgba(255,255,255,0.1);
        }

        .videoModalHeader {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:14px 18px;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }

        .videoModalClose {
          background:none;
          border:none;
          color:white;
          font-size:24px;
          cursor:pointer;
          opacity:0.8;
          line-height:1;
        }

        .videoModalClose:hover { opacity:1; }

        .videoModalFrame {
          position:relative;
          padding-bottom:56.25%;
          height:0;
        }

        .videoModalFrame iframe {
          position:absolute;
          top:0;
          left:0;
          width:100%;
          height:100%;
          border:none;
        }

        .completeBtn {
          margin-top:24px;
          padding:14px 24px;
          width:100%;
          max-width:280px;
          background:linear-gradient(135deg, #2F80ED, #2563eb);
          border:none;
          border-radius:12px;
          color:white;
          font-size:15px;
          font-weight:600;
          cursor:pointer;
          transition:opacity 0.2s, transform 0.2s;
        }
        .completeBtn:hover {
          opacity:0.95;
          transform:translateY(-1px);
        }
        .completeBtn:active {
          transform:translateY(0);
        }
      `}</style>
      </OSLayer>
    </RequireAuth>
  );
}