"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import { computeTrajectory, type TrajectoryResult } from "@/lib/trajectoryEngine";

/* ========== MOCK DATA ========== */

export type TacticalRecord = {
  id: number;
  displayId: string;
  readiness_score: number;
  sleep_score: number;
  injury_marker: string | null;
  operational_output: number;
  capacity_score: number;
  exposure_score: number;
  trend: "up" | "down" | "stable";
  risk_driver: string | null;
  recovery_domain: "green" | "amber" | "red";
  structural_domain: "green" | "amber" | "red";
  output_domain: "green" | "amber" | "red";
  sevenDayRisk: "HIGH" | "MODERATE" | "LOW";
};

const MOCK_DATA: TacticalRecord[] = [
  { id: 1, displayId: "ID 1", readiness_score: 82, sleep_score: 78, injury_marker: null, operational_output: 85, capacity_score: 80, exposure_score: 72, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 2, displayId: "ID 2", readiness_score: 68, sleep_score: 62, injury_marker: null, operational_output: 80, capacity_score: 72, exposure_score: 78, trend: "down", risk_driver: "Recovery Deficit", recovery_domain: "amber", structural_domain: "green", output_domain: "green", sevenDayRisk: "HIGH" },
  { id: 3, displayId: "ID 3", readiness_score: 58, sleep_score: 55, injury_marker: "knee stress", operational_output: 72, capacity_score: 65, exposure_score: 82, trend: "down", risk_driver: "Neuromuscular Fatigue", recovery_domain: "red", structural_domain: "amber", output_domain: "green", sevenDayRisk: "HIGH" },
  { id: 4, displayId: "ID 4", readiness_score: 88, sleep_score: 82, injury_marker: null, operational_output: 90, capacity_score: 72, exposure_score: 88, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 5, displayId: "ID 5", readiness_score: 71, sleep_score: 68, injury_marker: null, operational_output: 74, capacity_score: 70, exposure_score: 68, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "amber", sevenDayRisk: "LOW" },
  { id: 6, displayId: "ID 6", readiness_score: 55, sleep_score: 48, injury_marker: null, operational_output: 60, capacity_score: 58, exposure_score: 75, trend: "down", risk_driver: "Recovery Deficit", recovery_domain: "red", structural_domain: "amber", output_domain: "amber", sevenDayRisk: "HIGH" },
  { id: 7, displayId: "ID 7", readiness_score: 60, sleep_score: 52, injury_marker: null, operational_output: 65, capacity_score: 68, exposure_score: 65, trend: "down", risk_driver: "Recovery Deficit", recovery_domain: "amber", structural_domain: "green", output_domain: "amber", sevenDayRisk: "MODERATE" },
  { id: 8, displayId: "ID 8", readiness_score: 79, sleep_score: 72, injury_marker: null, operational_output: 78, capacity_score: 78, exposure_score: 70, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 9, displayId: "ID 9", readiness_score: 76, sleep_score: 74, injury_marker: null, operational_output: 80, capacity_score: 76, exposure_score: 72, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 10, displayId: "ID 10", readiness_score: 90, sleep_score: 88, injury_marker: null, operational_output: 92, capacity_score: 88, exposure_score: 75, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 11, displayId: "ID 11", readiness_score: 74, sleep_score: 70, injury_marker: null, operational_output: 76, capacity_score: 74, exposure_score: 72, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 12, displayId: "ID 12", readiness_score: 52, sleep_score: 45, injury_marker: null, operational_output: 52, capacity_score: 55, exposure_score: 80, trend: "stable", risk_driver: "Structural Risk", recovery_domain: "red", structural_domain: "amber", output_domain: "red", sevenDayRisk: "HIGH" },
  { id: 13, displayId: "ID 13", readiness_score: 81, sleep_score: 76, injury_marker: null, operational_output: 83, capacity_score: 82, exposure_score: 70, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 14, displayId: "ID 14", readiness_score: 66, sleep_score: 60, injury_marker: null, operational_output: 70, capacity_score: 68, exposure_score: 82, trend: "down", risk_driver: "Exposure Spike", recovery_domain: "amber", structural_domain: "green", output_domain: "green", sevenDayRisk: "HIGH" },
  { id: 15, displayId: "ID 15", readiness_score: 77, sleep_score: 74, injury_marker: null, operational_output: 79, capacity_score: 76, exposure_score: 72, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 16, displayId: "ID 16", readiness_score: 72, sleep_score: 65, injury_marker: null, operational_output: 73, capacity_score: 72, exposure_score: 74, trend: "stable", risk_driver: null, recovery_domain: "amber", structural_domain: "green", output_domain: "green", sevenDayRisk: "MODERATE" },
  { id: 17, displayId: "ID 17", readiness_score: 59, sleep_score: 52, injury_marker: "shoulder", operational_output: 58, capacity_score: 62, exposure_score: 70, trend: "stable", risk_driver: "Structural Risk", recovery_domain: "amber", structural_domain: "red", output_domain: "amber", sevenDayRisk: "HIGH" },
  { id: 18, displayId: "ID 18", readiness_score: 86, sleep_score: 84, injury_marker: null, operational_output: 88, capacity_score: 85, exposure_score: 72, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 19, displayId: "ID 19", readiness_score: 63, sleep_score: 56, injury_marker: null, operational_output: 64, capacity_score: 66, exposure_score: 85, trend: "down", risk_driver: "Load Carriage Exposure", recovery_domain: "red", structural_domain: "amber", output_domain: "amber", sevenDayRisk: "HIGH" },
  { id: 20, displayId: "ID 20", readiness_score: 78, sleep_score: 75, injury_marker: null, operational_output: 80, capacity_score: 78, exposure_score: 68, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
];

function getReadinessBand(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 50) return "amber";
  return "red";
}

