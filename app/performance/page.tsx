"use client";

import { useEffect, useState } from "react";
import OSLayer from "@/app/components/OSLayer";
import { RequireAuth } from "@/lib/requireAuth";
import { supabase } from "@/lib/supabaseClient";

type SessionsThisWeek = { completed: number; planned: number };

type ProfileData = {
  archetype?: string | null;
  primary_limiter?: string | null;
  momentum?: string | null;
  strength_upper?: number | null;
  strength_lower?: number | null;
  aerobic_score?: number | null;
  sleep_score?: number | null;
  mobility_score?: number | null;
  readiness_score?: number | null;
  checkin_readiness?: number | null;
  checkin_date?: string | null;
  deload_active?: boolean | null;
  current_week?: number | null;
  completed_sessions?: number | null;
  focus?: string | null;
  signals?: string | unknown[] | null;
};

function getReadiness(profile: ProfileData | null): number {
  if (!profile) return 70;
  const today = new Date().toISOString().slice(0, 10);
  const useCheckin = profile.checkin_date === today;
  const raw = useCheckin
    ? profile.checkin_readiness ?? profile.readiness_score ?? 70
    : profile.readiness_score ?? 70;
  return typeof raw === "number" ? raw : 70;
}

function getPhase(week: number): string {
  const w = week % 6 || 6;
  if (w <= 2) return "Accumulation";
  if (w <= 4) return "Intensification";
  if (w === 5) return "Overreach";
  return "Deload";
}

function momentumColor(momentum: string | null | undefined): string {
  if (!momentum) return "rgba(238,240,244,0.4)";
  const m = String(momentum).toLowerCase();
  if (m === "building") return "#00c9a0";
  if (m === "stable") return "#0A84FF";
  if (m === "declining") return "#ef4444";
  return "rgba(238,240,244,0.4)";
}

