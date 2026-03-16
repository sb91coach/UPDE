"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type TodaySession = {
  sessionTitle: string;
  duration: string;
  intensity: string;
  exercisesCount: number;
  detail: string;
};

type SessionsThisWeek = {
  completed: number;
  planned: number;
};

type ProfileData = {
  name?: string | null;
  readiness_score?: number | null;
  checkin_readiness?: number | null;
  checkin_date?: string | null;
  aerobic_score?: number | null;
  sleep_score?: number | null;
  strength_upper?: number | null;
  strength_lower?: number | null;
  mobility_score?: number | null;
  fatigue_score?: number | null;
  momentum?: number | string | null;
  primary_limiter?: string | null;
  archetype?: string | null;
  deload_active?: boolean | null;
  completed_sessions?: number | null;
  current_week?: number | null;
  focus?: string | null;
  user_preferences?: {
    whoop_connected?: boolean;
    garmin_connected?: boolean;
  } | null;
};

const CARD_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 20,
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(238,240,244,0.28)",
  marginBottom: 12,
};

function getReadinessScore(profile: ProfileData | null): number {
  if (!profile) return 70;
  const today = new Date().toISOString().slice(0, 10);
  const useCheckin = profile.checkin_date === today;
  const raw = useCheckin
    ? profile.checkin_readiness ?? profile.readiness_score ?? 70
    : profile.readiness_score ?? 70;
  return typeof raw === "number" ? raw : 70;
}

function readinessColor(score: number): string {
  if (score >= 75) return "#00c9a0";
  if (score >= 55) return "#f59e0b";
  return "#f04e37";
}

function readinessTag(score: number): string {
  if (score >= 75) return "GREEN";
  if (score >= 55) return "AMBER";
  return "RED";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDateLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function getWeekTrend(readiness: number): number[] {
  const todayIndex = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  })();
  return Array.from({ length: 7 }, (_, i) => {
    const delta = (i - todayIndex) * 6 + (i % 2 === 0 ? 5 : -5);
    return Math.min(100, Math.max(0, Math.round(readiness + delta)));
  });
}

function getExercisesForSession(sessionTitle: string): { name: string; sets: string }[] {
  const t = sessionTitle.toLowerCase();
  if (t.includes("upper")) {
    return [
      { name: "Bench Press", sets: "3–4" },
      { name: "Pull-up", sets: "3–4" },
      { name: "Row", sets: "3–4" },
      { name: "OHP", sets: "3–4" },
    ];
  }
  if (t.includes("power") || t.includes("rfd")) {
    return [
      { name: "Hang Clean", sets: "3–4" },
      { name: "Box Jump", sets: "3–4" },
      { name: "Front Squat", sets: "3–4" },
      { name: "Nordic", sets: "3" },
    ];
  }
  if (t.includes("regeneration")) {
    return [
      { name: "Zone 1", sets: "1" },
      { name: "Mobility", sets: "1" },
      { name: "Breathing", sets: "1" },
    ];
  }
  return [
    { name: "Squat", sets: "3–4" },
    { name: "RDL", sets: "3–4" },
    { name: "Split Squat", sets: "3–4" },
    { name: "Leg Press", sets: "3–4" },
  ];
}

function getPhase(currentWeek: number): string {
  const w = currentWeek % 6 || 6;
  if (w <= 2) return "Accumulation";
  if (w <= 4) return "Intensification";
  if (w === 5) return "Overreach";
  return "Deload";
}

function ReadinessRing({ score }: { score: number }) {
  const size = 120;
  const r = 50;
  const circumference = 2 * Math.PI * r;
  const fill = (score / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <defs>
          <linearGradient id="readinessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0A84FF" />
            <stop offset="100%" stopColor="#00c9a0" />
          </linearGradient>
          <filter id="readinessGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#readinessGradient)"
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - fill}
          strokeLinecap="round"
          filter="url(#readinessGlow)"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 42, fontWeight: 700, color: "rgba(238,240,244,0.95)" }}>
          {Math.round(score)}
        </span>
        <span style={{ fontSize: 11, color: "rgba(238,240,244,0.55)", marginTop: 2 }}>
          out of 100
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(238,240,244,0.28)", marginTop: 2, textTransform: "uppercase" }}>
          data-driven composite
        </span>
      </div>
    </div>
  );
}

