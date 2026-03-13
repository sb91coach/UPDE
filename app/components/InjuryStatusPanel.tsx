"use client";

import { useState, useEffect } from "react";
import type { InjuryStatus } from "@/lib/strategyStore";

export type InjuryStatusPanelProps = {
  injuryStatus?: InjuryStatus | null;
  onChange: (status: InjuryStatus | null) => void;
  className?: string;
};

const SEVERITIES: { value: "low" | "moderate" | "high"; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

export default function InjuryStatusPanel({
  injuryStatus,
  onChange,
  className = "",
}: InjuryStatusPanelProps) {
  const [active, setActive] = useState(!!injuryStatus?.active);
  const [type, setType] = useState(injuryStatus?.type ?? "");
  const [severity, setSeverity] = useState<"low" | "moderate" | "high">(injuryStatus?.severity ?? "moderate");
  const [notes, setNotes] = useState(injuryStatus?.limitationNotes ?? "");

  useEffect(() => {
    setActive(!!injuryStatus?.active);
    setType(injuryStatus?.type ?? "");
    setSeverity(injuryStatus?.severity ?? "moderate");
    setNotes(injuryStatus?.limitationNotes ?? "");
  }, [injuryStatus]);

  const apply = (a: boolean, t: string, s: "low" | "moderate" | "high", n: string) => {
    if (!a) {
      onChange(null);
      return;
    }
    onChange({ active: true, type: t || undefined, severity: s, limitationNotes: n || undefined });
  };

  const handleActiveChange = (v: boolean) => {
    setActive(v);
    apply(v, type, severity, notes);
  };

  const handleTypeChange = (v: string) => {
    setType(v);
    apply(active, v, severity, notes);
  };

  const handleSeverityChange = (v: "low" | "moderate" | "high") => {
    setSeverity(v);
    apply(active, type, v, notes);
  };

  const handleNotesChange = (v: string) => {
    setNotes(v);
    apply(active, type, severity, v);
  };

  return (
    <div className={`injuryStatusPanel ${className}`}>
      <h3 className="injuryStatusPanelTitle">Injury status</h3>
      <p className="injuryStatusPanelSub">When active, roadmap extends foundation and flags high-load weeks.</p>
      <div className="injuryStatusPanelForm">
        <label className="injuryStatusPanelRow">
          <span className="injuryStatusPanelLabel">Injury active</span>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            className={`injuryStatusPanelToggle ${active ? "on" : ""}`}
            onClick={() => handleActiveChange(!active)}
          >
            <span className="injuryStatusPanelToggleThumb" />
          </button>
        </label>
        {active && (
          <>
            <label className="injuryStatusPanelField">
              <span className="injuryStatusPanelLabel">Injury type</span>
              <input
                type="text"
                className="injuryStatusPanelInput"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                placeholder="e.g. Lower back, knee"
              />
            </label>
            <label className="injuryStatusPanelField">
              <span className="injuryStatusPanelLabel">Severity</span>
              <select
                className="injuryStatusPanelSelect"
                value={severity}
                onChange={(e) => handleSeverityChange(e.target.value as "low" | "moderate" | "high")}
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="injuryStatusPanelField injuryStatusPanelFieldFull">
              <span className="injuryStatusPanelLabel">Notes</span>
              <textarea
                className="injuryStatusPanelTextarea"
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Limitations, modifications..."
                rows={2}
              />
            </label>
          </>
        )}
      </div>
      <style jsx>{`
        .injuryStatusPanel {
          padding: 24px 28px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
        }
        .injuryStatusPanelTitle {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin: 0 0 6px;
          color: #fff;
        }
        .injuryStatusPanelSub {
          font-size: 11px;
          opacity: 0.65;
          margin: 0 0 20px;
          line-height: 1.4;
        }
        .injuryStatusPanelForm {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .injuryStatusPanelRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .injuryStatusPanelField {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .injuryStatusPanelFieldFull {
          grid-column: 1 / -1;
        }
        .injuryStatusPanelLabel {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .injuryStatusPanelInput,
        .injuryStatusPanelSelect,
        .injuryStatusPanelTextarea {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
        }
        .injuryStatusPanelTextarea {
          resize: vertical;
          min-height: 56px;
        }
        .injuryStatusPanelToggle {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          position: relative;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .injuryStatusPanelToggle.on {
          background: rgba(239, 68, 68, 0.35);
          border-color: rgba(239, 68, 68, 0.5);
        }
        .injuryStatusPanelToggleThumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s ease;
        }
        .injuryStatusPanelToggle.on .injuryStatusPanelToggleThumb {
          transform: translateX(20px);
        }
      `}</style>
    </div>
  );
}
