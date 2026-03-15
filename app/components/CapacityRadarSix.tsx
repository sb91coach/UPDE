"use client";

import { useMemo } from "react";
import type { CapacityProfile } from "@/types/capacity";
import { CAPACITY_DOMAINS } from "@/types/capacity";

const RADAR_AXIS_LABELS: Record<(typeof CAPACITY_DOMAINS)[number], string> = {
  force_production: "Force Prod.",
  force_expression: "Force Expr.",
  energy_system_efficiency: "Energy",
  movement_integrity: "Movement",
  durability: "Durability",
  recovery_capacity: "Recovery",
};

const RADAR_SIZE = 240;
const CENTER = RADAR_SIZE / 2;
const MAX_R = CENTER - 40;

function scoreColor(score: number): string {
  if (score >= 75) return "rgba(39,224,166,0.5)";
  if (score >= 60) return "rgba(234,179,8,0.5)";
  return "rgba(239,68,68,0.5)";
}

function strokeColor(score: number): string {
  if (score >= 75) return "rgba(39,224,166,0.95)";
  if (score >= 60) return "rgba(234,179,8,0.95)";
  return "rgba(239,68,68,0.95)";
}

type Props = {
  profile: CapacityProfile | null;
  className?: string;
};

export default function CapacityRadarSix({ profile, className = "" }: Props) {
  const scores = useMemo(() => {
    if (!profile) return null;
    return CAPACITY_DOMAINS.map((d) => profile.scores[d].score);
  }, [profile]);

  const polygonPoints = useMemo(() => {
    if (!scores || scores.length === 0) return "";
    return CAPACITY_DOMAINS.map((_, i) => {
      const angle = (i * 360) / CAPACITY_DOMAINS.length - 90;
      const rad = (angle * Math.PI) / 180;
      const r = ((scores[i] ?? 0) / 100) * MAX_R;
      const x = CENTER + r * Math.cos(rad);
      const y = CENTER + r * Math.sin(rad);
      return `${x},${y}`;
    }).join(" ");
  }, [scores]);

  const axisLines = useMemo(
    () =>
      CAPACITY_DOMAINS.map((_, i) => {
        const angle = (i * 360) / CAPACITY_DOMAINS.length - 90;
        const rad = (angle * Math.PI) / 180;
        const x = CENTER + MAX_R * Math.cos(rad);
        const y = CENTER + MAX_R * Math.sin(rad);
        return { x1: CENTER, y1: CENTER, x2: x, y2: y };
      }),
    []
  );

  const labelPositions = useMemo(
    () =>
      CAPACITY_DOMAINS.map((key, i) => {
        const angle = (i * 360) / CAPACITY_DOMAINS.length - 90;
        const rad = (angle * Math.PI) / 180;
        const r = MAX_R + 22;
        const x = CENTER + r * Math.cos(rad);
        const y = CENTER + r * Math.sin(rad);
        return { key, x, y, score: scores?.[i] ?? 0 };
      }),
    [scores]
  );

  const fill = scores
    ? scoreColor(scores.reduce((a, b) => a + b, 0) / scores.length)
    : "rgba(47,128,237,0.2)";
  const stroke = scores
    ? strokeColor(scores.reduce((a, b) => a + b, 0) / scores.length)
    : "rgba(47,128,237,0.5)";

  return (
    <div className={`p-3 sm:p-4 min-w-0 ${className}`}>
      <div className="w-full max-w-[280px] mx-auto min-w-0">
        <svg
          viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
          className="w-full h-auto"
          aria-label="Six-domain capacity radar"
        >
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle
              key={f}
              cx={CENTER}
              cy={CENTER}
              r={MAX_R * f}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          ))}
          {/* Axes */}
          {axisLines.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
          ))}
          {/* Data polygon */}
          {polygonPoints && (
            <polygon
              points={polygonPoints}
              fill={fill}
              stroke={stroke}
              strokeWidth="2"
              className="transition-[fill,stroke] duration-300"
            />
          )}
          {/* Labels */}
          {labelPositions.map(({ key, x, y }) => (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.85)"
              fontSize="9"
            >
              {RADAR_AXIS_LABELS[key]}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
