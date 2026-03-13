"use client";

import type { KpiSuggestion } from "@/lib/goalEngine";
import { formatToHHMMSS } from "@/lib/timeFormatter";

export type StrategyKPIPanelProps = {
  kpis: KpiSuggestion[];
  className?: string;
};

function formatKpiValue(value: number, unit: string): string {
  if (unit === "sec") return formatToHHMMSS(value);
  return `${value} ${unit}`;
}

export default function StrategyKPIPanel({
  kpis,
  className = "",
}: StrategyKPIPanelProps) {
  if (kpis.length === 0) return null;

  return (
    <div className={`strategyKPIPanel ${className}`}>
      <h3 className="strategyKPIPanelTitle">Metric targets</h3>
      <div className="strategyKPIPanelGrid">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className={`strategyKPICard strategyKPICard--${kpi.risk}`}
          >
            <div className="strategyKPIName">{kpi.name}</div>
            <div className="strategyKPIValues">
              <span className="strategyKPICurrent">
                {kpi.currentValue != null ? formatKpiValue(kpi.currentValue, kpi.unit) : "—"}
              </span>
              <span className="strategyKPITarget">{formatKpiValue(kpi.targetValue, kpi.unit)}</span>
            </div>
            <div className="strategyKPIRate">
              {kpi.unit === "sec"
                ? (kpi.ratePerWeek >= 0 ? "+" : "−") + formatToHHMMSS(Math.abs(kpi.ratePerWeek)) + " /week"
                : (kpi.ratePerWeek >= 0 ? "+" : "") + kpi.ratePerWeek + " " + kpi.unit + "/week"}
            </div>
            <div className={`strategyKPIRisk strategyKPIRisk--${kpi.risk}`}>
              {kpi.risk === "green" ? "Achievable" : kpi.risk === "amber" ? "Aggressive" : "Unrealistic"}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .strategyKPIPanel {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .strategyKPIPanel:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .strategyKPIPanelTitle {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 20px;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .strategyKPIPanelGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .strategyKPICard {
          padding: 18px 20px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .strategyKPICard:hover {
          border-color: rgba(47, 128, 237, 0.25);
          box-shadow: 0 0 20px rgba(47, 128, 237, 0.2);
        }
        .strategyKPICard--green:hover {
          box-shadow: 0 0 20px rgba(39, 224, 166, 0.25);
          border-color: rgba(39, 224, 166, 0.3);
        }
        .strategyKPICard--amber:hover {
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .strategyKPICard--red:hover {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .strategyKPIName {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          opacity: 0.9;
          margin-bottom: 10px;
        }
        .strategyKPIValues {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
        }
        .strategyKPICurrent {
          font-size: 13px;
          opacity: 0.8;
        }
        .strategyKPITarget {
          font-size: 16px;
          font-weight: 700;
          color: #27e0a6;
        }
        .strategyKPIRate {
          font-size: 11px;
          opacity: 0.75;
          margin-bottom: 8px;
        }
        .strategyKPIRisk {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-block;
        }
        .strategyKPIRisk--green {
          background: rgba(39, 224, 166, 0.2);
          color: #27e0a6;
        }
        .strategyKPIRisk--amber {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        .strategyKPIRisk--red {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
