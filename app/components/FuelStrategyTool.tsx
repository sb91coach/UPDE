"use client";

import { useState } from "react";
import {
  generateFuelStrategy,
  type FuelStrategyOutput,
  type Intensity,
  type Goal,
  type BodyCompositionInput,
} from "@/lib/fuelingEngine";

const EVENT_TYPES = [
  "Strength",
  "Hypertrophy",
  "Endurance",
  "HIIT",
  "Skill / Mobility",
  "Rest Day",
];

export type FuelStrategyToolProps = {
  bodyComposition?: BodyCompositionInput | null;
};

export default function FuelStrategyTool({ bodyComposition }: FuelStrategyToolProps = {}) {
  const [eventType, setEventType] = useState("Strength");
  const [durationInput, setDurationInput] = useState("60");
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [bodyweightInput, setBodyweightInput] = useState("75");
  const [goal, setGoal] = useState<Goal>("performance");
  const [result, setResult] = useState<FuelStrategyOutput | null>(null);
  const [showResult, setShowResult] = useState(false);

  const durationMinutes = Math.min(240, Math.max(15, parseInt(durationInput, 10) || 60));
  const bodyweight = Math.min(200, Math.max(40, parseInt(bodyweightInput, 10) || 70));

  const handleGenerate = () => {
    const out = generateFuelStrategy({
      eventType,
      durationMinutes,
      intensity,
      bodyweight,
      goal,
      bodyComposition: bodyComposition ?? undefined,
    });
    setResult(out);
    setShowResult(true);
  };

  return (
    <div className="fuelStrategyTool">
      <div className="fuelStrategyCard">
        <h3 className="fuelStrategyTitle">Fuel strategy tool</h3>
        <p className="fuelStrategySub">
          Generate macro targets and timing from event type, duration, and goal.
        </p>
        <div className="fuelStrategyForm">
          <label className="fuelStrategyLabel">
            Event type
            <select
              className="fuelStrategySelect"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {EVENT_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="fuelStrategyLabel">
            Duration (min)
            <input
              type="number"
              className="fuelStrategyInput"
              min={15}
              max={240}
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
            />
          </label>
          <label className="fuelStrategyLabel">
            Intensity
            <select
              className="fuelStrategySelect"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as Intensity)}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="fuelStrategyLabel">
            Bodyweight (kg)
            <input
              type="number"
              className="fuelStrategyInput"
              min={40}
              max={200}
              value={bodyweightInput}
              onChange={(e) => setBodyweightInput(e.target.value)}
            />
          </label>
          <label className="fuelStrategyLabel">
            Goal
            <select
              className="fuelStrategySelect"
              value={goal}
              onChange={(e) => setGoal(e.target.value as Goal)}
            >
              <option value="performance">Performance</option>
              <option value="maintenance">Maintenance</option>
              <option value="cut">Cut</option>
              <option value="mass">Mass</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="fuelStrategyBtn"
          onClick={handleGenerate}
        >
          Generate strategy
        </button>
        {result && showResult && (
          <div className="fuelStrategyResult">
            <div className="fuelStrategyResultMacros">
              <span>{result.totalCalories} kcal</span>
              <span>P: {result.proteinGrams}g</span>
              <span>C: {result.carbsGrams}g</span>
              <span>F: {result.fatsGrams}g</span>
            </div>
            <div className="fuelStrategyResultSection">
              <strong>Pre-event</strong>
              <p>{result.preEventStrategy}</p>
            </div>
            <div className="fuelStrategyResultSection">
              <strong>Intra-event</strong>
              <p>{result.intraEventStrategy}</p>
            </div>
            <div className="fuelStrategyResultSection">
              <strong>Post-event</strong>
              <p>{result.postEventStrategy}</p>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .fuelStrategyTool {
          margin-bottom: 24px;
        }
        .fuelStrategyCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .fuelStrategyCard:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .fuelStrategyTitle {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .fuelStrategySub {
          font-size: 14px;
          opacity: 0.8;
          margin: 0 0 24px;
          line-height: 1.45;
        }
        .fuelStrategyForm {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .fuelStrategyLabel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.9;
        }
        .fuelStrategySelect,
        .fuelStrategyInput {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
        }
        .fuelStrategySelect:focus,
        .fuelStrategyInput:focus {
          outline: none;
          border-color: rgba(47, 128, 237, 0.5);
          box-shadow: 0 0 0 2px rgba(47, 128, 237, 0.2);
        }
        .fuelStrategyBtn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #2f80ed, rgba(39, 224, 166, 0.9));
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .fuelStrategyBtn:hover {
          box-shadow: 0 0 20px rgba(47, 128, 237, 0.4), 0 0 36px rgba(39, 224, 166, 0.3);
          transform: scale(1.02);
        }
        .fuelStrategyResult {
          margin-top: 24px;
          padding: 20px 24px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          animation: fuelStrategyFadeIn 0.4s ease-out;
        }
        @keyframes fuelStrategyFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fuelStrategyResultMacros {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
          font-size: 15px;
          font-weight: 600;
          color: #27e0a6;
        }
        .fuelStrategyResultSection {
          margin-bottom: 16px;
        }
        .fuelStrategyResultSection:last-child {
          margin-bottom: 0;
        }
        .fuelStrategyResultSection strong {
          display: block;
          font-size: 12px;
          letter-spacing: 0.06em;
          opacity: 0.9;
          margin-bottom: 6px;
        }
        .fuelStrategyResultSection p {
          font-size: 14px;
          opacity: 0.85;
          line-height: 1.5;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
