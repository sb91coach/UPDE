"use client";

import { useMemo, useState, useEffect } from "react";
import type { Phase, Milestone } from "@/lib/goalEngine";
import type { KpiSuggestion } from "@/lib/goalEngine";
import { formatToHHMMSS } from "@/lib/timeFormatter";
import type { MilestoneProgressEntry } from "@/lib/strategyStore";

export type MilestoneStatus = "completed" | "on-track" | "at-risk" | "behind";

export type GoalProjectionChartProps = {
  totalWeeks: number;
  phases: Phase[];
  milestones: Milestone[];
  primaryKpi: KpiSuggestion;
  milestoneProgress?: MilestoneProgressEntry[];
  className?: string;
};

function getPhaseAtWeek(phases: Phase[], week: number): Phase | null {
  for (const p of phases) {
    if (week >= p.startWeek && week <= p.endWeek) return p;
  }
  return null;
}

const MILESTONE_STATUS_COLORS: Record<MilestoneStatus, { fill: string; stroke: string }> = {
  completed: { fill: "rgba(39, 224, 166, 0.35)", stroke: "rgba(39, 224, 166, 0.95)" },
  "on-track": { fill: "rgba(47, 128, 237, 0.3)", stroke: "rgba(47, 128, 237, 0.95)" },
  "at-risk": { fill: "rgba(245, 158, 11, 0.35)", stroke: "rgba(245, 158, 11, 0.95)" },
  behind: { fill: "rgba(239, 68, 68, 0.35)", stroke: "rgba(239, 68, 68, 0.95)" },
};

function getMilestoneStatus(
  m: Milestone,
  targetVal: number,
  progress: MilestoneProgressEntry | undefined,
  isTime: boolean
): MilestoneStatus {
  if (!progress) return "on-track";
  if (progress.completed) return "completed";
  const dev = progress.deviation ?? 0;
  if (dev > 10) return "behind";
  if (dev > 0) return "at-risk";
  return "on-track";
}

function deviationRecommendation(deviation: number, isTime: boolean): string {
  if (deviation > 15) return "Consider extending timeline or reducing target for next block.";
  if (deviation > 10) return "Add recovery microcycle; consider delaying peak by 1 week.";
  if (deviation > 5) return "Monitor next milestone closely; maintain current progression.";
  return "On track; maintain plan.";
}

