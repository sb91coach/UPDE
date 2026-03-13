"use client";

/**
 * Risk badge — surface overload/neural/recovery subtly on dashboard.
 * Minimal, premium; no clutter.
 */

import type { RiskLevel, RecoveryTrend } from "@/engine/riskIndex";

export type RiskBadgeProps = {
  overloadRisk?: RiskLevel;
  neuralStrain?: RiskLevel;
  recoveryCompression?: RecoveryTrend;
  className?: string;
};

function levelColor(level: RiskLevel): string {
  if (level === "high") return "rgba(239, 68, 68, 0.25)";
  if (level === "moderate") return "rgba(234, 179, 8, 0.2)";
  return "rgba(34, 197, 94, 0.15)";
}

function levelBorder(level: RiskLevel): string {
  if (level === "high") return "rgba(239, 68, 68, 0.5)";
  if (level === "moderate") return "rgba(234, 179, 8, 0.5)";
  return "rgba(34, 197, 94, 0.4)";
}

export default function RiskBadge({
  overloadRisk,
  neuralStrain,
  recoveryCompression,
  className = "",
}: RiskBadgeProps) {
  const show = [overloadRisk, neuralStrain, recoveryCompression].some(Boolean);
  if (!show) return null;

  return (
    <div className={`riskBadge ${className}`}>
      {overloadRisk && (
        <span
          className="riskBadgePill"
          style={{
            background: levelColor(overloadRisk),
            borderColor: levelBorder(overloadRisk),
          }}
        >
          Load: {overloadRisk}
        </span>
      )}
      {neuralStrain && (
        <span
          className="riskBadgePill"
          style={{
            background: levelColor(neuralStrain),
            borderColor: levelBorder(neuralStrain),
          }}
        >
          Neural: {neuralStrain}
        </span>
      )}
      {recoveryCompression && (
        <span className="riskBadgePill riskBadgePillNeutral">
          Recovery: {recoveryCompression}
        </span>
      )}
      <style jsx>{`
        .riskBadge {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .riskBadgePill {
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid;
          text-transform: capitalize;
        }
        .riskBadgePillNeutral {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </div>
  );
}