type SignalRow = { name?: string; note?: string; gap?: number };
function parseSignals(signals: string | unknown[] | null | undefined): SignalRow[] {
  if (signals == null) return [];
  if (Array.isArray(signals)) return signals as SignalRow[];
  if (typeof signals === "string") {
    try {
      const parsed = JSON.parse(signals);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

const CARD = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 20,
  padding: 20,
};

const RADAR_SIZE = 240;
const RADAR_CX = RADAR_SIZE / 2;
const RADAR_CY = RADAR_SIZE / 2;
const RADAR_R = 90;
const AXES = [
  { key: "strength_upper", label: "Strength Upper" },
  { key: "strength_lower", label: "Strength Lower" },
  { key: "aerobic", label: "Aerobic" },
  { key: "sleep", label: "Sleep" },
  { key: "mobility", label: "Mobility" },
  { key: "readiness", label: "Readiness" },
] as const;

function CapacityRadar({ profile }: { profile: ProfileData | null }) {
  const values = [
    profile?.strength_upper != null ? profile.strength_upper : 50,
    profile?.strength_lower != null ? profile.strength_lower : 50,
    profile?.aerobic_score != null ? profile.aerobic_score : 50,
    profile?.sleep_score != null ? profile.sleep_score : 50,
    profile?.mobility_score != null ? profile.mobility_score : 50,
    getReadiness(profile),
  ];
  const toPoint = (axisIndex: number, ratio: number) => {
    const angle = ((-90 + axisIndex * 60) * Math.PI) / 180;
    const r = RADAR_R * ratio;
    return {
      x: RADAR_CX + r * Math.cos(angle),
      y: RADAR_CY + r * Math.sin(angle),
    };
  };
  const dataPoints = values.map((v, i) => toPoint(i, Math.min(1, Math.max(0, v / 100))));
  const outerPoints = AXES.map((_, i) => toPoint(i, 1));
  const dataPoly = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const outerPoly = outerPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <section style={{ ...CARD, gridColumn: "1 / -1" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(238,240,244,0.28)", marginBottom: 12, textTransform: "uppercase" }}>
        Capacity Radar
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <circle
              key={ratio}
              cx={RADAR_CX}
              cy={RADAR_CY}
              r={RADAR_R * ratio}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          ))}
          {/* Axis lines and outer hexagon */}
          <polygon
            points={outerPoly}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
          {AXES.map((_, i) => {
            const end = toPoint(i, 1);
            return (
              <line
                key={i}
                x1={RADAR_CX}
                y1={RADAR_CY}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            );
          })}
          {/* Data polygon */}
          <polygon
            points={dataPoly}
            fill="rgba(0,201,160,0.15)"
            stroke="#00c9a0"
            strokeWidth={2}
          />
          {/* Axis labels and values - rendered below SVG so we can use HTML */}
        </svg>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px 24px", marginTop: 12 }}>
        {AXES.map((axis, i) => (
          <div key={axis.key} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "rgba(238,240,244,0.4)" }}>{axis.label}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(238,240,244,0.95)" }}>
              {Math.round(values[i])}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PerformancePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sessionsThisWeek, setSessionsThisWeek] = useState<SessionsThisWeek | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (mounted) setLoading(false);
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "archetype, primary_limiter, momentum, strength_upper, strength_lower, aerobic_score, sleep_score, mobility_score, readiness_score, checkin_readiness, checkin_date, deload_active, current_week, completed_sessions, focus, signals"
        )
        .eq("id", session.user.id)
        .maybeSingle();
      if (mounted) setProfile(profileData ?? null);

      const res = await fetch("/api/today-session");
      const json = res.ok ? await res.json() : null;
      if (mounted && json?.sessionsThisWeek) setSessionsThisWeek(json.sessionsThisWeek);
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <RequireAuth>
        <OSLayer>
          <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(238,240,244,0.55)", fontSize: 14 }}>
            Loading…
          </div>
        </OSLayer>
      </RequireAuth>
    );
  }

  const weekNum = profile?.current_week ?? 1;
  const phase = getPhase(weekNum);
  const completed = sessionsThisWeek?.completed ?? 0;
  const planned = sessionsThisWeek?.planned ?? 4;
  const strengthUpper = profile?.strength_upper != null ? profile.strength_upper : 50;
  const strengthLower = profile?.strength_lower != null ? profile.strength_lower : 50;
  const aerobicScore = profile?.aerobic_score != null ? profile.aerobic_score : 50;
  const mobilityScore = profile?.mobility_score != null ? profile.mobility_score : 50;
  const signalsList = parseSignals(profile?.signals);

  return (
    <RequireAuth>
      <OSLayer>
        <div className="performance-dashboard">
          <style>{`
            .performance-dashboard {
              max-width: 860px;
              margin: 0 auto;
              padding: 0 16px 24px;
              display: grid;
              grid-template-columns: 1fr;
              gap: 12px;
            }
            @media (min-width: 640px) {
              .performance-dashboard {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            .performance-dashboard .full-width { grid-column: 1 / -1; }
          `}</style>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(238,240,244,0.95)", margin: "0 0 16px", gridColumn: "1 / -1" }}>
            Performance Dashboard
          </h1>

          {/* 1. Archetype card — full width */}
          <section style={{ ...CARD, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(238,240,244,0.28)", marginBottom: 8, textTransform: "uppercase" }}>
              Archetype
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: "rgba(238,240,244,0.95)", margin: "0 0 6px" }}>
              {profile?.archetype ?? "—"}
            </p>
            <p style={{ fontSize: 13, color: "rgba(238,240,244,0.55)", margin: "0 0 10px" }}>
              {profile?.primary_limiter ?? "—"}
            </p>
            <span
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: 999,
                background: momentumColor(profile?.momentum) + "22",
                color: momentumColor(profile?.momentum),
              }}
            >
              {profile?.momentum ?? "—"}
            </span>
          </section>

          {/* 2. Capacity Radar — full width */}
          <CapacityRadar profile={profile} />

          {/* 3. Capacity Bars — full width */}
          <section style={{ ...CARD, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(238,240,244,0.28)", marginBottom: 12, textTransform: "uppercase" }}>
              Capacity Bars
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                  <div style={{ height: 6, borderRadius: 9999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, value))}%`,
                        background: "linear-gradient(90deg, #0A84FF, #00c9a0)",
                        borderRadius: 9999,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Training Status — 2 col */}
          <section style={CARD}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(238,240,244,0.28)", marginBottom: 8, textTransform: "uppercase" }}>
              Training Status
            </div>
            <p style={{ fontSize: 14, color: "rgba(238,240,244,0.95)", margin: "0 0 4px" }}>
              Week {weekNum}
            </p>
            <p style={{ fontSize: 13, color: "rgba(238,240,244,0.55)", margin: "0 0 8px" }}>
              {phase}
            </p>
            {profile?.deload_active && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                Deload active
              </span>
            )}
          </section>
          <section style={CARD}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(238,240,244,0.28)", marginBottom: 8, textTransform: "uppercase" }}>
              This Week
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "rgba(238,240,244,0.95)", margin: "0 0 4px" }}>
              {completed}
            </p>
            <p style={{ fontSize: 13, color: "rgba(238,240,244,0.55)", margin: 0 }}>
              of {planned} planned
            </p>
          </section>

          {/* 5. Focus card — full width */}
          <section style={{ ...CARD, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(238,240,244,0.28)", marginBottom: 8, textTransform: "uppercase" }}>
              Focus
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "rgba(238,240,244,0.95)", margin: "0 0 16px" }}>
              {profile?.focus ?? "—"}
            </p>
            {signalsList.length === 0 ? (
              <p style={{ fontSize: 13, color: "rgba(238,240,244,0.55)", margin: 0 }}>No signals yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {signalsList.map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(238,240,244,0.95)", marginBottom: 2 }}>
                        {item.name ?? "—"}
                      </div>
                      {item.note && (
                        <div style={{ fontSize: 12, color: "rgba(238,240,244,0.55)" }}>{item.note}</div>
                      )}
                    </div>
                    {item.gap != null && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(238,240,244,0.95)",
                        }}
                      >
                        {item.gap}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