export default function GoalProjectionChart({
  totalWeeks,
  phases,
  milestones,
  primaryKpi,
  milestoneProgress = [],
  className = "",
}: GoalProjectionChartProps) {
  const [hoverNode, setHoverNode] = useState<{
    week: number;
    value: number;
    percent: number;
    phase: Phase | null;
    actualValue?: number;
    deviation?: number;
    status: MilestoneStatus;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentVal = primaryKpi.currentValue ?? primaryKpi.targetValue - primaryKpi.ratePerWeek * totalWeeks;
  const targetVal = primaryKpi.targetValue;
  const isTime = primaryKpi.unit === "sec";

  const progressByMilestone = useMemo(() => {
    const map = new Map<string, MilestoneProgressEntry>();
    milestoneProgress.forEach((p) => map.set(p.milestoneId, p));
    return map;
  }, [milestoneProgress]);

  const points = useMemo(() => {
    const out: { week: number; value: number }[] = [];
    for (let w = 0; w <= totalWeeks; w++) {
      const t = totalWeeks <= 0 ? 1 : w / totalWeeks;
      const value = currentVal + (targetVal - currentVal) * t;
      out.push({ week: w, value });
    }
    return out;
  }, [totalWeeks, currentVal, targetVal]);

  const milestonePoints = useMemo(() => {
    return milestones.map((m) => {
      const t = totalWeeks <= 0 ? 1 : m.week / totalWeeks;
      const value = currentVal + (targetVal - currentVal) * t;
      const phase = getPhaseAtWeek(phases, m.week);
      const progress = progressByMilestone.get(m.id);
      const status = getMilestoneStatus(m, value, progress, isTime);
      return { ...m, value, phase, progress, status };
    });
  }, [milestones, phases, totalWeeks, currentVal, targetVal, progressByMilestone]);

  const w = 700;
  const h = 260;
  const pad = { top: 24, right: 20, bottom: 32, left: 48 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const minY = Math.min(currentVal, targetVal) - (Math.abs(targetVal - currentVal) * 0.1) || 0;
  const maxY = Math.max(currentVal, targetVal) + (Math.abs(targetVal - currentVal) * 0.1) || 1;
  const range = maxY - minY || 1;

  const toX = (week: number) => pad.left + (week / Math.max(totalWeeks, 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - minY) / range) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.week)} ${toY(p.value)}`)
    .join(" ");

  const weeklyImprovement = primaryKpi.ratePerWeek;

  if (totalWeeks < 1) return null;

  return (
    <div className={`goalProjectionChart ${className}`}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="goalProjectionSvg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="goalProjLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(47, 128, 237, 0.95)" />
            <stop offset="100%" stopColor="rgba(39, 224, 166, 0.95)" />
          </linearGradient>
          <filter id="goalProjGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map((q) => (
          <line
            key={q}
            x1={pad.left}
            y1={pad.top + innerH * (1 - q)}
            x2={w - pad.right}
            y2={pad.top + innerH * (1 - q)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ))}
        {[0, 0.33, 0.66, 1].map((q) => (
          <line
            key={q}
            x1={pad.left + innerW * q}
            y1={pad.top}
            x2={pad.left + innerW * q}
            y2={pad.top + innerH}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ))}
        <path
          d={pathD}
          fill="none"
          stroke="url(#goalProjLineGrad)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#goalProjGlow)"
          opacity={mounted ? 1 : 0}
          style={{ transition: "opacity 0.8s ease" }}
        />
        {milestonePoints.map((m) => {
          const isHover = hoverNode?.week === m.week;
          const colors = MILESTONE_STATUS_COLORS[m.status];
          return (
            <g
              key={m.id}
              onMouseEnter={() =>
                setHoverNode({
                  week: m.week,
                  value: m.value,
                  percent: m.percent,
                  phase: m.phase ?? null,
                  actualValue: m.progress?.actualValue,
                  deviation: m.progress?.deviation,
                  status: m.status,
                })
              }
              onMouseLeave={() => setHoverNode(null)}
              style={{ cursor: "pointer" }}
            >
              <title>{m.label} — Week {m.week} ({m.status})</title>
              <circle
                cx={toX(m.week)}
                cy={toY(m.value)}
                r={isHover ? 8 : 6}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={1.5}
                filter="url(#goalProjGlow)"
              />
            </g>
          );
        })}
        <line x1={pad.left} y1={pad.top + innerH} x2={w - pad.right} y2={pad.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <text x={pad.left - 8} y={pad.top + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.5)">
          {primaryKpi.name}
        </text>
        {[minY, (minY + maxY) / 2, maxY].map((v) => (
          <text key={v} x={pad.left - 8} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.45)">
            {isTime ? formatToHHMMSS(v) : v.toFixed(1)}
          </text>
        ))}
      </svg>
      {hoverNode && (
        <div className="goalProjectionPopup">
          <div className="goalProjectionPopupRow">
            <span className="goalProjectionPopupLabel">Milestone</span>
            <span className="goalProjectionPopupValue">{hoverNode.percent}%</span>
          </div>
          <div className="goalProjectionPopupRow">
            <span className="goalProjectionPopupLabel">Target</span>
            <span className="goalProjectionPopupValue">{isTime ? formatToHHMMSS(hoverNode.value) : hoverNode.value.toFixed(1)}</span>
          </div>
          {hoverNode.actualValue != null && (
            <>
              <div className="goalProjectionPopupRow">
                <span className="goalProjectionPopupLabel">Actual</span>
                <span className="goalProjectionPopupValue">{isTime ? formatToHHMMSS(hoverNode.actualValue) : hoverNode.actualValue.toFixed(1)}</span>
              </div>
              {hoverNode.deviation != null && (
                <div className="goalProjectionPopupRow">
                  <span className="goalProjectionPopupLabel">% deviation</span>
                  <span className="goalProjectionPopupValue">{hoverNode.deviation > 0 ? "+" : ""}{hoverNode.deviation.toFixed(1)}%</span>
                </div>
              )}
              {hoverNode.deviation != null && (
                <div className="goalProjectionPopupRow goalProjectionPopupRecommendation">
                  <span className="goalProjectionPopupLabel">Adjustment</span>
                  <span className="goalProjectionPopupValue">{deviationRecommendation(hoverNode.deviation, isTime)}</span>
                </div>
              )}
            </>
          )}
          {hoverNode.actualValue == null && (
            <div className="goalProjectionPopupRow">
              <span className="goalProjectionPopupLabel">Weekly improvement</span>
              <span className="goalProjectionPopupValue">
                {isTime ? (weeklyImprovement < 0 ? "" : "-") + formatToHHMMSS(Math.abs(weeklyImprovement)) : (weeklyImprovement >= 0 ? "+" : "") + weeklyImprovement.toFixed(2)} {primaryKpi.unit}/wk
              </span>
            </div>
          )}
          {hoverNode.phase && (
            <div className="goalProjectionPopupRow">
              <span className="goalProjectionPopupLabel">Phase</span>
              <span className="goalProjectionPopupValue">{hoverNode.phase.name}</span>
            </div>
          )}
        </div>
      )}
      <style jsx>{`
        .goalProjectionChart {
          position: relative;
          background: rgba(0, 0, 0, 0.15);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 24px rgba(39, 224, 166, 0.06);
        }
        .goalProjectionSvg {
          display: block;
        }
        .goalProjectionPopup {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(17, 24, 39, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 14px 16px;
          min-width: 180px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 24px rgba(39, 224, 166, 0.12);
          z-index: 5;
        }
        .goalProjectionPopupRow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 8px;
        }
        .goalProjectionPopupRow:last-child {
          margin-bottom: 0;
        }
        .goalProjectionPopupLabel {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .goalProjectionPopupValue {
          font-size: 12px;
          font-weight: 600;
          color: rgba(39, 224, 166, 0.95);
        }
        .goalProjectionPopupRecommendation .goalProjectionPopupValue {
          font-size: 11px;
          font-weight: 500;
          max-width: 200px;
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
