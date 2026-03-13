"use client";

import { useState } from "react";
import type { Milestone } from "@/lib/goalEngine";
import type { MilestoneProgressEntry } from "@/lib/strategyStore";

export type MilestoneUpdateModalProps = {
  milestone: Milestone | null;
  primaryUnit: string;
  isTimeMetric: boolean;
  existingProgress?: MilestoneProgressEntry | null;
  onSave: (actualValue: number, notes: string) => void;
  onClose: () => void;
  className?: string;
};

export default function MilestoneUpdateModal({
  milestone,
  primaryUnit,
  isTimeMetric,
  existingProgress,
  onSave,
  onClose,
  className = "",
}: MilestoneUpdateModalProps) {
  const [actualValue, setActualValue] = useState(
    existingProgress?.actualValue != null ? String(existingProgress.actualValue) : ""
  );
  const [notes, setNotes] = useState("");

  if (!milestone) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = isTimeMetric ? parseFloat(actualValue) : parseFloat(actualValue);
    if (!Number.isFinite(num)) return;
    onSave(num, notes);
    onClose();
  };

  return (
    <div className={`milestoneUpdateModalOverlay ${className}`} onClick={onClose} role="dialog" aria-modal="true">
      <div className="milestoneUpdateModal" onClick={(e) => e.stopPropagation()}>
        <h3 className="milestoneUpdateModalTitle">Update milestone — {milestone.label}</h3>
        <p className="milestoneUpdateModalWeek">Week {milestone.week}</p>
        <form onSubmit={handleSubmit} className="milestoneUpdateModalForm">
          <label className="milestoneUpdateModalField">
            <span className="milestoneUpdateModalLabel">Actual performance ({primaryUnit})</span>
            <input
              type={isTimeMetric ? "number" : "number"}
              step={isTimeMetric ? 1 : 0.1}
              className="milestoneUpdateModalInput"
              value={actualValue}
              onChange={(e) => setActualValue(e.target.value)}
              placeholder={isTimeMetric ? "Seconds" : "Value"}
              required
            />
          </label>
          <label className="milestoneUpdateModalField">
            <span className="milestoneUpdateModalLabel">Notes</span>
            <textarea
              className="milestoneUpdateModalTextarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </label>
          <div className="milestoneUpdateModalActions">
            <button type="button" className="milestoneUpdateModalBtn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="milestoneUpdateModalBtn primary" disabled={!actualValue.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .milestoneUpdateModalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 24px;
        }
        .milestoneUpdateModal {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(30, 41, 59, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 28px 32px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), 0 0 24px rgba(39, 224, 166, 0.1);
        }
        .milestoneUpdateModalTitle {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 4px;
          color: #fff;
        }
        .milestoneUpdateModalWeek {
          font-size: 11px;
          opacity: 0.65;
          margin: 0 0 20px;
        }
        .milestoneUpdateModalForm {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .milestoneUpdateModalField {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .milestoneUpdateModalLabel {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .milestoneUpdateModalInput,
        .milestoneUpdateModalTextarea {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
        }
        .milestoneUpdateModalTextarea {
          resize: vertical;
          min-height: 56px;
        }
        .milestoneUpdateModalActions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }
        .milestoneUpdateModalBtn {
          padding: 10px 18px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: opacity 0.2s ease, box-shadow 0.2s ease;
        }
        .milestoneUpdateModalBtn.secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.9);
        }
        .milestoneUpdateModalBtn.primary {
          background: rgba(39, 224, 166, 0.25);
          border: 1px solid rgba(39, 224, 166, 0.4);
          color: #fff;
        }
        .milestoneUpdateModalBtn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
