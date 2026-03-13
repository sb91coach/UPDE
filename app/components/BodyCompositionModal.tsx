"use client";

import { useState, useEffect } from "react";
import { saveBodyComposition, getBodyComposition } from "@/lib/nutritionStore";
import type { BodyComposition } from "@/lib/nutritionStore";

export type BodyCompositionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function BodyCompositionModal({
  isOpen,
  onClose,
  onSaved,
}: BodyCompositionModalProps) {
  const [bodyweight, setBodyweight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getBodyComposition();
      if (existing) {
        setBodyweight(String(existing.bodyweight));
        setBodyFat(String(existing.bodyFat));
        setMuscleMass(String(existing.muscleMass));
        setWaistCm(existing.waistCm != null ? String(existing.waistCm) : "");
      } else {
        setBodyweight("");
        setBodyFat("");
        setMuscleMass("");
        setWaistCm("");
      }
      setShowSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    const bw = Math.min(200, Math.max(40, parseFloat(bodyweight) || 70));
    const bf = Math.min(50, Math.max(0, parseFloat(bodyFat) || 0));
    const mm = Math.min(150, Math.max(0, parseFloat(muscleMass) || bw * 0.9));
    const data: BodyComposition = {
      bodyweight: bw,
      bodyFat: bf,
      muscleMass: mm,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    const w = parseFloat(waistCm);
    if (Number.isFinite(w) && w > 0) data.waistCm = w;
    saveBodyComposition(data);
    setShowSaved(true);
    onSaved();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="bodyCompBackdrop" onClick={onClose}>
      <div className="bodyCompModal" onClick={(e) => e.stopPropagation()}>
        <div className="bodyCompModalHeader">
          <span className="bodyCompModalTitle">Update body composition</span>
          <button type="button" className="bodyCompModalClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="bodyCompModalBody">
          {showSaved && (
            <div className="bodyCompDataUpdated" role="status">
              Data Updated
            </div>
          )}
          <label className="bodyCompLabel">
            Bodyweight (kg)
            <input
              type="number"
              className="bodyCompInput"
              min={40}
              max={200}
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value)}
            />
          </label>
          <label className="bodyCompLabel">
            Body fat (%)
            <input
              type="number"
              className="bodyCompInput"
              min={0}
              max={50}
              step={0.5}
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
          </label>
          <label className="bodyCompLabel">
            Muscle mass (kg)
            <input
              type="number"
              className="bodyCompInput"
              min={0}
              max={150}
              step={0.5}
              value={muscleMass}
              onChange={(e) => setMuscleMass(e.target.value)}
            />
          </label>
          <label className="bodyCompLabel">
            Waist circumference (cm) — optional
            <input
              type="number"
              className="bodyCompInput"
              min={0}
              max={200}
              step={0.5}
              value={waistCm}
              onChange={(e) => setWaistCm(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <div className="bodyCompActions">
            <button type="button" className="bodyCompCancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="bodyCompSave" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .bodyCompBackdrop {
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
        .bodyCompModal {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(30, 41, 59, 0.98));
          border-radius: 16px;
          overflow: hidden;
          max-width: 420px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(47, 128, 237, 0.15);
        }
        .bodyCompModalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .bodyCompModalTitle {
          font-size: 16px;
          font-weight: 600;
        }
        .bodyCompModalClose {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.8;
          line-height: 1;
        }
        .bodyCompModalClose:hover {
          opacity: 1;
        }
        .bodyCompModalBody {
          padding: 18px 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .bodyCompDataUpdated {
          padding: 10px 14px;
          background: rgba(39, 224, 166, 0.15);
          border: 1px solid rgba(39, 224, 166, 0.4);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #27e0a6;
          text-align: center;
          animation: bodyCompGlow 0.6s ease-out;
        }
        @keyframes bodyCompGlow {
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
        .bodyCompLabel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          opacity: 0.9;
        }
        .bodyCompInput {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          font-size: 14px;
        }
        .bodyCompInput:focus {
          outline: none;
          border-color: rgba(47, 128, 237, 0.5);
        }
        .bodyCompActions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .bodyCompCancel {
          flex: 1;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }
        .bodyCompCancel:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .bodyCompSave {
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
        .bodyCompSave:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
