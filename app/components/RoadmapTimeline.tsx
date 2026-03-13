"use client";

import { useState } from "react";
import type { Phase, Milestone } from "@/lib/goalEngine";

export type RiskLevel = "green" | "amber" | "red";

export type RoadmapTimelineProps = {
  phases: Phase[];
  milestones: Milestone[];
  totalWeeks: number;
  progressPercent?: number;
  riskHeat?: RiskLevel[];
  className?: string;
};

const RISK_HEAT_COLORS: Record<RiskLevel, string> = {
  green: "rgba(39, 224, 166, 0.06)",
  amber: "rgba(245, 158, 11, 0.08)",
  red: "rgba(239, 68, 68, 0.08)",
};

export default function RoadmapTimeline({
  phases,
  milestones,
  totalWeeks,
  progressPercent = 0,
  riskHeat,
  className = "",
}: RoadmapTimelineProps) {
  const [hoverMilestone, setHoverMilestone] = useState<Milestone | null>(null);

  if (totalWeeks < 1) return null;

  return (
    <div className={`roadmapTimeline ${className}`}>
      <div className="roadmapPhaseLabels">
        {phases.map((phase) => {
          const leftPct = ((phase.startWeek - 1) / totalWeeks) * 100;
          const widthPct = ((phase.endWeek - phase.startWeek + 1) / totalWeeks) * 100;
          return (
            <div
              key={phase.id}
              className="roadmapPhaseLabel"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            >
              <span>{phase.name}</span>
            </div>
          );
        })}
      </div>

      <div className="roadmapTrackWrap">
        {riskHeat && riskHeat.length >= totalWeeks && (
          <div className="roadmapRiskHeat">
            {riskHeat.slice(0, totalWeeks).map((risk, i) => (
              <div
                key={i}
                className="roadmapRiskSegment"
                style={{
                  left: `${(i / totalWeeks) * 100}%`,
                  width: `${100 / totalWeeks}%`,
                  background: RISK_HEAT_COLORS[risk],
                }}
              />
            ))}
          </div>
        )}
        <div className={`roadmapTrack ${riskHeat && riskHeat.length >= totalWeeks ? "roadmapTrack--withRisk" : ""}`}>
          {phases.slice(0, -1).map((phase) => (
            <div
              key={`div-${phase.id}`}
              className="roadmapDivider"
              style={{ left: `${(phase.endWeek / totalWeeks) * 100}%` }}
            />
          ))}
          <div
            className="roadmapProgress"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>

      <div className="roadmapMilestones">
        {milestones.map((m) => {
          const isHover = hoverMilestone?.id === m.id;
          return (
            <div
              key={m.id}
              className={`roadmapMilestone ${isHover ? "hover" : ""}`}
              style={{ left: `${(m.week / totalWeeks) * 100}%` }}
              onMouseEnter={() => setHoverMilestone(m)}
              onMouseLeave={() => setHoverMilestone(null)}
            >
              <span className="roadmapMilestoneDiamond">◆</span>
              <span className="roadmapMilestonePct">{m.label}</span>
              <span className="roadmapMilestoneWeek">Week {m.week}</span>
              {isHover && (
                <div className="roadmapMilestoneTooltip">{m.targetDescription}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="roadmapAxis">
        <span>Week 1</span>
        <span>Week {totalWeeks}</span>
      </div>

      <style jsx>{`
        .roadmapTimeline {
          padding: 32px 0 16px;
          max-width: 100%;
        }
        .roadmapPhaseLabels {
          position: relative;
          height: 24px;
          margin-bottom: 20px;
        }
        .roadmapPhaseLabel {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-sizing: border-box;
        }
        .roadmapPhaseLabel span {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.6;
        }
        .roadmapTrackWrap {
          position: relative;
          height: 4px;
          margin-bottom: 28px;
        }
        .roadmapRiskHeat {
          position: absolute;
          inset: 0;
          display: flex;
          border-radius: 2px;
          overflow: hidden;
          pointer-events: none;
        }
        .roadmapRiskSegment {
          position: absolute;
          top: 0;
          bottom: 0;
          height: 100%;
          transition: background 0.2s ease;
        }
        .roadmapTrack {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 2px;
          box-shadow: 0 0 20px rgba(39, 224, 166, 0.08);
        }
        .roadmapTrack--withRisk {
          background: transparent;
        }
        .roadmapDivider {
          position: absolute;
          top: -6px;
          bottom: -6px;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(39, 224, 166, 0.25), transparent);
          box-shadow: 0 0 12px rgba(39, 224, 166, 0.15);
          transform: translateX(-50%);
          pointer-events: none;
        }
        .roadmapProgress {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, rgba(47, 128, 237, 0.5), rgba(39, 224, 166, 0.5));
          border-radius: 2px;
          box-shadow: 0 0 16px rgba(39, 224, 166, 0.35);
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .roadmapMilestones {
          position: relative;
          height: 48px;
        }
        .roadmapMilestone {
          position: absolute;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 6px 0 0;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .roadmapMilestone:hover,
        .roadmapMilestone.hover {
          z-index: 2;
        }
        .roadmapMilestoneDiamond {
          font-size: 12px;
          color: rgba(39, 224, 166, 0.95);
          filter: drop-shadow(0 0 8px rgba(39, 224, 166, 0.7));
          animation: roadmapPulse 2.5s ease-in-out infinite;
        }
        .roadmapMilestone.hover .roadmapMilestoneDiamond {
          filter: drop-shadow(0 0 14px rgba(39, 224, 166, 0.9));
        }
        .roadmapMilestonePct {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.9);
        }
        .roadmapMilestoneWeek {
          font-size: 9px;
          letter-spacing: 0.04em;
          opacity: 0.65;
        }
        .roadmapMilestoneTooltip {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(8px);
          background: rgba(17, 24, 39, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 10px 12px;
          min-width: 180px;
          max-width: 240px;
          font-size: 11px;
          line-height: 1.45;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 20px rgba(39, 224, 166, 0.1);
          z-index: 10;
          pointer-events: none;
        }
        .roadmapAxis {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          font-size: 10px;
          letter-spacing: 0.04em;
          opacity: 0.5;
        }
        @keyframes roadmapPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}
