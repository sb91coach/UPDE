"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ======================================================
   PROFILE TYPE
====================================================== */

type Profile = {
  id: string;
  goal: string;
  sport: string;
  experience: string;
  days_per_week: number;
  minutes_per_session: number;
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
};

/* ======================================================
   PHASE MODEL
====================================================== */

const PHASES = [
  "Accumulation",
  "Accumulation",
  "Intensification",
  "Intensification",
  "Overreach",
  "Deload",
];

export default function ProgrammePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const router = useRouter();

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

  if (!profile) return null;
  const p = profile;

  /* ======================================================
     DERIVED METRICS
  ======================================================= */

  const week = p.current_week || 1;
  const phase = PHASES[week - 1] || "Accumulation";

  const strengthIndex =
    ((p.strength_upper || 60) + (p.strength_lower || 60)) / 2;

  const aerobicIndex = p.aerobic_score || 60;

  const recoveryIndex =
    (p.sleep_score || 60) * 0.6 +
    (100 - (p.stress_level || 40)) * 0.4;

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
     CONDITIONING
  ======================================================= */

  function conditioningPrescription() {
    if (aerobicIndex > strengthIndex) {
      return {
        description: "Threshold Intervals",
        prescription:
          "4 × 6 min @ 85–90% HRmax · 2 min easy recovery",
        intent:
          "Improve lactate clearance and raise VT2 ceiling.",
      };
    }

    return {
      description: "Zone 2 Aerobic Base",
      prescription:
        "30–40 min @ 65–75% HRmax · nasal breathing focus",
      intent:
        "Expand mitochondrial density and aerobic base.",
      };
  }

  /* ======================================================
     SESSION BUILDER
  ======================================================= */

  function buildSession(dayIndex: number) {
    const recoveryDay =
      dayIndex === Math.floor(p.days_per_week / 2);

    if (recoveryDay) {
      return {
        title: `Day ${dayIndex + 1} — Regeneration`,
        blocks: [
          {
            section: "Recovery Flow",
            detail:
              "Zone 1 20–30 min · Mobility circuits · Parasympathetic breathing · HR < 120 bpm",
            notes:
              "Purpose: downregulate CNS and maintain movement quality.",
          },
        ],
      };
    }

    const conditioning = conditioningPrescription();

    return {
      title: `Day ${dayIndex + 1} — ${phase}`,
      blocks: [
        {
          section: "Prep",
          detail:
            "6 min progressive bike → Dynamic mobility → 3×5 pogos",
          notes:
            "Prime CNS without fatigue. Elevate core temp gradually.",
        },
        {
          section: "Main Lift",
          detail:
            `Back Squat · ${setsMain}×3–5 · ${prescribe(0.8)} · Tempo 31X1 · Rest 2–3 min`,
          notes:
            "Intent: Max force production. Terminate if bar speed drops >20%.",
        },
        {
          section: "Secondary Lift",
          detail:
            `Weighted Pull-Up · ${setsMain}×5–6 · ${prescribe(0.75)} · Rest 2 min`,
          notes:
            "Vertical pull strength. Full ROM. Controlled eccentric.",
        },
        {
          section: "Accessory Block",
          detail:
            "Split Squat 3×8 ea · DB Press 3×10 · RDL 3×8 · Rest 60–90s",
          notes:
            "Hypertrophy stimulus + unilateral stability development.",
        },
        {
          section: "Trunk Capacity",
          detail:
            "Med Ball Rotational Throws 3×5 ea · Side Plank 3×30s",
          notes:
            "Enhance rotational power and frontal plane stability.",
        },
        {
          section: "Energy System",
          detail:
            `${conditioning.description} · ${conditioning.prescription}`,
          notes: conditioning.intent,
        },
      ],
    };
  }

  const sessions = Array.from(
    { length: p.days_per_week || 3 },
    (_, i) => buildSession(i)
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
        </div>
      </div>

      <div className="container">
        <div className="header">
          <div className="phase">
            WEEK {week} · {phase}
          </div>

          <h1 className="headline">
            Adaptive Performance Programme
          </h1>

          <div className="meta">
            Strength {Math.round(strengthIndex)} ·
            Aerobic {Math.round(aerobicIndex)} ·
            Recovery {Math.round(recoveryIndex)} ·
            Fatigue {p.fatigue_score}
          </div>
        </div>

        {isDeload && (
          <div className="deload">
            Adaptive Deload Triggered — Volume ↓ 40% · Intensity ↓ 15%
          </div>
        )}

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
                  {day.blocks.map((block, j) => (
                    <div key={j} className="block">
                      <div className="section">
                        {block.section}
                      </div>
                      <div className="detail">
                        {block.detail}
                      </div>
                      <div className="notes">
                        {block.notes}
                      </div>
                    </div>
                  ))}

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

        .deload {
          background:rgba(255,0,0,0.15);
          padding:16px;
          border-radius:12px;
          margin-bottom:30px;
        }

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

        .block { margin-bottom:16px; }

        .section {
          font-size:12px;
          opacity:0.6;
        }

        .detail {
          font-size:14px;
          font-weight:500;
        }

        .notes {
          font-size:12px;
          opacity:0.7;
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