function NavTab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
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

const TREND_UP = "↑";
const TREND_DOWN = "↓";
const TREND_STABLE = "→";
function trendLabel(t: "up" | "down" | "stable") {
  return t === "up" ? TREND_UP + " Improving" : t === "down" ? TREND_DOWN + " Declining" : TREND_STABLE + " Stable";
}
function trendArrow(t: "up" | "down" | "stable") {
  return t === "up" ? TREND_UP : t === "down" ? TREND_DOWN : TREND_STABLE;
}

const DECLINE_PREDICTORS = [
  { id: "sleep", label: "Sleep Deficit Trend", trend: "down" as const, risk: "Moderate" },
  { id: "cmj", label: "Neuromuscular Fatigue (CMJ)", trend: "down" as const, risk: "High" },
  { id: "exposure", label: "Exposure Spike", trend: "up" as const, risk: "Moderate" },
  { id: "structural", label: "Structural Stress Marker", trend: "stable" as const, risk: "Low" },
  { id: "output", label: "Operational Output Decline", trend: "down" as const, risk: "Moderate" },
];

function domainToScore(d: "green" | "amber" | "red"): number {
  return d === "green" ? 80 : d === "amber" ? 65 : 50;
}

function syntheticReadinessHistory(score: number, trend: "up" | "down" | "stable"): number[] {
  const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
  if (trend === "down") return [clamp(score + 6), clamp(score + 4), clamp(score + 2), clamp(score + 1), score, clamp(score - 1), clamp(score - 2)];
  if (trend === "up") return [clamp(score - 2), clamp(score - 1), score, clamp(score + 1), clamp(score + 2), clamp(score + 4), clamp(score + 6)];
  return [score, score, score, score, score, score, score];
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="sparklineEmpty">—</span>;
  const w = 80;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="sparklineSvg" viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <polyline points={pts} fill="none" stroke="rgba(47,128,237,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 4px rgba(47,128,237,0.6))" }} />
    </svg>
  );
}

