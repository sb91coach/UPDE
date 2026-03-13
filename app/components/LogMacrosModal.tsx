"use client";

import { useState, useEffect } from "react";
import { saveMacroLog } from "@/lib/nutritionStore";
import type { DailyMacroLog } from "@/lib/nutritionStore";

export type LogMacrosModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LogMacrosModal({
  isOpen,
  onClose,
  onSaved,
}: LogMacrosModalProps) {
  const [date, setDate] = useState(todayStr());
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [calories, setCalories] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(todayStr());
      setProtein("");
      setCarbs("");
      setFats("");
      setCalories("");
      setShowSaved(false);
    }
  }, [isOpen]);

  const p = parseFloat(protein) || 0;
  const c = parseFloat(carbs) || 0;
  const f = parseFloat(fats) || 0;
  const computedCal = p * 4 + c * 4 + f * 9;
  const displayCalories = calories.trim() !== "" ? parseFloat(calories) || 0 : Math.round(computedCal);

  const handleSave = () => {
    const log: DailyMacroLog = {
      date,
      protein: Math.round(p),
      carbs: Math.round(c),
      fats: Math.round(f),
      calories: displayCalories || Math.round(computedCal),
    };
    saveMacroLog(log);
    setShowSaved(true);
    onSaved();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="logMacrosBackdrop" onClick={onClose}>
      <div className="logMacrosModal" onClick={(e) => e.stopPropagation()}>
        <div className="logMacrosModalHeader">
          <span className="logMacrosModalTitle">Log macros</span>
          <button type="button" className="logMacrosModalClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="logMacrosModalBody">
          {showSaved && (
            <div className="logMacrosDataUpdated" role="status">
              Data Updated
            </div>
          )}
          <label className="logMacrosLabel">
            Date
            <input
              type="date"
              className="logMacrosInput"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="logMacrosLabel">
            Protein (g)
            <input
              type="number"
              className="logMacrosInput"
              min={0}
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </label>
          <label className="logMacrosLabel">
            Carbs (g)
            <input
              type="number"
              className="logMacrosInput"
              min={0}
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
          </label>
          <label className="logMacrosLabel">
            Fats (g)
            <input
              type="number"
              className="logMacrosInput"
              min={0}
              value={fats}
              onChange={(e) => setFats(e.target.value)}
            />
          </label>
          <label className="logMacrosLabel">
            Calories (kcal) — leave blank to auto-calc
            <input
              type="number"
              className="logMacrosInput"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder={String(Math.round(computedCal))}
            />
          </label>
          <div className="logMacrosActions">
            <button type="button" className="logMacrosCancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="logMacrosSave" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .logMacrosBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 48px;
          z-index: 10002;
        }
        .logMacrosModal {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(30, 41, 59, 0.98));
          border-radius: 16px;
          overflow: hidden;
          max-width: 420px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(47, 128, 237, 0.15);
        }
        .logMacrosModalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .logMacrosModalTitle {
          font-size: 16px;
          font-weight: 600;
        }
        .logMacrosModalClose {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.8;
          line-height: 1;
        }
        .logMacrosModalClose:hover {
          opacity: 1;
        }
        .logMacrosModalBody {
          padding: 18px 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .logMacrosDataUpdated {
          padding: 10px 14px;
          background: rgba(39, 224, 166, 0.15);
          border: 1px solid rgba(39, 224, 166, 0.4);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #27e0a6;
          text-align: center;
          animation: logMacrosGlow 0.6s ease-out;
        }
        @keyframes logMacrosGlow {
          0% {
            box-shadow: 0 0 0 rgba(39, 224, 166, 0);
          }
          50% {
            box-shadow: 0 0 24px rgba(39, 224, 166, 0.5);
          }
          100% {
            box-shadow: 0 0 12px rgba(39, 224, 166, 0.2);
          }
        }
        .logMacrosLabel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          opacity: 0.9;
        }
        .logMacrosInput {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          font-size: 14px;
        }
        .logMacrosInput:focus {
          outline: none;
          border-color: rgba(47, 128, 237, 0.5);
        }
        .logMacrosActions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .logMacrosCancel {
          flex: 1;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }
        .logMacrosCancel:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .logMacrosSave {
          flex: 1;
          padding: 10px 16px;
          background: #2f80ed;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .logMacrosSave:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
