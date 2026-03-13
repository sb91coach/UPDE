"use client";

import type { StrategyGoal } from "@/lib/strategyStore";
import type { ExecutionProbabilityResult } from "@/lib/goalEngine";
import {
  getStrategicAdjustments,
  type StrategicAdjustment,
  type AdjustmentSource,
} from "@/lib/strategyAdjustmentsEngine";

export type StrategyAdjustmentsPanelProps = {
  goal: StrategyGoal | null;
  execution: ExecutionProbabilityResult | null;
  className?: string;
};

const SOURCE_LABELS: Record<AdjustmentSource, string> = {
  injury: "From your injury & notes",
  notes: "From your constraints",
  deviation: "From your progress",
  risk: "From your timeline & targets",
  load: "From your event & load",
  category: "From your goal type",
};

const SOURCE_ORDER: AdjustmentSource[] = ["injury", "notes", "deviation", "risk", "load", "category"];

function groupBySource(adjustments: StrategicAdjustment[]): Map<AdjustmentSource, StrategicAdjustment[]> {
  const map = new Map<AdjustmentSource, StrategicAdjustment[]>();
  for (const a of adjustments) {
    const list = map.get(a.source) ?? [];
    list.push(a);
    map.set(a.source, list);
  }
  return map;
}

export default function StrategyAdjustmentsPanel({
  goal,
  execution,
  className = "",
}: StrategyAdjustmentsPanelProps) {
  const adjustments = getStrategicAdjustments(goal, execution);
  if (adjustments.length === 0) return null;

  const bySource = groupBySource(adjustments);

  return (
    <div className={`strategyAdjustmentsPanel ${className}`}>
      <h3 className="strategyAdjustmentsPanelTitle">Strategic adjustments</h3>
      <p className="strategyAdjustmentsPanelSub">
        Recommendations derived from your injury notes, constraints, milestone results, and timeline—prioritised so you can act on what matters first.
      </p>
      <div className="strategyAdjustmentsPanelGroups">
        {SOURCE_ORDER.filter((src) => bySource.get(src)?.length).map((source) => (
          <div key={source} className="strategyAdjustmentsPanelGroup">
            <span className="strategyAdjustmentsPanelGroupLabel">{SOURCE_LABELS[source]}</span>
            <ul className="strategyAdjustmentsPanelList">
              {(bySource.get(source) ?? []).map((a) => (
                <li key={a.id} className="strategyAdjustmentsPanelItem">
                  <span className="strategyAdjustmentsPanelItemTitle">{a.title}</span>
                  <p className="strategyAdjustmentsPanelItemRec">{a.recommendation}</p>
                  <p className="strategyAdjustmentsPanelItemRationale">{a.rationale}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <style jsx>{`
        .strategyAdjustmentsPanel {
          padding: 24px 28px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
        }
        .strategyAdjustmentsPanelTitle {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin: 0 0 6px;
          color: #fff;
        }
        .strategyAdjustmentsPanelSub {
          font-size: 11px;
          opacity: 0.7;
          margin: 0 0 20px;
          line-height: 1.5;
        }
        .strategyAdjustmentsPanelGroups {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .strategyAdjustmentsPanelGroup {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .strategyAdjustmentsPanelGroupLabel {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(39, 224, 166, 0.9);
        }
        .strategyAdjustmentsPanelList {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }
        .strategyAdjustmentsPanelItem {
          margin-bottom: 16px;
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
          border-left: 3px solid rgba(255, 255, 255, 0.12);
        }
        .strategyAdjustmentsPanelItem:last-child {
          margin-bottom: 0;
        }
        .strategyAdjustmentsPanelItemTitle {
          display: block;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #fff;
        }
        .strategyAdjustmentsPanelItemRec {
          font-size: 12px;
          line-height: 1.5;
          margin: 0 0 6px;
          opacity: 0.95;
        }
        .strategyAdjustmentsPanelItemRationale {
          font-size: 11px;
          line-height: 1.45;
          margin: 0;
          opacity: 0.7;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
