"use client";

import { useState } from "react";

const TEAL = "#14b8a6";
const GREEN = "#22c55e";
const BLUE = "#3b82f6";
const PURPLE = "#a855f7";

const TAB_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pps: { bg: "rgba(34,197,94,0.35)", border: GREEN, text: "#fff" },
  weight: { bg: "rgba(59,130,246,0.35)", border: BLUE, text: "#fff" },
  velocity: { bg: "rgba(168,85,247,0.35)", border: PURPLE, text: "#fff" },
  consistency: { bg: "rgba(20,184,166,0.35)", border: TEAL, text: "#fff" },
};

const LINE_COLORS: Record<string, string> = {
  pps: GREEN,
  weight: BLUE,
  velocity: PURPLE,
  consistency: "#ef4444",
};

/** Mock trend: cumulative % change Feb 2025 – Feb 2026 (PPS, Weight, Velocity, Consistency) */
function mockPPSData() {
  const labels = ["Feb 2025", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec 2025", "Feb 2026"];
  return Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return {
      label: labels[i],
      pps: Math.round((t * 5 - 2 + Math.sin(i * 0.7) * 4) * 10) / 10,
      weight: Math.round((-35 * t - 5 + Math.sin(i * 0.5) * 5) * 10) / 10,
      velocity: Math.round((15 * Math.min(t, 0.5) - 10 * Math.max(0, t - 0.5) + Math.sin(i * 0.6) * 3) * 10) / 10,
      consistency: Math.round((-40 * Math.min(t, 0.4) + 45 * Math.max(0, t - 0.4) + Math.sin(i * 0.4) * 5) * 10) / 10,
    };
  });
}

export type RemakerProgressBlockProps = {
  readinessScore?: number;
  strengthUpper?: number;
  strengthLower?: number;
  aerobicScore?: number;
  topBenchmarkLabel?: string;
  topBenchmarkValue?: number | null;
  sessionsThisWeek?: number;
  className?: string;
  /** Projected PPS as % change from baseline (extends chart when on PPS tab) */
  projectedPpsPercent?: number[];
};

