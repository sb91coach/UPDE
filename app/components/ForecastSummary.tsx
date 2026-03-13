"use client";

import type { ForecastResult } from "@/types/forecast";

export type ForecastSummaryProps = {
  forecast: ForecastResult;
  weeksForward?: number;
  className?: string;
};

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Math.round(value)}%`;
}

export default function ForecastSummary({
  forecast,
  weeksForward = 8,
  className = "",
}: ForecastSummaryProps) {
  const { projected, confidence } = forecast;
  const current =
    forecast.historical.length > 0
      ? forecast.historical[forecast.historical.length - 1]
      : 0;
  const projectedValue = projected[weeksForward - 1] ?? projected[projected.length - 1] ?? current;
  const changePct = current !== 0 ? ((projectedValue - current) / current) * 100 : 0;

  let riskLevel: "green" | "amber" | "red" = "green";
  let riskLabel = "Low";
  if (confidence < 0.5) {
    riskLevel = "red";
    riskLabel = "High";
  } else if (confidence < 0.75) {
    riskLevel = "amber";
    riskLabel = "Medium";
  }

  return (
    <div className={`forecastSummary ${className}`}>
      <div className="forecastSummaryRow">
        <span className="forecastSummaryLabel">
          Projected PPS in {weeksForward} weeks:
        </span>
        <span className="forecastSummaryValue forecastSummaryChange">
          {formatPercent(changePct)}
        </span>
      </div>
      <div className="forecastSummaryRow">
        <span className="forecastSummaryLabel">Confidence:</span>
        <span className="forecastSummaryValue">
          {Math.round(confidence * 100)}%
        </span>
      </div>
      <div className="forecastSummaryRow">
        <span className="forecastSummaryLabel">Risk Level:</span>
        <span
          className={`forecastSummaryRisk forecastSummaryRisk${riskLevel}`}
          aria-label={`Risk level: ${riskLabel}`}
        >
          {riskLabel}
        </span>
      </div>
      <style jsx>{`
        .forecastSummary {
          margin-top: 20px;
          padding: 16px 20px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.05),
            rgba(255, 255, 255, 0.02)
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .forecastSummary:hover {
          box-shadow: 0 0 20px rgba(47, 128, 237, 0.2),
            0 0 40px rgba(39, 224, 166, 0.1);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .forecastSummaryRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .forecastSummaryRow:last-child {
          margin-bottom: 0;
        }
        .forecastSummaryLabel {
          font-size: 13px;
          opacity: 0.85;
        }
        .forecastSummaryValue {
          font-size: 14px;
          font-weight: 600;
        }
        .forecastSummaryChange {
          color: #27e0a6;
        }
        .forecastSummaryRisk {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .forecastSummaryRiskgreen {
          background: rgba(39, 224, 166, 0.2);
          color: #27e0a6;
        }
        .forecastSummaryRiskamber {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        .forecastSummaryRiskred {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
