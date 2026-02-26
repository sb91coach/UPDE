"use client";

/**
 * Decision Transparency Log — why programme changed.
 * Phase 2: every programme change logs trigger, threshold, adjustment.
 */

export type DecisionLogEntry = {
  id: string;
  createdAt: string;
  decisionType: string;
  adjustmentMade: string;
  explanation: string;
  triggerVariables?: Record<string, unknown>;
};

export type DecisionLogProps = {
  entries: DecisionLogEntry[];
  maxItems?: number;
  className?: string;
};

export default function DecisionLog({
  entries,
  maxItems = 5,
  className = "",
}: DecisionLogProps) {
  const show = entries.slice(0, maxItems);
  return (
    <div className={`decisionLog ${className}`}>
      <div className="decisionLogTitle">Why this changed</div>
      {show.length === 0 ? (
        <p className="decisionLogEmpty">No programme changes logged yet.</p>
      ) : (
        <ul className="decisionLogList">
          {show.map((e) => (
            <li key={e.id} className="decisionLogItem">
              <div className="decisionLogAdjustment">{e.adjustmentMade}</div>
              <div className="decisionLogExplanation">{e.explanation}</div>
              <div className="decisionLogMeta">{e.createdAt}</div>
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .decisionLog {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px 20px;
        }
        .decisionLogTitle {
          font-size: 11px;
          letter-spacing: 0.08em;
          opacity: 0.65;
          margin-bottom: 12px;
        }
        .decisionLogEmpty {
          font-size: 13px;
          opacity: 0.6;
          margin: 0;
        }
        .decisionLogList { list-style: none; margin: 0; padding: 0; }
        .decisionLogItem {
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .decisionLogItem:last-child { border-bottom: none; }
        .decisionLogAdjustment { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
        .decisionLogExplanation { font-size: 12px; opacity: 0.8; line-height: 1.4; }
        .decisionLogMeta { font-size: 11px; opacity: 0.5; margin-top: 4px; }
      `}</style>
    </div>
  );
}
