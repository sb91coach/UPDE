"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { TRAINING_TARGET_GROUPS } from "@/lib/trainingTargets";

type Option = {
  label: string;
  score?: number;
  programmeType?: string;
};

type Question = {
  id: string;
  text: string;
  type: "select" | "text";
  options?: Option[];
  groupLabel?: string;
};

/* Flat list of all training targets for the first question */
const TRAINING_OPTIONS: Option[] = TRAINING_TARGET_GROUPS.flatMap((g) =>
  g.options.map((o) => ({ label: o.label, programmeType: o.programmeType, score: 70 }))
);

const QUESTIONS: Question[] = [
  {
    id: "goal",
    text: "What are you training for? (sport, course, or goal)",
    type: "select",
    options: TRAINING_OPTIONS,
  },
  {
    id: "days_per_week",
    text: "How many days per week can you train?",
    type: "select",
    options: [
      { label: "2 days", score: 2 },
      { label: "3 days", score: 3 },
      { label: "4 days", score: 4 },
      { label: "5 days", score: 5 },
      { label: "6 days", score: 6 },
    ],
  },
  {
    id: "minutes_per_session",
    text: "Typical session length?",
    type: "select",
    options: [
      { label: "45 min", score: 45 },
      { label: "60 min", score: 60 },
      { label: "75 min", score: 75 },
      { label: "90 min", score: 90 },
      { label: "90+ min", score: 105 },
    ],
  },
  {
    id: "equipment",
    text: "Primary training environment?",
    type: "select",
    options: [
      { label: "Full gym (barbells, racks, cardio)", score: 90 },
      { label: "Limited gym (dumbbells, some kit)", score: 65 },
      { label: "Home (minimal equipment)", score: 45 },
      { label: "Outdoor / bodyweight focus", score: 50 },
    ],
  },
  {
    id: "experience",
    text: "Training experience level?",
    type: "select",
    options: [
      { label: "Beginner", score: 1 },
      { label: "Intermediate", score: 2 },
      { label: "Advanced", score: 3 },
    ],
  },
  {
    id: "sleep",
    text: "Average sleep per night?",
    type: "select",
    options: [
      { label: "5 hours or less", score: 40 },
      { label: "6 hours", score: 60 },
      { label: "7 hours", score: 75 },
      { label: "8+ hours", score: 90 },
    ],
  },
  {
    id: "stress",
    text: "Daily stress level?",
    type: "select",
    options: [
      { label: "High (8–10)", score: 40 },
      { label: "Moderate (4–7)", score: 65 },
      { label: "Low (1–3)", score: 85 },
    ],
  },
  {
    id: "aerobic",
    text: "Current aerobic fitness?",
    type: "select",
    options: [
      { label: "Low", score: 45 },
      { label: "Moderate", score: 65 },
      { label: "High", score: 85 },
    ],
  },
  {
    id: "strength",
    text: "Current strength level?",
    type: "select",
    options: [
      { label: "Low", score: 45 },
      { label: "Moderate", score: 70 },
      { label: "High", score: 85 },
    ],
  },
  {
    id: "mobility",
    text: "Mobility quality?",
    type: "select",
    options: [
      { label: "Limited", score: 45 },
      { label: "Average", score: 65 },
      { label: "Good", score: 85 },
    ],
  },
  {
    id: "injury_notes",
    text: "Any injuries or limitations?",
    type: "text",
  },
];

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [textInput, setTextInput] = useState("");

  const current = QUESTIONS[step];
  const progress = Math.round((step / QUESTIONS.length) * 100);

  async function handleSelect(option: Option) {
    const updated = { ...answers, [current.id]: option };
    setAnswers(updated);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      await buildProfile(updated);
    }
  }

  async function handleTextSubmit() {
    const updated = { ...answers, [current.id]: textInput };
    setAnswers(updated);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      setTextInput("");
    } else {
      await buildProfile(updated);
    }
  }

  async function buildProfile(data: Record<string, any>) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    const aerobic_score = data.aerobic?.score ?? 50;
    const strength_score = data.strength?.score ?? 50;
    const mobility_score = data.mobility?.score ?? 50;
    const sleep_score = data.sleep?.score ?? 50;
    const stress_score = data.stress?.score ?? 50;

    const readiness_score = Math.round(
      aerobic_score * 0.25 +
        strength_score * 0.25 +
        mobility_score * 0.15 +
        sleep_score * 0.20 +
        stress_score * 0.15
    );

    const scores = {
      Aerobic: aerobic_score,
      Strength: strength_score,
      Mobility: mobility_score,
      Sleep: sleep_score,
    };

    const primary_limiter =
      Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];

    const goalLabel = data.goal?.label ?? "General fitness";
    const programmeType = data.goal?.programmeType ?? "hybrid";
    const daysPerWeek = data.days_per_week?.score ?? 3;
    const minutesPerSession = data.minutes_per_session?.score ?? 60;
    const equipmentLabel = data.equipment?.label ?? "Full gym";
    const experienceLabel =
      data.experience?.label ?? "Beginner";

    await supabase.from("profiles").upsert(
      {
        id: session.user.id,
        goal: goalLabel,
        sport: goalLabel,
        focus: programmeType,
        days_per_week: daysPerWeek,
        minutes_per_session: minutesPerSession,
        equipment: equipmentLabel,
        experience: experienceLabel,
        aerobic_score,
        strength_upper: strength_score,
        strength_lower: strength_score,
        mobility_score,
        sleep_score,
        readiness_score,
        primary_limiter,
        injury_notes: data.injury_notes || null,
        momentum: "Building",
      },
      { onConflict: "id" }
    );

    router.push("/profile");
  }

  return (
    <div style={outer}>
      <div style={gridOverlay} />

      <div style={card}>
        <div style={header}>
          <div style={branding}>Performance Pathfinder OS</div>
          <div style={progressBar}>
            <div style={{ ...progressFill, width: `${progress}%` }} />
          </div>
        </div>

        <div style={chatArea}>
          <div style={questionBubble}>{current.text}</div>

          {current.type === "select" && (
            <div style={current.id === "goal" ? optionsScroll : undefined}>
              {current.options?.map((opt, i) => (
                <button
                  key={i}
                  style={optionButton}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {current.type === "text" && (
            <>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type here..."
                style={textArea}
              />
              <button onClick={handleTextSubmit} style={continueButton}>
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const outer = {
  height: "100vh",
  background: "radial-gradient(circle at center,#0E1A2B 0%,#050A14 70%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "relative" as const,
};

const gridOverlay = {
  position: "absolute" as const,
  inset: 0,
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
};

const card = {
  width: 650,
  padding: 40,
  borderRadius: 24,
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(25px)",
  boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
  zIndex: 2,
  display: "flex",
  flexDirection: "column" as const,
};

const header = {
  marginBottom: 30,
};

const branding = {
  fontSize: 14,
  opacity: 0.6,
  marginBottom: 10,
  letterSpacing: 1,
};

const progressBar = {
  height: 4,
  background: "rgba(255,255,255,0.1)",
  borderRadius: 4,
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg,#2F80ED,#6C5CE7)",
};

const chatArea = {
  display: "flex",
  flexDirection: "column" as const,
};

const questionBubble = {
  background: "rgba(255,255,255,0.08)",
  padding: 14,
  borderRadius: 16,
  marginBottom: 20,
};

const optionsScroll = {
  maxHeight: 320,
  overflowY: "auto" as const,
  marginBottom: 8,
};

const optionButton = {
  marginBottom: 12,
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(90deg,#2F80ED,#6C5CE7)",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const continueButton = optionButton;

const textArea = {
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  marginBottom: 15,
};