export default function TacticalPage() {
  const pathname = usePathname();
  const [trendScale, setTrendScale] = useState<"daily" | "weekly" | "monthly">("weekly");
  const total = MOCK_DATA.length;

  const { green, amber, red, greenTrend, amberTrend, redTrend } = useMemo(() => {
    const bands = MOCK_DATA.map((o) => ({ band: getReadinessBand(o.readiness_score), trend: o.trend }));
    const g = bands.filter((b) => b.band === "green");
    const a = bands.filter((b) => b.band === "amber");
    const r = bands.filter((b) => b.band === "red");
    const trend = (list: typeof bands) => {
      const u = list.filter((b) => b.trend === "up").length;
      const d = list.filter((b) => b.trend === "down").length;
      return u > d ? "up" : d > u ? "down" : "stable";
    };
    return {
      green: g.length,
      amber: a.length,
      red: r.length,
      greenTrend: trend(g),
      amberTrend: trend(a),
      redTrend: trend(r),
    };
  }, []);

  const greenPct = total ? Math.round((green / total) * 100) : 0;
  const amberPct = total ? Math.round((amber / total) * 100) : 0;
  const redPct = total ? Math.round((red / total) * 100) : 0;

  const bottomThirdCount = Math.max(1, Math.floor(total * 0.3));
  const sortedByReadiness = useMemo(() => [...MOCK_DATA].sort((a, b) => a.readiness_score - b.readiness_score), []);
  const bottomThird = useMemo(() => sortedByReadiness.slice(0, bottomThirdCount), [sortedByReadiness, bottomThirdCount]);
  const topPerformers = useMemo(() => sortedByReadiness.slice(-Math.max(1, Math.floor(total * 0.2))).reverse(), [sortedByReadiness, total]);

  const unitAvgReadiness = useMemo(() => Math.round(MOCK_DATA.reduce((s, o) => s + o.readiness_score, 0) / total), [total]);
  const bottomThirdAvg = useMemo(() => (bottomThird.length ? Math.round(bottomThird.reduce((s, o) => s + o.readiness_score, 0) / bottomThird.length) : 0), [bottomThird]);
  const topAvg = useMemo(() => (topPerformers.length ? Math.round(topPerformers.reduce((s, o) => s + o.readiness_score, 0) / topPerformers.length) : 0), [topPerformers]);

  const trendData = useMemo(() => {
    const points = trendScale === "daily" ? 14 : trendScale === "weekly" ? 12 : 6;
    return Array.from({ length: points }, (_, i) => {
      const t = i / Math.max(1, points - 1);
      return {
        label: trendScale === "daily" ? `D${i + 1}` : trendScale === "weekly" ? `W${i + 1}` : `M${i + 1}`,
        unit: Math.min(98, Math.max(20, unitAvgReadiness + (t - 0.5) * 4 + (i % 2 === 0 ? 1 : -1))),
        bottom: Math.min(95, Math.max(15, bottomThirdAvg + (t - 0.5) * 6)),
        top: Math.min(98, Math.max(60, topAvg + (t - 0.5) * 2)),
      };
    });
  }, [trendScale, unitAvgReadiness, bottomThirdAvg, topAvg]);

  const pillarRecovery = useMemo(() => Math.round(MOCK_DATA.reduce((s, o) => s + o.sleep_score, 0) / total), [total]);
  const pillarStructural = useMemo(() => {
    const scores = MOCK_DATA.map((o) => (o.injury_marker ? 40 : o.readiness_score));
    return Math.round(scores.reduce((a, b) => a + b, 0) / total);
  }, [total]);
  const pillarOperational = useMemo(() => Math.round(MOCK_DATA.reduce((s, o) => s + o.operational_output, 0) / total), [total]);

  const opMetrics = useMemo(
    () => [
      { label: "Load Carriage Pace", value: "5:10/km", trend: "down" as const, impact: "Moderate" },
      { label: "Strength Capacity", value: "92%", trend: "stable" as const, impact: "Low" },
      { label: "Aerobic Endurance", value: "78%", trend: "up" as const, impact: "Low" },
      { label: "Movement Durability", value: "71%", trend: "stable" as const, impact: "Moderate" },
    ],
    []
  );

  const primaryConstraint = "Recovery Deficit";
  const secondaryConstraint = "Neuromuscular Fatigue";
  const emergingRisk = "Exposure Overload";

  const trajectoryRows = useMemo((): (TrajectoryResult & { currentReadiness: number; readinessHistory: number[] })[] => {
    return MOCK_DATA.map((o) => {
      const history = syntheticReadinessHistory(o.readiness_score, o.trend);
      const capacityBuffer = o.capacity_score - o.exposure_score;
      const result = computeTrajectory({
        id: o.displayId,
        readinessHistory: history,
        exposureScore: o.exposure_score,
        recoveryScore: domainToScore(o.recovery_domain),
        structuralScore: domainToScore(o.structural_domain),
        capacityBuffer,
      });
      return { ...result, currentReadiness: o.readiness_score, readinessHistory: history };
    });
  }, []);

  function domainGlow(d: "green" | "amber" | "red") {
    return d === "green"
      ? "0 0 12px rgba(39,224,166,0.5), 0 0 24px rgba(39,224,166,0.2)"
      : d === "amber"
        ? "0 0 12px rgba(234,179,8,0.5), 0 0 24px rgba(234,179,8,0.2)"
        : "0 0 12px rgba(239,68,68,0.5), 0 0 24px rgba(239,68,68,0.2)";
  }
  function domainBg(d: "green" | "amber" | "red") {
    return d === "green" ? "rgba(39,224,166,0.35)" : d === "amber" ? "rgba(234,179,8,0.35)" : "rgba(239,68,68,0.35)";
  }

  const chartHeight = 180;
  const maxVal = 100;
  const minVal = 0;

  return (
    <RequireAuth>
      <OSLayer>
        <div className="tacticalOuter">
          <nav className="tacticalNav">
            <div className="tacticalBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="tacticalTabs">
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

          <div className="tacticalContainer">
            <div className="tacticalHeader">
              <div className="tacticalPhase">TACTICAL</div>
              <h1 className="tacticalHeadline">Tactical Human Performance Intelligence</h1>
              <p className="tacticalSub">Unit readiness, risk, and performance trends. Command centre for human performance.</p>
              <Link href="/tactical/input" className="tacticalBackLink">Daily readiness input →</Link>
            </div>

            {/* SECTION 1 — Unit Readiness Overview (glowing tiles) */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Unit Readiness Overview</h2>
              <div className="tacticalTiles">
                <div className="tacticalTile tacticalTileGreen">
                  <div className="tacticalTileLabel">READY</div>
                  <div className="tacticalTileCount">{green} IDs</div>
                  <div className="tacticalTilePct">{greenPct}%</div>
                  <div className="tacticalTileTrend">{trendLabel(greenTrend)}</div>
                </div>
                <div className="tacticalTile tacticalTileAmber">
                  <div className="tacticalTileLabel">MANAGE</div>
                  <div className="tacticalTileCount">{amber} IDs</div>
                  <div className="tacticalTilePct">{amberPct}%</div>
                  <div className="tacticalTileTrend">{trendLabel(amberTrend)}</div>
                </div>
                <div className="tacticalTile tacticalTileRed">
                  <div className="tacticalTileLabel">RISK</div>
                  <div className="tacticalTileCount">{red} IDs</div>
                  <div className="tacticalTilePct">{redPct}%</div>
                  <div className="tacticalTileTrend">{trendLabel(redTrend)}</div>
                </div>
              </div>
            </section>

            {/* SECTION 2 — Performance Risk Group */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Performance Risk Group</h2>
              <p className="tacticalSectionSub">Bottom ~30% — intervention priority.</p>
              <div className="tacticalTableWrap neonTable">
                <table className="tacticalTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Readiness Score</th>
                      <th>Primary Risk Driver</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bottomThird.map((o) => (
                      <tr key={o.id}>
                        <td>{o.displayId}</td>
                        <td>{o.readiness_score}</td>
                        <td>{o.risk_driver ?? "—"}</td>
                        <td><span className="trendIndicator">{trendArrow(o.trend)}</span> {trendLabel(o.trend).replace(/^[↑↓→]\s*/, "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 3 — Readiness State Map (neon bars) */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Readiness State Map</h2>
              <div className="tacticalPillars">
                <div className="tacticalPillarRow">
                  <span className="tacticalPillarName">Recovery (Sleep)</span>
                  <div className="tacticalPillarBarWrap">
                    <div
                      className="tacticalPillarBar tacticalPillarBarFill neonBar"
                      style={{
                        width: `${pillarRecovery}%`,
                        background: pillarRecovery >= 70 ? "linear-gradient(90deg, rgba(39,224,166,0.9), rgba(39,224,166,0.5))" : pillarRecovery >= 50 ? "linear-gradient(90deg, rgba(234,179,8,0.9), rgba(234,179,8,0.5))" : "linear-gradient(90deg, rgba(239,68,68,0.9), rgba(239,68,68,0.5))",
                        boxShadow: pillarRecovery >= 70 ? "0 0 20px rgba(39,224,166,0.6)" : pillarRecovery >= 50 ? "0 0 20px rgba(234,179,8,0.5)" : "0 0 20px rgba(239,68,68,0.5)",
                      }}
                    />
                  </div>
                  <span className="tacticalPillarVal">{pillarRecovery}%</span>
                </div>
                <div className="tacticalPillarRow">
                  <span className="tacticalPillarName">Structural Integrity</span>
                  <div className="tacticalPillarBarWrap">
                    <div
                      className="tacticalPillarBar tacticalPillarBarFill neonBar"
                      style={{
                        width: `${pillarStructural}%`,
                        background: pillarStructural >= 70 ? "linear-gradient(90deg, rgba(39,224,166,0.9), rgba(39,224,166,0.5))" : pillarStructural >= 50 ? "linear-gradient(90deg, rgba(234,179,8,0.9), rgba(234,179,8,0.5))" : "linear-gradient(90deg, rgba(239,68,68,0.9), rgba(239,68,68,0.5))",
                        boxShadow: pillarStructural >= 70 ? "0 0 20px rgba(39,224,166,0.6)" : pillarStructural >= 50 ? "0 0 20px rgba(234,179,8,0.5)" : "0 0 20px rgba(239,68,68,0.5)",
                      }}
                    />
                  </div>
                  <span className="tacticalPillarVal">{pillarStructural}%</span>
                </div>
                <div className="tacticalPillarRow">
                  <span className="tacticalPillarName">Operational Performance</span>
                  <div className="tacticalPillarBarWrap">
                    <div
                      className="tacticalPillarBar tacticalPillarBarFill neonBar"
                      style={{
                        width: `${pillarOperational}%`,
                        background: pillarOperational >= 70 ? "linear-gradient(90deg, rgba(39,224,166,0.9), rgba(39,224,166,0.5))" : pillarOperational >= 50 ? "linear-gradient(90deg, rgba(234,179,8,0.9), rgba(234,179,8,0.5))" : "linear-gradient(90deg, rgba(239,68,68,0.9), rgba(239,68,68,0.5))",
                        boxShadow: pillarOperational >= 70 ? "0 0 20px rgba(39,224,166,0.6)" : pillarOperational >= 50 ? "0 0 20px rgba(234,179,8,0.5)" : "0 0 20px rgba(239,68,68,0.5)",
                      }}
                    />
                  </div>
                  <span className="tacticalPillarVal">{pillarOperational}%</span>
                </div>
              </div>
            </section>

            {/* SECTION 4 — Readiness Trends (neon line graph) */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Readiness Trends</h2>
              <div className="tacticalTrendControls">
                {(["daily", "weekly", "monthly"] as const).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    className={`tacticalTrendBtn ${trendScale === scale ? "active" : ""}`}
                    onClick={() => setTrendScale(scale)}
                  >
                    {scale.charAt(0).toUpperCase() + scale.slice(1)}
                  </button>
                ))}
              </div>
              <div className="tacticalChartWrap neonChartWrap">
                <div className="tacticalLineChart" style={{ height: chartHeight }}>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ overflow: "visible", display: "block" }}>
                    {(() => {
                      const n = trendData.length;
                      const step = n > 1 ? 100 / (n - 1) : 100;
                      const toY = (v: number) => 100 - (v - minVal) / (maxVal - minVal || 1) * 100;
                      const unitPath = trendData.map((d, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(d.unit)}`).join(" ");
                      const bottomPath = trendData.map((d, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(d.bottom)}`).join(" ");
                      const topPath = trendData.map((d, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(d.top)}`).join(" ");
                      return (
                        <g>
                          <path d={unitPath} fill="none" stroke="rgba(47,128,237,0.9)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" className="neonLine" style={{ filter: "drop-shadow(0 0 4px rgba(47,128,237,0.8))" }} />
                          <path d={bottomPath} fill="none" stroke="rgba(234,179,8,0.9)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" className="neonLine" style={{ filter: "drop-shadow(0 0 4px rgba(234,179,8,0.6))" }} />
                          <path d={topPath} fill="none" stroke="rgba(39,224,166,0.9)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" className="neonLine" style={{ filter: "drop-shadow(0 0 4px rgba(39,224,166,0.8))" }} />
                        </g>
                      );
                    })()}
                  </svg>
                </div>
                <div className="tacticalChartLabels">
                  {trendData.map((d) => (
                    <span key={d.label} className="tacticalChartLabel">{d.label}</span>
                  ))}
                </div>
                <div className="tacticalChartLegend">
                  <span><i className="legendUnit" /> Unit avg</span>
                  <span><i className="legendBottom" /> Bottom third</span>
                  <span><i className="legendTop" /> Top performers</span>
                </div>
              </div>
            </section>

            {/* SECTION 5 — Readiness Forecast */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Readiness Forecast</h2>
              <p className="tacticalSectionSub">Predicted risk based on trends.</p>
              <div className="tacticalTableWrap neonTable">
                <table className="tacticalTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Current Status</th>
                      <th>Trend</th>
                      <th>7 Day Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_DATA.slice(0, 10).map((o) => (
                      <tr key={o.id}>
                        <td>{o.displayId}</td>
                        <td><span className={`statusPill status${getReadinessBand(o.readiness_score).toUpperCase()}`}>{getReadinessBand(o.readiness_score).toUpperCase()}</span></td>
                        <td><span className="trendIndicator">{trendArrow(o.trend)}</span></td>
                        <td><span className={`riskPill risk${o.sevenDayRisk}`}>{o.sevenDayRisk}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 6 — Exposure vs Capacity */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Exposure vs Capacity Monitor</h2>
              <div className="tacticalTableWrap neonTable">
                <table className="tacticalTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Capacity</th>
                      <th>Exposure</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_DATA.map((o) => (
                      <tr key={o.id}>
                        <td>{o.displayId}</td>
                        <td>
                          <div className="capacityBarWrap">
                            <div className="capacityBar" style={{ width: `${o.capacity_score}%`, background: "linear-gradient(90deg, rgba(47,128,237,0.7), rgba(39,224,166,0.5))", boxShadow: "0 0 10px rgba(47,128,237,0.4)" }} />
                          </div>
                          <span className="capacityVal">{o.capacity_score}</span>
                        </td>
                        <td>
                          <div className="capacityBarWrap">
                            <div className="capacityBar" style={{ width: `${o.exposure_score}%`, background: o.exposure_score > o.capacity_score ? "linear-gradient(90deg, rgba(239,68,68,0.7), rgba(239,68,68,0.4))" : "linear-gradient(90deg, rgba(234,179,8,0.6), rgba(234,179,8,0.3))", boxShadow: o.exposure_score > o.capacity_score ? "0 0 10px rgba(239,68,68,0.5)" : "0 0 8px rgba(234,179,8,0.3)" }} />
                          </div>
                          <span className="capacityVal">{o.exposure_score}</span>
                        </td>
                        <td>
                          <span className={o.exposure_score > o.capacity_score ? "statusOverload" : "statusBalanced"}>
                            {o.exposure_score > o.capacity_score ? "OVERLOAD" : "BALANCED"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 7 — Operational Performance Monitor */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Operational Performance Monitor</h2>
              <div className="tacticalOpGrid">
                {opMetrics.map((m) => (
                  <div key={m.label} className="tacticalOpCard neonCard">
                    <div className="tacticalOpLabel">{m.label}</div>
                    <div className="tacticalOpValue">{m.value}</div>
                    <div className="tacticalOpTrend">{trendLabel(m.trend)}</div>
                    <div className="tacticalOpImpact">Impact: {m.impact}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 7b — Performance Trajectory */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Performance Trajectory</h2>
              <p className="tacticalSectionSub">Short-term readiness projection. Who is declining, improving, or approaching failure.</p>
              <div className="tacticalTableWrap neonTable">
                <table className="tacticalTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Current Readiness</th>
                      <th>Trend</th>
                      <th>Readiness history</th>
                      <th>Projected Readiness</th>
                      <th>Forecast Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trajectoryRows.map((row) => (
                      <tr key={row.id} className={row.forecastStatus === "HIGH RISK" ? "trajectoryRowHighRisk" : ""}>
                        <td>{row.id}</td>
                        <td>{row.currentReadiness}</td>
                        <td>
                          {row.trend === "improving" ? "↑ improving" : row.trend === "declining" ? "↓ declining" : "→ stable"}
                        </td>
                        <td>
                          <Sparkline values={row.readinessHistory} />
                        </td>
                        <td>{row.projectedReadiness}</td>
                        <td>
                          <span className={`trajectoryForecast trajectoryForecast${row.forecastStatus === "READY" ? "Ready" : row.forecastStatus === "MANAGE" ? "Manage" : "HighRisk"}`}>
                            {row.forecastStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 8 — Risk Heatmap */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Readiness Risk Heatmap</h2>
              <p className="tacticalSectionSub">Recovery · Structural Integrity · Operational Output</p>
              <div className="tacticalTableWrap neonTable tacticalHeatmapWrap">
                <table className="tacticalTable tacticalHeatmap">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Recovery</th>
                      <th>Structural</th>
                      <th>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_DATA.map((o) => (
                      <tr key={o.id}>
                        <td>{o.displayId}</td>
                        <td><span className="heatmapCell" style={{ background: domainBg(o.recovery_domain), boxShadow: domainGlow(o.recovery_domain) }} /></td>
                        <td><span className="heatmapCell" style={{ background: domainBg(o.structural_domain), boxShadow: domainGlow(o.structural_domain) }} /></td>
                        <td><span className="heatmapCell" style={{ background: domainBg(o.output_domain), boxShadow: domainGlow(o.output_domain) }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 9 — Performance Decline Predictors */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Performance Decline Predictors</h2>
              <div className="tacticalPredictorsGrid">
                {DECLINE_PREDICTORS.map((p) => (
                  <div key={p.id} className="tacticalPredictorCard neonCard">
                    <div className="tacticalPredictorLabel">{p.label}</div>
                    <div className="tacticalPredictorTrend">Trend: <span className="trendIndicator">{trendArrow(p.trend)}</span></div>
                    <div className="tacticalPredictorRisk">Risk: {p.risk}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 10 — System Constraint Detector */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Primary System Constraints</h2>
              <div className="tacticalConstraints">
                <div className="tacticalConstraintCard primary neonCard">
                  <div className="tacticalConstraintLabel">Primary Constraint</div>
                  <div className="tacticalConstraintValue">{primaryConstraint}</div>
                </div>
                <div className="tacticalConstraintCard neonCard">
                  <div className="tacticalConstraintLabel">Secondary Constraint</div>
                  <div className="tacticalConstraintValue">{secondaryConstraint}</div>
                </div>
                <div className="tacticalConstraintCard emerging neonCard">
                  <div className="tacticalConstraintLabel">Emerging Risk</div>
                  <div className="tacticalConstraintValue">{emergingRisk}</div>
                </div>
              </div>
            </section>
          </div>

          <style jsx>{`
            .tacticalOuter {
              min-height: 100vh;
              background: #08090c;
              background-image:
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(47,128,237,0.15), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(39,224,166,0.08), transparent),
                linear-gradient(180deg, #08090c 0%, #0c0e12 50%, #08090c 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .tacticalOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.35;
              pointer-events: none;
            }
            .tacticalNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 1;
            }
            .tacticalBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .tacticalTabs { display: flex; gap: 30px; }
            .tacticalContainer { max-width: 1200px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .tacticalHeader { margin-bottom: 48px; }
            .tacticalPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .tacticalHeadline { font-size: 28px; font-weight: 600; margin: 0 0 12px; }
            .tacticalSub { font-size: 15px; opacity: 0.8; margin: 0; line-height: 1.5; }
            .tacticalBackLink { display: inline-block; font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; margin-top: 12px; }
            .tacticalBackLink:hover { text-decoration: underline; }
            .tacticalSection { margin-bottom: 48px; }
            .tacticalSectionTitle {
              font-size: 16px;
              font-weight: 600;
              margin: 0 0 8px;
              letter-spacing: 0.03em;
            }
            .tacticalSectionSub { font-size: 13px; opacity: 0.7; margin: 0 0 16px; }
            .tacticalTiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .tacticalTile {
              padding: 24px;
              border-radius: 14px;
              border: 1px solid rgba(255,255,255,0.1);
              background: rgba(255,255,255,0.03);
              transition: box-shadow 0.3s ease, transform 0.2s ease;
            }
            .tacticalTile:hover { transform: translateY(-2px); }
            .tacticalTileGreen {
              border-color: rgba(39,224,166,0.4);
              background: rgba(39,224,166,0.06);
              box-shadow: 0 0 30px rgba(39,224,166,0.2), inset 0 0 20px rgba(39,224,166,0.05);
            }
            .tacticalTileGreen:hover { box-shadow: 0 0 40px rgba(39,224,166,0.35), inset 0 0 20px rgba(39,224,166,0.08); }
            .tacticalTileAmber {
              border-color: rgba(234,179,8,0.4);
              background: rgba(234,179,8,0.06);
              box-shadow: 0 0 30px rgba(234,179,8,0.15), inset 0 0 20px rgba(234,179,8,0.04);
            }
            .tacticalTileAmber:hover { box-shadow: 0 0 40px rgba(234,179,8,0.25), inset 0 0 20px rgba(234,179,8,0.06); }
            .tacticalTileRed {
              border-color: rgba(239,68,68,0.4);
              background: rgba(239,68,68,0.06);
              box-shadow: 0 0 30px rgba(239,68,68,0.2), inset 0 0 20px rgba(239,68,68,0.05);
            }
            .tacticalTileRed:hover { box-shadow: 0 0 40px rgba(239,68,68,0.35), inset 0 0 20px rgba(239,68,68,0.08); }
            .tacticalTileLabel { font-size: 11px; letter-spacing: 0.1em; opacity: 0.95; margin-bottom: 12px; font-weight: 600; }
            .tacticalTileCount { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
            .tacticalTilePct { font-size: 15px; opacity: 0.9; margin-bottom: 8px; }
            .tacticalTileTrend { font-size: 13px; opacity: 0.85; }
            .neonTable {
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 12px;
              background: rgba(255,255,255,0.02);
              box-shadow: 0 0 20px rgba(47,128,237,0.08);
            }
            .tacticalTableWrap { overflow-x: auto; border-radius: 12px; }
            .tacticalTable { width: 100%; border-collapse: collapse; font-size: 13px; }
            .tacticalTable th, .tacticalTable td { padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
            .tacticalTable th { font-size: 11px; letter-spacing: 0.06em; opacity: 0.85; }
            .tacticalTable tbody tr:last-child td { border-bottom: none; }
            .tacticalTable tbody tr:hover { background: rgba(255,255,255,0.03); }
            .trendIndicator { font-weight: 700; opacity: 1; }
            .statusPill, .riskPill { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; }
            .statusGREEN { background: rgba(39,224,166,0.25); color: #6ee7b7; box-shadow: 0 0 12px rgba(39,224,166,0.3); }
            .statusAMBER { background: rgba(234,179,8,0.25); color: #fcd34d; box-shadow: 0 0 12px rgba(234,179,8,0.3); }
            .statusRED { background: rgba(239,68,68,0.25); color: #fca5a5; box-shadow: 0 0 12px rgba(239,68,68,0.3); }
            .riskHIGH { background: rgba(239,68,68,0.3); color: #fca5a5; }
            .riskMODERATE { background: rgba(234,179,8,0.25); color: #fcd34d; }
            .riskLOW { background: rgba(39,224,166,0.2); color: #6ee7b7; }
            .statusOverload { color: #f87171; font-weight: 600; text-shadow: 0 0 10px rgba(239,68,68,0.5); }
            .statusBalanced { color: #6ee7b7; font-weight: 600; }
            .capacityBarWrap { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; margin-bottom: 4px; max-width: 120px; }
            .capacityBar { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
            .capacityVal { font-size: 12px; opacity: 0.9; }
            .tacticalPillars { display: flex; flex-direction: column; gap: 18px; }
            .tacticalPillarRow { display: grid; grid-template-columns: 200px 1fr 52px; gap: 16px; align-items: center; }
            .tacticalPillarName { font-size: 13px; opacity: 0.9; }
            .tacticalPillarBarWrap {
              height: 28px;
              background: rgba(0,0,0,0.3);
              border-radius: 8px;
              overflow: hidden;
              border: 1px solid rgba(255,255,255,0.06);
            }
            .tacticalPillarBar { height: 100%; border-radius: 8px; transition: width 0.4s ease; }
            .tacticalPillarBarFill { min-width: 4px; }
            .neonBar { transition: box-shadow 0.3s ease; }
            .tacticalPillarVal { font-size: 13px; font-weight: 600; opacity: 0.95; }
            .tacticalTrendControls { display: flex; gap: 8px; margin-bottom: 16px; }
            .tacticalTrendBtn {
              padding: 8px 18px;
              font-size: 12px;
              font-weight: 500;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 8px;
              color: inherit;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            .tacticalTrendBtn:hover { border-color: rgba(47,128,237,0.4); background: rgba(47,128,237,0.1); }
            .tacticalTrendBtn.active {
              background: rgba(47,128,237,0.2);
              border-color: rgba(47,128,237,0.6);
              box-shadow: 0 0 20px rgba(47,128,237,0.3);
            }
            .neonChartWrap {
              padding: 24px;
              background: rgba(0,0,0,0.2);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.1), inset 0 0 30px rgba(0,0,0,0.2);
            }
            .tacticalLineChart { width: 100%; margin-bottom: 8px; }
            .tacticalLineChart svg { display: block; }
            .neonLine { stroke-linecap: round; stroke-linejoin: round; }
            .tacticalChartLabels { display: flex; justify-content: space-between; padding: 0 2%; font-size: 10px; opacity: 0.7; }
            .tacticalChartLabel { flex: 1; text-align: center; min-width: 0; }
            .tacticalChartLegend { display: flex; flex-wrap: wrap; gap: 20px; font-size: 11px; opacity: 0.9; margin-top: 14px; }
            .tacticalChartLegend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 8px; vertical-align: middle; }
            .legendUnit { background: rgba(47,128,237,0.8); box-shadow: 0 0 10px rgba(47,128,237,0.6); }
            .legendBottom { background: rgba(234,179,8,0.8); box-shadow: 0 0 10px rgba(234,179,8,0.5); }
            .legendTop { background: rgba(39,224,166,0.8); box-shadow: 0 0 10px rgba(39,224,166,0.6); }
            .tacticalOpGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
            .tacticalOpCard, .neonCard {
              padding: 18px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 12px;
              box-shadow: 0 0 20px rgba(47,128,237,0.06);
              transition: box-shadow 0.3s ease, border-color 0.2s ease;
            }
            .tacticalOpCard:hover, .neonCard:hover { border-color: rgba(47,128,237,0.25); box-shadow: 0 0 28px rgba(47,128,237,0.15); }
            .tacticalOpLabel { font-size: 11px; letter-spacing: 0.05em; opacity: 0.8; margin-bottom: 6px; }
            .tacticalOpValue { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
            .tacticalOpTrend { font-size: 12px; opacity: 0.85; margin-bottom: 4px; }
            .tacticalOpImpact { font-size: 11px; opacity: 0.7; }
            .heatmapCell {
              display: inline-block;
              width: 20px;
              height: 20px;
              border-radius: 6px;
            }
            .tacticalHeatmapWrap .tacticalTable td { padding: 10px 16px; }
            .tacticalPredictorsGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
            .tacticalPredictorCard { padding: 16px; }
            .tacticalPredictorLabel { font-size: 12px; font-weight: 600; margin-bottom: 8px; opacity: 0.95; }
            .tacticalPredictorTrend, .tacticalPredictorRisk { font-size: 11px; opacity: 0.85; margin-top: 4px; }
            .tacticalConstraints { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .tacticalConstraintCard { padding: 20px; }
            .tacticalConstraintCard.primary { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.06); box-shadow: 0 0 25px rgba(239,68,68,0.15); }
            .tacticalConstraintCard.emerging { border-color: rgba(234,179,8,0.4); background: rgba(234,179,8,0.06); box-shadow: 0 0 25px rgba(234,179,8,0.12); }
            .tacticalConstraintLabel { font-size: 10px; letter-spacing: 0.08em; opacity: 0.75; margin-bottom: 8px; }
            .tacticalConstraintValue { font-size: 15px; font-weight: 600; }
            .trajectoryRowHighRisk {
              background: rgba(239,68,68,0.08);
              box-shadow: inset 0 0 20px rgba(239,68,68,0.15);
              border-left: 3px solid rgba(239,68,68,0.6);
            }
            .trajectoryForecast { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; }
            .trajectoryForecastReady { background: rgba(39,224,166,0.25); color: #6ee7b7; box-shadow: 0 0 12px rgba(39,224,166,0.3); }
            .trajectoryForecastManage { background: rgba(234,179,8,0.25); color: #fcd34d; box-shadow: 0 0 12px rgba(234,179,8,0.3); }
            .trajectoryForecastHighRisk { background: rgba(239,68,68,0.25); color: #fca5a5; box-shadow: 0 0 12px rgba(239,68,68,0.3); }
            .sparklineSvg { display: inline-block; vertical-align: middle; }
            .sparklineEmpty { font-size: 12px; opacity: 0.6; }
            @media (max-width: 768px) {
              .tacticalNav { padding: 16px; flex-wrap: wrap; gap: 12px; }
              .tacticalTabs { gap: 16px; flex-wrap: wrap; }
              .tacticalContainer { padding: 16px; }
              .tacticalTiles { grid-template-columns: 1fr; }
              .tacticalPillarRow { grid-template-columns: 1fr 1fr auto; }
              .tacticalConstraints, .tacticalPredictorsGrid { grid-template-columns: 1fr; }
              .tacticalOpGrid { grid-template-columns: 1fr; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