export default function AthleteHomeDashboard() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [todaySession, setTodaySession] = useState<TodaySession | null>(null);
  const [sessionsThisWeek, setSessionsThisWeek] = useState<SessionsThisWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const whoopConnected =
    (profile?.user_preferences as { whoop_connected?: boolean } | undefined)?.whoop_connected ?? false;
  const garminConnected =
    (profile?.user_preferences as { garmin_connected?: boolean } | undefined)?.garmin_connected ?? false;

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "name, readiness_score, checkin_readiness, checkin_date, aerobic_score, sleep_score, strength_upper, strength_lower, mobility_score, fatigue_score, momentum, primary_limiter, archetype, deload_active, completed_sessions, current_week, focus, user_preferences"
        )
        .eq("id", session.user.id)
        .maybeSingle();

      if (mounted) setProfile(profileData ?? null);

      const res = await fetch("/api/today-session");
      const json = res.ok ? await res.json() : null;
      if (mounted && json?.todaySession) setTodaySession(json.todaySession);
      if (mounted && json?.sessionsThisWeek) setSessionsThisWeek(json.sessionsThisWeek);

      if (mounted) setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!whoopConnected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/whoop/sync", { method: "GET" });
        if (!cancelled && !res.ok) {
          // ignore errors; dashboard can still render
        }
      } catch {
        // ignore network errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [whoopConnected]);

  useEffect(() => {
    if (!garminConnected) return;
    (async () => {
      try {
        await fetch("/api/garmin/sync", { method: "GET" });
      } catch {
        // ignore
      }
    })();
  }, [garminConnected]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(238,240,244,0.55)",
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  const readiness = getReadinessScore(profile);
  const session = todaySession ?? {
    sessionTitle: "Lower Body Strength",
    duration: "55 min",
    intensity: "Moderate–High",
    exercisesCount: 4,
    detail: "Force production focus",
  };
  const displayName = profile?.name?.trim() || "Athlete";
  const trend = getWeekTrend(readiness);
  const todayIndex = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  })();
  const exercises = getExercisesForSession(session.sessionTitle);

  const sleepScore = profile?.sleep_score != null ? profile.sleep_score : 50;
  const aerobicScore = profile?.aerobic_score != null ? profile.aerobic_score : 50;
  const fatigueScore = profile?.fatigue_score != null ? profile.fatigue_score : 50;
  const strengthUpper = profile?.strength_upper != null ? profile.strength_upper : 50;
  const strengthLower = profile?.strength_lower != null ? profile.strength_lower : 50;
  const mobilityScore = profile?.mobility_score != null ? profile.mobility_score : 50;

  const completed = sessionsThisWeek?.completed ?? 0;
  const planned = sessionsThisWeek?.planned ?? 4;
  const weekNum = profile?.current_week ?? 1;
  const momentum = profile?.momentum != null ? String(profile.momentum) : "—";

  return (
    <div className="athlete-dashboard-root">
      <style jsx>{`
        .athlete-dashboard-root {
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px 16px 140px;
        }
        .athlete-dashboard-card {
          padding: 16px;
        }
        .hero-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .hero-card-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dash-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .readiness-body {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
        }
        .readiness-ring-wrap {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .readiness-metrics {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .readiness-metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: rgba(238,240,244,0.85);
          margin-bottom: 4px;
        }
        .readiness-metric-label {
          color: rgba(238,240,244,0.6);
        }
        .readiness-metric-value {
          font-weight: 600;
          color: rgba(238,240,244,0.95);
        }
        .readiness-metric-bar {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          overflow: hidden;
        }
        .readiness-metric-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #0A84FF, #00c9a0);
        }
        .readiness-programme {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 12px;
          margin-top: 12px;
          text-align: center;
        }
        .session-meta-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 14px;
        }
        .session-meta-pill {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          color: rgba(238,240,244,0.55);
        }
        .session-exercises {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .session-exercise-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          color: rgba(238,240,244,0.95);
        }
        .session-exercise-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .session-exercise-sets {
          font-size: 12px;
          color: rgba(238,240,244,0.55);
          white-space: nowrap;
        }
        .session-exercise-video {
          display: flex;
          align-items: center;
          color: rgba(238,240,244,0.3);
          font-size: 14px;
          margin-left: 6px;
        }
        .weekly-trend {
          display: flex;
          justify-content: space-between;
          gap: 4px;
        }
        .weekly-trend-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .capacity-card-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (max-width: 639px) {
          .hero-card-meta {
            width: 100%;
          }
          .readiness-body {
            flex-direction: row;
            align-items: flex-start;
          }
          .readiness-ring-wrap {
            transform: scale(0.92);
            transform-origin: top left;
          }
          .session-exercise-name {
            max-width: 60%;
          }
        }
        @media (min-width: 640px) {
          .athlete-dashboard-card {
            padding: 20px;
          }
          .hero-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          .readiness-body {
            align-items: center;
          }
          .readiness-pills {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 8px;
          }
          .dash-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .perf-dashboard-cta:hover {
          background: rgba(255,255,255,0.09) !important;
        }
        .whoop-sync-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: rgba(238,240,244,0.6);
        }
        .whoop-sync-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #00c9a0;
          box-shadow: 0 0 8px rgba(0,201,160,0.6);
          flex-shrink: 0;
        }
      `}</style>

      {/* Whoop sync banner */}
      {whoopConnected && (
        <section className="athlete-dashboard-card" style={CARD_STYLE}>
          <div className="whoop-sync-banner">
            <span className="whoop-sync-dot" aria-hidden />
            <span>Whoop connected — recovery, sleep, and strain are synced automatically.</span>
          </div>
        </section>
      )}

      {/* Hero — full width */}
      <section className="athlete-dashboard-card hero-card" style={CARD_STYLE}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(238,240,244,0.95)", margin: 0, marginBottom: 4 }}>
            {getGreeting()}, {displayName}
          </h1>
          <p style={{ fontSize: 14, color: "rgba(238,240,244,0.55)", margin: 0 }}>
            {getDateLabel()}
          </p>
        </div>
        <div className="hero-card-meta">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: readinessColor(readiness),
              flexShrink: 0,
            }}
            aria-hidden
          />
          <span style={{ fontSize: 20, fontWeight: 800, color: "rgba(238,240,244,0.95)" }}>
            {Math.round(readiness)}%
          </span>
          <span style={{ fontSize: 12, color: "rgba(238,240,244,0.55)" }}>readiness</span>
        </div>
      </section>

      {/* Readiness + Today session grid */}
      <div className="dash-grid">
        {/* Readiness card */}
        <section
          className="athlete-dashboard-card"
          style={{
            ...CARD_STYLE,
            background: "radial-gradient(ellipse at 50% 30%, rgba(10,132,255,0.08) 0%, rgba(10,12,18,0) 70%), rgba(255,255,255,0.04)",
          }}
        >
          <div style={LABEL_STYLE}>Readiness Score</div>
          <div className="readiness-body">
            <div className="readiness-ring-wrap">
              <ReadinessRing score={readiness} />
            </div>
            <div className="readiness-metrics">
              {[
                { label: "Recovery", value: sleepScore },
                { label: "Load", value: fatigueScore },
                { label: "Sentiment", value: Math.round(readiness) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="readiness-metric-row">
                    <span className="readiness-metric-label">{label}</span>
                    <span className="readiness-metric-value">{Math.round(value)}</span>
                  </div>
                  <div className="readiness-metric-bar">
                    <div
                      className="readiness-metric-fill"
                      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="readiness-programme">
            <p style={{ fontSize: 11, color: "rgba(238,240,244,0.55)", margin: "0 0 4px" }}>
              Your programme
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(238,240,244,0.95)", margin: 0 }}>
              {profile?.archetype ?? "Athlete"} · {getPhase(weekNum)}
            </p>
          </div>
        </section>

        {/* Today's session card */}
        <section className="athlete-dashboard-card" style={CARD_STYLE}>
          <div style={LABEL_STYLE}>Today&apos;s Session</div>
          <p style={{ fontSize: 17, fontWeight: 700, color: "rgba(238,240,244,0.95)", margin: "0 0 10px" }}>
            {session.sessionTitle}
          </p>
          <div className="session-meta-pills">
            <span className="session-meta-pill">{session.duration}</span>
            <span className="session-meta-pill">{session.intensity}</span>
          </div>
          <div className="session-exercises">
            {exercises.map((ex) => (
              <div key={ex.name} className="session-exercise-row">
                <span className="session-exercise-name">{ex.name}</span>
                <span className="session-exercise-sets">{ex.sets} sets</span>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " technique 30 seconds")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="session-exercise-video"
                  aria-label={`YouTube: ${ex.name} technique`}
                >
                  ▶
                </a>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          <Link
            href="/programme"
            style={{
              display: "block",
              height: 50,
              borderRadius: 14,
              background: "linear-gradient(135deg, #0A84FF, #7B61FF)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              textAlign: "center",
              lineHeight: "50px",
              textDecoration: "none",
            }}
          >
            Start Workout
          </Link>
          <Link
            href="/performance"
            className="perf-dashboard-cta"
            style={{
              height: 50,
              width: "100%",
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(238,240,244,0.85)",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            >
              Performance Dashboard
            </Link>
          </div>
        </section>
      </div>

      {/* Weekly trend — full width */}
      <section className="athlete-dashboard-card" style={CARD_STYLE}>
        <div style={LABEL_STYLE}>Weekly Readiness Trend</div>
        <div className="weekly-trend">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
            <div
              key={day}
              className="weekly-trend-col"
            >
              <div
                style={{
                  height: 60,
                  width: "100%",
                  maxWidth: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(4, (trend[i] / 100) * 60)}px`,
                    borderRadius: 4,
                    background: i === todayIndex ? "#00c9a0" : "rgba(255,255,255,0.12)",
                  }}
                />
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", color: "rgba(238,240,244,0.28)" }}>
                {day}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Capacity card */}
      <section className="athlete-dashboard-card" style={CARD_STYLE}>
        <div style={LABEL_STYLE}>Capacity Profile</div>
        <div className="capacity-card-list">
          {[
            { label: "Strength Upper", value: strengthUpper },
            { label: "Strength Lower", value: strengthLower },
            { label: "Aerobic Base", value: aerobicScore },
            { label: "Mobility", value: mobilityScore },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12, color: "rgba(238,240,244,0.95)" }}>
                <span>{label}</span>
                <span>{Math.round(value)}/100</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(0, value))}%`,
                    background: "#0A84FF",
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sessions card */}
      <section className="athlete-dashboard-card" style={CARD_STYLE}>
        <div style={LABEL_STYLE}>This Week</div>
        <p style={{ fontSize: 36, fontWeight: 800, color: "rgba(238,240,244,0.95)", margin: "0 0 4px" }}>
          {completed}
        </p>
        <p style={{ fontSize: 13, color: "rgba(238,240,244,0.55)", margin: "0 0 12px" }}>
          of {planned} planned
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: "rgba(238,240,244,0.55)",
            }}
          >
            Momentum: {momentum}
          </span>
          <span style={{ fontSize: 11, color: "rgba(238,240,244,0.28)" }}>Week {weekNum}</span>
        </div>
      </section>
    </div>
  );
}