export default function RemakerProgressBlock({
  className = "",
  projectedPpsPercent,
}: RemakerProgressBlockProps) {
  const [activeTab, setActiveTab] = useState<"pps" | "weight" | "velocity" | "consistency">("pps");
  const trend = mockPPSData();
  const projLen = projectedPpsPercent?.length ?? 0;
  const totalLen = trend.length + projLen;
  const allValues = trend.flatMap((d) => [d.pps, d.weight, d.velocity, d.consistency]);
  const allWithProj = projLen > 0 ? [...allValues, ...(projectedPpsPercent ?? [])] : allValues;
  const minY = Math.min(...allWithProj, -40) - 2;
  const maxY = Math.max(...allWithProj, 20) + 2;
  const range = maxY - minY || 1;
  const w = 700;
  const h = 280;
  const pad = { top: 20, right: 16, bottom: 36, left: 44 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const toX = (i: number) =>
    pad.left + (i / Math.max(totalLen - 1, 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - minY) / range) * innerH;

  const metricIds = ["pps", "weight", "velocity", "consistency"] as const;
  const pathDs = metricIds.map((id) =>
    trend
      .map((d) => d[id])
      .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`)
      .join(" ")
  );
  const lastFourWeeks = trend.map((d) => d[activeTab]).slice(-4);
  const avgPPS = lastFourWeeks.length ? (lastFourWeeks.reduce((a, b) => a + b, 0) / lastFourWeeks.length).toFixed(0) : "0";

  const tabs = [
    { id: "pps" as const, label: "PPS" },
    { id: "weight" as const, label: "Weight" },
    { id: "velocity" as const, label: "Velocity" },
    { id: "consistency" as const, label: "Consistency" },
  ];

  return (
    <div className={`remakerBlock ${className}`}>
      <div className="remakerProgressCard">
        <div className="remakerProgressHead">
          <h2 className="remakerProgressTitle">Performance Pathfinder Score</h2>
          <div className="remakerProgressSummary">
            <span className="remakerProgressSummaryLabel">Average PPS in the last 4 weeks:</span>
            <span className="remakerProgressSummaryPill">{avgPPS}% PPS</span>
          </div>
        </div>
        <div
          className="remakerTabs"
          role="tablist"
          aria-label="Select metric for chart"
          style={{ position: "relative", zIndex: 1 }}
        >
          {tabs.map((tab) => {
            const style = TAB_COLORS[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-controls="remaker-chart-panel"
                id={`remaker-tab-${tab.id}`}
                className={`remakerTab ${isActive ? "active" : ""}`}
                style={
                  isActive
                    ? { background: style.bg, borderColor: style.border, color: style.text }
                    : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveTab(tab.id);
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="remakerProgressDesc1">
          Above are the key metrics contributing to the athlete&apos;s PPS (Performance Pathfinder Score).
        </p>
        <p className="remakerProgressDesc2">
          Below is a plot showing cumulative percentage change in PPS and a breakdown in terms of the key metrics.
        </p>
        <div id="remaker-chart-panel" className="remakerChartWrap" role="tabpanel" aria-labelledby={`remaker-tab-${activeTab}`}>
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="remakerChart" preserveAspectRatio="xMidYMid meet">
            <defs>
              {metricIds.map((id) => (
                <filter key={id} id={`remakerGlow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
              <filter id="remakerGlow-projection" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="remakerProjectionFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={GREEN} stopOpacity="0.35" />
                <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, -10, -20, -30, -40, 10, 20].map((v) => {
              const y = toY(v);
              return (
                <line
                  key={v}
                  x1={pad.left}
                  y1={y}
                  x2={w - pad.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                  strokeDasharray={v % 10 === 0 ? "4 4" : "2 2"}
                />
              );
            })}
            {metricIds.map((id, idx) => {
              const isActive = activeTab === id;
              const color = LINE_COLORS[id];
              return (
                <g
                  key={id}
                  opacity={isActive ? 1 : 0.35}
                  style={{ transition: "opacity 0.35s ease" }}
                >
                  <path
                    d={pathDs[idx]}
                    fill="none"
                    stroke={color}
                    strokeWidth={isActive ? 3 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={isActive ? `url(#remakerGlow-${id})` : undefined}
                  />
                  {trend.map((d, i) => (
                    <circle
                      key={i}
                      cx={toX(i)}
                      cy={toY(d[id])}
                      r={isActive ? 4 : 2.5}
                      fill={color}
                      filter={isActive ? `url(#remakerGlow-${id})` : undefined}
                    />
                  ))}
                </g>
              );
            })}
            {activeTab === "pps" && projectedPpsPercent && projectedPpsPercent.length > 0 && (() => {
              const lastX = toX(trend.length - 1);
              const lastY = toY(trend[trend.length - 1].pps);
              const projPoints = projectedPpsPercent.map((v, i) => ({ x: toX(trend.length + i), y: toY(v) }));
              const areaPath = `M ${lastX} ${lastY} ${projPoints.map((p) => `L ${p.x} ${p.y}`).join(" ")} L ${projPoints[projPoints.length - 1].x} ${pad.top + innerH} L ${lastX} ${pad.top + innerH} Z`;
              const linePath = `M ${lastX} ${lastY} ${projPoints.map((p) => `L ${p.x} ${p.y}`).join(" ")}`;
              return (
                <g className="remakerProjection" style={{ transition: "opacity 0.35s ease" }}>
                  <path d={areaPath} fill="url(#remakerProjectionFill)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={GREEN}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="6 6"
                    filter="url(#remakerGlow-projection)"
                  />
                  {projPoints.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={4}
                      fill={GREEN}
                      filter="url(#remakerGlow-projection)"
                    />
                  ))}
                </g>
              );
            })()}
            <line x1={pad.left} y1={pad.top + innerH} x2={w - pad.right} y2={pad.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <text x={pad.left - 6} y={pad.top + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.6)">PPS (%)</text>
            {[maxY, 0, minY].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
              <text key={v} x={pad.left - 6} y={toY(v) + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.5)">{Math.round(v)}</text>
            ))}
          </svg>
        </div>
        <div className="remakerChartX">
          {trend.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
          {projectedPpsPercent?.map((_, i) => (
            <span key={`f${i}`}>W{i + 1}</span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .remakerBlock {
          margin-bottom: 48px;
        }
        .remakerProgressCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px 24px 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .remakerProgressCard:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .remakerProgressHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }
        .remakerProgressTitle {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .remakerProgressSummary {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .remakerProgressSummaryLabel {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
        }
        .remakerProgressSummaryPill {
          font-size: 13px;
          font-weight: 600;
          padding: 6px 12px;
          background: rgba(34, 197, 94, 0.35);
          border: 1px solid ${GREEN};
          border-radius: 10px;
          color: ${GREEN};
        }
        .remakerTabs {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }
        .remakerTab {
          padding: 10px 20px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          pointer-events: auto;
          user-select: none;
          transition: all 0.2s ease;
        }
        .remakerTab:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .remakerProgressDesc1 {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 6px;
          line-height: 1.5;
        }
        .remakerProgressDesc2 {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          margin: 0 0 20px;
          line-height: 1.5;
        }
        .remakerChartWrap {
          overflow: hidden;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.25);
        }
        .remakerChart {
          display: block;
        }
        .remakerChartX {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          padding: 0 44px 0 48px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
