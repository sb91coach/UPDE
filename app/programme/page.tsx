"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { ProgrammeType } from "@/lib/trainingTargets";
import { getExerciseVideos } from "@/lib/exerciseVideos";
import { getBenchmarks } from "@/engine/benchmarkEngine";
import { prescribe } from "@/engine/prescriptionEngine";
import { EXERCISE_DISPLAY_NAMES } from "@/lib/profile/benchmarkSchema";
import ProgrammeCard from "@/app/ui/ProgrammeCard";

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
  const [expanded, setExpanded] = useState<number | null>(null);
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

  const adaptation = getAdaptation();

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

  const experience = p.experience?.toLowerCase() || "beginner";

  const setsMain =
    experience.includes("advanced") ? 5 :
    experience.includes("intermediate") ? 4 :
    3;

  const rpeTarget =
    experience.includes("advanced") ? "8–9" :
    experience.includes("intermediate") ? "7–8" :
    "6–7";

  function prescribe(base: number) {
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

    const volScale = adapt === "reduce" ? 0.6 : adapt === "increase" ? 1.2 : 1;
    const intensityScaleAdapt = adapt === "reduce" ? 0.85 : adapt === "increase" ? 1.05 : 1;
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

    cardExercises.push({
      letter: "A",
      title: EXERCISE_DISPLAY_NAMES[mainLiftKeys[0]] ?? mainLift.split(" (or")[0].trim(),
      prescription: prescribe(benchmarks, mainLiftKeys[0], {
        sets: setsAdapted,
        reps: "3–5",
        percentage: 0.8,
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
        percentage: 0.75,
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

  async function completeSession(name: string) {
    await supabase.from("session_logs").insert({
      profile_id: p.id,
      week,
      session_name: name,
      perceived_exertion: p.readiness_score,
      completed: true,
    });

    await supabase
      .from("profiles")
      .update({
        fatigue_score: p.fatigue_score + 5,
      })
      .eq("id", p.id);

    window.location.reload();
  }

  return (
    <div className="outer">
      <div className="topNav">
        <div className="logo">Performance Pathfinder</div>
        <div className="tabs">
          <button onClick={() => router.push("/profile")}>
            Dashboard
          </button>
          <button className="active">
            Programme
          </button>
          <button onClick={() => router.push("/checkin")}>
            Check-In
          </button>
          <button onClick={() => router.push("/benchmarks")}>
            Benchmarks
          </button>
        </div>
      </div>

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

        <div className="weekGrid">
          {sessions.map((day, i) => (
            <div key={i} className="dayCard">
              <div
                className="dayHeader"
                onClick={() =>
                  setExpanded(expanded === i ? null : i)
                }
              >
                {day.title}
              </div>

              {expanded === i && (
                <div className="blocks">
                  {"card" in day && day.card && (
                    <div className="programmeCardWrap">
                      <ProgrammeCard
                        sessionTitle={day.card.sessionTitle}
                        sessionSubtitle={day.card.sessionSubtitle}
                        duration={day.card.duration}
                        intensity={day.card.intensity}
                        primaryFocus={day.card.primaryFocus}
                        exercises={day.card.exercises}
                      />
                    </div>
                  )}
                  {day.blocks.map((block, j) => {
                    const videos = getExerciseVideos(block.exerciseKeys || []);
                    const lines = block.detailLines && block.detailLines.length > 0
                      ? block.detailLines
                      : [block.detail];
                    return (
                      <div key={j} className="block">
                        <div className="section">
                          {block.section}
                        </div>
                        <div className="detailList">
                          {lines.map((line, k) => (
                            <div key={k} className="detail">
                              {line}
                            </div>
                          ))}
                        </div>
                        <div className="notes">
                          {block.notes}
                        </div>
                        {videos.length > 0 && (
                          <div className="exerciseVideos">
                            <span className="videoLabel">Videos:</span>
                            {videos.map((v) => (
                              <button
                                key={v.videoId + v.label}
                                type="button"
                                className="videoBtn"
                                onClick={() =>
                                  setVideoModal({
                                    videoId: v.videoId,
                                    label: v.label,
                                    startSeconds: v.startSeconds,
                                    endSeconds: v.endSeconds,
                                  })
                                }
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    className="completeBtn"
                    onClick={() =>
                      completeSession(day.title)
                    }
                  >
                    Mark Complete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

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
      </div>

      <style jsx>{`
        .outer {
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.15), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.12), transparent 40%),
            #0A1220;
          min-height:100vh;
          color:white;
        }

        .topNav {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:20px 40px;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }

        .logo {
          font-weight:600;
          letter-spacing:1px;
          opacity:0.8;
        }

        .tabs button {
          margin-left:16px;
          background:none;
          border:none;
          color:white;
          cursor:pointer;
          opacity:0.6;
        }

        .tabs .active {
          opacity:1;
          font-weight:600;
        }

        .container {
          max-width:1400px;
          margin:60px auto;
          padding:0 40px;
        }

        .header { margin-bottom:40px; }

        .phase {
          font-size:12px;
          opacity:0.6;
          letter-spacing:2px;
        }

        .headline {
          font-size:32px;
          margin:12px 0;
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

        .weekGrid {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:30px;
        }

        .dayCard {
          background:rgba(255,255,255,0.06);
          padding:22px;
          border-radius:20px;
        }

        .dayHeader {
          font-weight:600;
          cursor:pointer;
        }

        .blocks { margin-top:16px; }

        .programmeCardWrap { margin-bottom:24px; }

        .block { margin-bottom:16px; }

        .section {
          font-size:12px;
          opacity:0.6;
        }

        .detailList {
          display:flex;
          flex-direction:column;
          gap:6px;
        }

        .detail {
          font-size:14px;
          font-weight:500;
        }

        .notes {
          font-size:12px;
          opacity:0.7;
        }

        .exerciseVideos {
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          gap:8px;
          margin-top:10px;
        }

        .videoLabel {
          font-size:11px;
          opacity:0.65;
          margin-right:4px;
        }

        .videoBtn {
          padding:4px 10px;
          font-size:12px;
          background:rgba(47,128,237,0.25);
          border:1px solid rgba(47,128,237,0.5);
          border-radius:6px;
          color:#93c5fd;
          cursor:pointer;
        }

        .videoBtn:hover {
          background:rgba(47,128,237,0.4);
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
          margin-top:16px;
          padding:10px 16px;
          background:#2F80ED;
          border:none;
          border-radius:8px;
          color:white;
          cursor:pointer;
        }
      `}</style>
    </div>
  );
}