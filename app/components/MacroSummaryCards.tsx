"use client";

export type MacroSummary = {
  label: string;
  sevenDayAvg: number;
  percentChangeVsPrevious7: number;
  unit: string;
};

export type MacroSummaryCardsProps = {
  summaries: MacroSummary[];
  className?: string;
};

function glowClass(percentChange: number): "green" | "blue" | "amber" {
  if (percentChange > 5) return "green";
  if (percentChange < -8 || percentChange > 15) return "amber";
  return "blue";
}

export default function MacroSummaryCards({
  summaries,
  className = "",
}: MacroSummaryCardsProps) {
  return (
    <div className={`macroSummaryCards ${className}`}>
      {summaries.map((s) => {
        const glow = glowClass(s.percentChangeVsPrevious7);
        return (
          <div
            key={s.label}
            className={`macroSummaryCard macroSummaryCard--${glow}`}
          >
            <div className="macroSummaryLabel">{s.label}</div>
            <div className="macroSummaryAvg">
              {s.sevenDayAvg}
              <span className="macroSummaryUnit">{s.unit}</span>
            </div>
            <div className="macroSummaryChange">
              {s.percentChangeVsPrevious7 >= 0 ? "+" : ""}
              {s.percentChangeVsPrevious7.toFixed(1)}% vs prev 7 days
            </div>
          </div>
        );
      })}
      <style jsx>{`
        .macroSummaryCards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .macroSummaryCard {
          padding: 18px 20px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .macroSummaryCard:hover {
          border-color: rgba(47, 128, 237, 0.25);
          box-shadow: 0 0 24px rgba(47, 128, 237, 0.2), 0 0 48px rgba(39, 224, 166, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .macroSummaryCard--green:hover {
          box-shadow: 0 0 24px rgba(39, 224, 166, 0.35), 0 0 48px rgba(39, 224, 166, 0.15), 0 8px 32px rgba(0, 0, 0, 0.3);
          border-color: rgba(39, 224, 166, 0.3);
        }
        .macroSummaryCard--amber:hover {
          box-shadow: 0 0 24px rgba(245, 158, 11, 0.3), 0 0 48px rgba(245, 158, 11, 0.12), 0 8px 32px rgba(0, 0, 0, 0.3);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .macroSummaryLabel {
          font-size: 11px;
          letter-spacing: 0.08em;
          opacity: 0.75;
          margin-bottom: 8px;
        }
        .macroSummaryAvg {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }
        .macroSummaryUnit {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.7;
          margin-left: 4px;
        }
        .macroSummaryChange {
          font-size: 12px;
          opacity: 0.8;
        }
        .macroSummaryCard--green .macroSummaryChange {
          color: #27e0a6;
        }
        .macroSummaryCard--blue .macroSummaryChange {
          color: #3b82f6;
        }
        .macroSummaryCard--amber .macroSummaryChange {
          color: #f59e0b;
        }
        @media (max-width: 768px) {
          .macroSummaryCards {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
