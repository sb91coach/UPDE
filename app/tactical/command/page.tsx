"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import { loadReadinessEntries } from "@/lib/tacticalReadinessStorage";
import {
  getFullReadinessFromEntries,
  getReadinessTrendData,
  type FullReadinessRow,
  type TrendDataPoint,
} from "@/lib/tacticalMapData";
import type { TrendIndicator } from "@/lib/readinessAlgorithm";

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

const DIAL_SIZE = 320;
const DIAL_R = 140;
const DIAL_CX = DIAL_SIZE / 2;
const DIAL_CY = DIAL_SIZE / 2;

function trendArrow(t: TrendIndicator): string {
  return t === "IMPROVING" ? "↑" : t === "DECLINING" ? "↓" : "→";
}

export default function TacticalCommandPage() {
  const pathname = usePathname();
  const [entries, setEntries] = useState(loadReadinessEntries());
  const [viewMode, setViewMode] = useState<"unit" | "individual">("unit");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  useEffect(() => {
    setEntries(loadReadinessEntries());
  }, []);

  const fullRows = useMemo(() => getFullReadinessFromEntries(entries), [entries]);
  const idList = useMemo(
    () => fullRows.map((r) => r.id).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10)),
    [fullRows]
  );

  const activeRow = useMemo((): FullReadinessRow | null => {
    if (viewMode === "individual" && selectedId) {
      return fullRows.find((r) => r.id === selectedId) ?? null;
    }
    return null;
  }, [viewMode, selectedId, fullRows]);

  const unitAggregate = useMemo(() => {
    if (fullRows.length === 0)
      return {
        readinessScore: 0,
        readinessStatus: "RISK" as const,
        readinessStatusColor: "red" as const,
        recoveryScore: 0,
        structuralScore: 0,
        exposureScore: 0,
        capacityBuffer: 0,
        trend: "STABLE" as TrendIndicator,
        highRiskCount: 0,
        overCapacityCount: 0,
        bottomThirdCount: 0,
      };
    const sorted = [...fullRows].sort((a, b) => a.readinessScore - b.readinessScore);
    const third = Math.max(1, Math.floor(sorted.length / 3));
    const bottomThird = sorted.slice(0, third);
    return {
      readinessScore: fullRows.reduce((s, r) => s + r.readinessScore, 0) / fullRows.length,
      readinessStatus: fullRows.filter((r) => r.readinessScore >= 75).length >= fullRows.length / 2 ? "READY" : fullRows.filter((r) => r.readinessScore >= 60).length >= fullRows.length / 2 ? "MANAGE" : "RISK",
      readinessStatusColor: (() => {
        const avg = fullRows.reduce((s, r) => s + r.readinessScore, 0) / fullRows.length;
        return avg >= 75 ? "green" : avg >= 60 ? "amber" : "red";
      })(),
      recoveryScore: fullRows.reduce((s, r) => s + r.recoveryScore, 0) / fullRows.length,
      structuralScore: fullRows.reduce((s, r) => s + r.structuralScore, 0) / fullRows.length,
      exposureScore: fullRows.reduce((s, r) => s + r.exposureScore, 0) / fullRows.length,
      capacityBuffer: fullRows.reduce((s, r) => s + r.capacityBuffer, 0) / fullRows.length,
      trend: fullRows.filter((r) => r.trend === "DECLINING").length > fullRows.filter((r) => r.trend === "IMPROVING").length ? "DECLINING" : fullRows.filter((r) => r.trend === "IMPROVING").length > fullRows.filter((r) => r.trend === "DECLINING").length ? "IMPROVING" : "STABLE",
      highRiskCount: fullRows.filter((r) => r.riskLevel === "HIGH").length,
      overCapacityCount: fullRows.filter((r) => r.capacityBuffer < -10).length,
      bottomThirdCount: bottomThird.length,
    };
  }, [fullRows]);

  const displayValue = viewMode === "unit" ? unitAggregate.readinessScore : activeRow?.readinessScore ?? 0;
  const displayStatus = viewMode === "unit"
    ? (unitAggregate.readinessScore >= 75 ? "READY" : unitAggregate.readinessScore >= 60 ? "MANAGE" : "HIGH RISK")
    : (activeRow ? (activeRow.readinessScore >= 75 ? "READY" : activeRow.readinessScore >= 60 ? "MANAGE" : "HIGH RISK") : "—");
  const displayColor = viewMode === "unit"
    ? unitAggregate.readinessStatusColor
    : (activeRow?.readinessStatusColor ?? "red");

  const trendData = useMemo(
    () => getReadinessTrendData(entries, trendDays),
    [entries, trendDays]
  );

  const recoveryVal = viewMode === "unit" ? unitAggregate.recoveryScore : activeRow?.recoveryScore ?? 0;
  const recoveryTrend = viewMode === "unit" ? unitAggregate.trend : activeRow?.trend ?? "STABLE";
  const structuralVal = viewMode === "unit" ? unitAggregate.structuralScore : activeRow?.structuralScore ?? 0;
  const structuralTrend = viewMode === "unit" ? unitAggregate.trend : activeRow?.trend ?? "STABLE";
  const exposureVal = viewMode === "unit" ? unitAggregate.exposureScore : activeRow?.exposureScore ?? 0;
  const exposureTrend = viewMode === "unit" ? unitAggregate.trend : activeRow?.trend ?? "STABLE";

  const avgBuffer = viewMode === "unit" ? unitAggregate.capacityBuffer : (activeRow?.capacityBuffer ?? 0);
  const bufferLabel = avgBuffer >= 0 ? "Stable Capacity Margin" : "Overloaded System";

  const arcStart = 270;
  const arcSpan = 180;
  const arcEndAngle = arcStart - (displayValue / 100) * arcSpan;
  const zoneColor = displayColor === "green" ? "rgba(39,224,166,0.9)" : displayColor === "amber" ? "rgba(234,179,8,0.9)" : "rgba(239,68,68,0.9)";
  const zoneGlow = displayColor === "green" ? "0 0 30px rgba(39,224,166,0.6)" : displayColor === "amber" ? "0 0 30px rgba(234,179,8,0.5)" : "0 0 30px rgba(239,68,68,0.5)";

  const chartHeight = 120;
  const chartWidth = 340;
  const maxR = trendData.length ? Math.max(...trendData.map((d) => d.avgReadiness), 1) : 100;
  const minR = trendData.length ? Math.min(...trendData.map((d) => d.avgReadiness), 99) : 0;
  const range = maxR - minR || 1;
  const points = trendData
    .map((d, i) => {
      const x = (i / Math.max(trendData.length - 1, 1)) * (chartWidth - 40) + 20;
      const y = chartHeight - 20 - ((d.avgReadiness - minR) / range) * (chartHeight - 40);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <RequireAuth>
      <OSLayer>
        <div className="cmdOuter">
          <nav className="cmdNav">
            <div className="cmdBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="cmdTabs">
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

          <div className="cmdContainer">
            <div className="cmdHeader">
              <div className="cmdPhase">TACTICAL</div>
              <h1 className="cmdHeadline">Command Readiness</h1>
              <p className="cmdSub">High-level operational readiness signal. Is the unit ready to perform today?</p>
              <Link href="/tactical" className="cmdBackLink">← Back to Tactical Dashboard</Link>
            </div>

            {/* VIEW toggle */}
            <section className="cmdSection">
              <h2 className="cmdSectionTitle">VIEW</h2>
              <div className="viewRow">
                <button type="button" className={`viewBtn ${viewMode === "unit" ? "active" : ""}`} onClick={() => setViewMode("unit")}>Unit</button>
                <button type="button" className={`viewBtn ${viewMode === "individual" ? "active" : ""}`} onClick={() => setViewMode("individual")}>Individual</button>
              </div>
              {viewMode === "individual" && (
                <div className="focusSelectWrap">
                  <label className="cmdLabel">Select ID</label>
                  <select value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value || null)} className="cmdSelect">
                    <option value="">—</option>
                    {idList.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            {/* Main dial */}
            <section className="cmdSection dialSection">
              <h2 className="cmdSectionTitle">UNIT READINESS STATUS</h2>
              <div className="dialWrap">
                <svg className="dialSvg" viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`} width={DIAL_SIZE} height={DIAL_SIZE}>
                  <defs>
                    <filter id="dialGlow">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <circle cx={DIAL_CX} cy={DIAL_CY} r={DIAL_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                  <circle cx={DIAL_CX} cy={DIAL_CY} r={DIAL_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  {/* Zone arcs: red 0-59, amber 60-74, green 75-100 (arc from left 270° to right 90°) */}
                  <path d={describeArc(DIAL_CX, DIAL_CY, DIAL_R, arcStart, arcStart - (59 / 100) * arcSpan)} fill="none" stroke="rgba(239,68,68,0.35)" strokeWidth="10" strokeLinecap="round" />
                  <path d={describeArc(DIAL_CX, DIAL_CY, DIAL_R, arcStart - (60 / 100) * arcSpan, arcStart - (74 / 100) * arcSpan)} fill="none" stroke="rgba(234,179,8,0.35)" strokeWidth="10" strokeLinecap="round" />
                  <path d={describeArc(DIAL_CX, DIAL_CY, DIAL_R, arcStart - (75 / 100) * arcSpan, 90)} fill="none" stroke="rgba(39,224,166,0.35)" strokeWidth="10" strokeLinecap="round" />
                  {/* Value arc */}
                  <path
                    d={describeArc(DIAL_CX, DIAL_CY, DIAL_R, arcStart, arcEndAngle)}
                    fill="none"
                    stroke={zoneColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    filter="url(#dialGlow)"
                    style={{ boxShadow: zoneGlow, transition: "stroke-dasharray 0.5s ease, stroke 0.4s ease" }}
                  />
                </svg>
                <div className="dialValueWrap" style={{ color: zoneColor, textShadow: zoneGlow }}>
                  <span className="dialValue">{Math.round(displayValue)}</span>
                  <span className="dialStatus">{displayStatus}</span>
                </div>
              </div>
            </section>

            {/* Secondary metrics */}
            <section className="cmdSection">
              <h2 className="cmdSectionTitle">Secondary metrics</h2>
              <div className="metricsRow">
                <div className="metricCard">
                  <div className="metricLabel">Recovery State</div>
                  <div className="metricValue">{Math.round(recoveryVal)}</div>
                  <div className="metricTrend">{trendArrow(recoveryTrend as TrendIndicator)} {recoveryTrend === "IMPROVING" ? "increasing" : recoveryTrend === "DECLINING" ? "declining" : "stable"}</div>
                </div>
                <div className="metricCard">
                  <div className="metricLabel">Structural Integrity</div>
                  <div className="metricValue">{Math.round(structuralVal)}</div>
                  <div className="metricTrend">{trendArrow(structuralTrend as TrendIndicator)} {structuralTrend === "IMPROVING" ? "increasing" : structuralTrend === "DECLINING" ? "declining" : "stable"}</div>
                </div>
                <div className="metricCard">
                  <div className="metricLabel">Exposure Load</div>
                  <div className="metricValue">{Math.round(exposureVal)}</div>
                  <div className="metricTrend">{trendArrow(exposureTrend as TrendIndicator)} {exposureTrend === "IMPROVING" ? "increasing" : exposureTrend === "DECLINING" ? "declining" : "stable"}</div>
                </div>
              </div>
            </section>

            {/* Readiness Trend chart */}
            <section className="cmdSection">
              <h2 className="cmdSectionTitle">Unit Readiness Trend</h2>
              <div className="trendFilters">
                <button type="button" className={`trendBtn ${trendDays === 7 ? "active" : ""}`} onClick={() => setTrendDays(7)}>Last 7 days</button>
                <button type="button" className={`trendBtn ${trendDays === 30 ? "active" : ""}`} onClick={() => setTrendDays(30)}>Last 30 days</button>
              </div>
              <div className="chartWrap">
                {trendData.length === 0 ? (
                  <p className="chartEmpty">No trend data. Log entries on Daily Input.</p>
                ) : (
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} className="trendChart">
                    <polyline points={points} fill="none" stroke="rgba(47,128,237,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 8px rgba(47,128,237,0.5))" }} />
                  </svg>
                )}
              </div>
            </section>

            {/* Risk Summary + Capacity Buffer */}
            <div className="twoCol">
              <section className="cmdSection">
                <h2 className="cmdSectionTitle">System Risk Summary</h2>
                <div className="riskGrid">
                  <div className="riskRow"><span className="riskLabel">IDs in High Risk Zone</span><span className="riskVal">{viewMode === "unit" ? unitAggregate.highRiskCount : (activeRow && activeRow.riskLevel === "HIGH" ? 1 : 0)}</span></div>
                  <div className="riskRow"><span className="riskLabel">IDs Over Capacity</span><span className="riskVal">{viewMode === "unit" ? unitAggregate.overCapacityCount : (activeRow && activeRow.capacityBuffer < -10 ? 1 : 0)}</span></div>
                  <div className="riskRow"><span className="riskLabel">Bottom Third Count</span><span className="riskVal">{viewMode === "unit" ? unitAggregate.bottomThirdCount : "—"}</span></div>
                </div>
              </section>
              <section className="cmdSection">
                <h2 className="cmdSectionTitle">Average Capacity Buffer</h2>
                <div className="bufferWrap">
                  <span className={`bufferValue ${avgBuffer < 0 ? "negative" : ""}`}>{avgBuffer >= 0 ? "+" : ""}{Math.round(avgBuffer)}</span>
                  <span className="bufferLabel">{bufferLabel}</span>
                </div>
              </section>
            </div>
          </div>

          <style jsx>{`
            .cmdOuter {
              min-height: 100vh;
              background: #08090c;
              background-image:
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(47,128,237,0.12), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(39,224,166,0.06), transparent),
                linear-gradient(180deg, #08090c 0%, #0c0e12 50%, #08090c 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .cmdOuter::before {
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
            .cmdNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 2;
            }
            .cmdBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .cmdTabs { display: flex; gap: 16px; flex-wrap: wrap; }
            .cmdContainer { max-width: 720px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .cmdHeader { margin-bottom: 32px; }
            .cmdPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .cmdHeadline { font-size: 26px; font-weight: 600; margin: 0 0 10px; }
            .cmdSub { font-size: 14px; opacity: 0.8; margin: 0 0 14px; line-height: 1.5; }
            .cmdBackLink { font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; }
            .cmdBackLink:hover { text-decoration: underline; }
            .cmdSection {
              margin-bottom: 28px;
              padding: 24px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.06);
              backdrop-filter: blur(8px);
            }
            .cmdSectionTitle { font-size: 15px; font-weight: 600; margin: 0 0 14px; letter-spacing: 0.03em; }
            .viewRow { display: flex; gap: 12px; flex-wrap: wrap; }
            .viewBtn {
              padding: 10px 20px;
              font-size: 13px; font-weight: 500;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 10px;
              color: rgba(255,255,255,0.9);
              cursor: pointer;
              transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .viewBtn.active { background: rgba(47,128,237,0.25); border-color: rgba(47,128,237,0.5); color: #fff; box-shadow: 0 0 18px rgba(47,128,237,0.25); }
            .focusSelectWrap { margin-top: 14px; }
            .cmdLabel { display: block; font-size: 13px; opacity: 0.9; margin-bottom: 6px; }
            .cmdSelect { padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(47,128,237,0.35); border-radius: 10px; color: #fff; font-size: 14px; min-width: 140px; }
            .dialSection { text-align: center; }
            .dialWrap { position: relative; display: inline-block; }
            .dialSvg { display: block; }
            .dialValueWrap { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; }
            .dialValue { display: block; font-size: 48px; font-weight: 700; line-height: 1.1; transition: color 0.4s ease; }
            .dialStatus { display: block; font-size: 14px; font-weight: 600; letter-spacing: 0.08em; opacity: 0.95; margin-top: 4px; }
            .metricsRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .metricCard {
              padding: 18px;
              background: rgba(0,0,0,0.2);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 12px;
              text-align: center;
            }
            .metricLabel { font-size: 11px; letter-spacing: 0.06em; opacity: 0.8; margin-bottom: 8px; }
            .metricValue { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
            .metricTrend { font-size: 12px; opacity: 0.85; }
            .trendFilters { display: flex; gap: 10px; margin-bottom: 14px; }
            .trendBtn { padding: 8px 16px; font-size: 12px; font-weight: 500; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(255,255,255,0.9); cursor: pointer; }
            .trendBtn.active { background: rgba(47,128,237,0.25); border-color: rgba(47,128,237,0.5); color: #fff; }
            .chartWrap { min-height: 120px; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 12px; }
            .chartEmpty { margin: 0; font-size: 13px; opacity: 0.75; text-align: center; padding: 40px 0; }
            .trendChart { display: block; width: 100%; }
            .twoCol { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .riskGrid { display: flex; flex-direction: column; gap: 12px; }
            .riskRow { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
            .riskRow:last-child { border-bottom: none; }
            .riskLabel { font-size: 13px; opacity: 0.9; }
            .riskVal { font-size: 18px; font-weight: 700; }
            .bufferWrap { text-align: center; padding: 16px 0; }
            .bufferValue { font-size: 36px; font-weight: 700; color: rgba(39,224,166,0.95); }
            .bufferValue.negative { color: rgba(239,68,68,0.95); }
            .bufferLabel { display: block; font-size: 13px; opacity: 0.9; margin-top: 8px; }
            @media (max-width: 768px) {
              .cmdNav { padding: 16px; }
              .cmdTabs { gap: 12px; }
              .cmdContainer { padding: 16px; }
              .metricsRow { grid-template-columns: 1fr; }
              .twoCol { grid-template-columns: 1fr; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
