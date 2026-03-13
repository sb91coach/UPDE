"use client";

import { useState, useEffect, useCallback } from "react";
import { parseHHMMSS, formatHHMMSS } from "@/lib/timeInputParser";

export type GoalDetails = {
  currentValue?: number;
  targetValue?: number;
  distance?: number;
  currentTime?: number;
  targetTime?: number;
  currentBodyweight?: number;
  targetBodyweight?: number;
  currentBodyFat?: number;
  targetBodyFat?: number;
  leanMass?: number;
  primaryLift?: string;
  current1RM?: number;
  target1RM?: number;
  secondaryLift?: string;
  primaryKpi?: string;
  skillType?: string;
  currentProficiency?: number;
  targetProficiency?: number;
  loadCarriageDistance?: number;
  loadWeight?: number;
  weeklyVolumeKm?: number;
  longRunBaselineKm?: number;
  customKpiName?: string;
  [key: string]: unknown;
};

export type GoalCategoryDetailsProps = {
  category: string;
  onUpdate: (details: GoalDetails) => void;
  currentBenchmarks?: { back_squat?: number | null; bench_press?: number | null; deadlift?: number | null; overhead_press?: number | null; two_mile_time_sec?: number | null } | null;
  className?: string;
};

const LIFT_OPTIONS = ["Squat", "Bench", "Deadlift", "Overhead Press"];

export default function GoalCategoryDetails({
  category,
  onUpdate,
  currentBenchmarks,
  className = "",
}: GoalCategoryDetailsProps) {
  const [details, setDetails] = useState<GoalDetails>({});
  const [targetTimeDisplay, setTargetTimeDisplay] = useState("");
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState("");
  const [tacticalCurrentTimeDisplay, setTacticalCurrentTimeDisplay] = useState("");
  const [tacticalTargetTimeDisplay, setTacticalTargetTimeDisplay] = useState("");

  const update = useCallback(
    (next: GoalDetails) => {
      setDetails(next);
      onUpdate(next);
    },
    [onUpdate]
  );

  useEffect(() => {
    if (category === "Marathon" || category === "Endurance") {
      if (details.targetTime != null) setTargetTimeDisplay(formatHHMMSS(details.targetTime));
      if (details.currentTime != null) setCurrentTimeDisplay(formatHHMMSS(details.currentTime));
      else if (currentBenchmarks?.two_mile_time_sec != null) setCurrentTimeDisplay(formatHHMMSS(currentBenchmarks.two_mile_time_sec));
    }
    if (category === "Tactical") {
      if (details.currentTime != null) setTacticalCurrentTimeDisplay(formatHHMMSS(details.currentTime));
      if (details.targetTime != null) setTacticalTargetTimeDisplay(formatHHMMSS(details.targetTime));
    }
  }, [category, details.targetTime, details.currentTime, currentBenchmarks?.two_mile_time_sec]);

  const handleTargetTimeBlur = () => {
    const sec = parseHHMMSS(targetTimeDisplay);
    setTargetTimeDisplay(formatHHMMSS(sec));
    update({ ...details, targetTime: sec || undefined });
  };
  const handleCurrentTimeBlur = () => {
    const sec = parseHHMMSS(currentTimeDisplay);
    setCurrentTimeDisplay(formatHHMMSS(sec));
    update({ ...details, currentTime: sec || undefined });
  };
  const handleTacticalCurrentTimeBlur = () => {
    const sec = parseHHMMSS(tacticalCurrentTimeDisplay);
    setTacticalCurrentTimeDisplay(formatHHMMSS(sec));
    update({ ...details, currentTime: sec || undefined });
  };
  const handleTacticalTargetTimeBlur = () => {
    const sec = parseHHMMSS(tacticalTargetTimeDisplay);
    setTacticalTargetTimeDisplay(formatHHMMSS(sec));
    update({ ...details, targetTime: sec || undefined });
  };

  if (!category) return null;

  if (category === "Marathon" || category === "Endurance") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel">
          Target finish time (HH:MM:SS)
          <input
            type="text"
            className="goalCategoryDetailsInput"
            value={targetTimeDisplay}
            onChange={(e) => setTargetTimeDisplay(e.target.value)}
            onBlur={handleTargetTimeBlur}
            placeholder="00:00:00"
          />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current best time (HH:MM:SS)
          <input
            type="text"
            className="goalCategoryDetailsInput"
            value={currentTimeDisplay}
            onChange={(e) => setCurrentTimeDisplay(e.target.value)}
            onBlur={handleCurrentTimeBlur}
            placeholder="00:00:00"
          />
        </label>
        <label className="goalCategoryDetailsLabel">
          Event distance (km)
          <input
            type="number"
            min={0}
            step={0.1}
            className="goalCategoryDetailsInput"
            value={details.distance ?? ""}
            onChange={(e) => update({ ...details, distance: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="e.g. 21.1"
          />
        </label>
        <label className="goalCategoryDetailsLabel">
          Weekly training volume (km)
          <input
            type="number"
            min={0}
            step={1}
            className="goalCategoryDetailsInput"
            value={details.weeklyVolumeKm ?? ""}
            onChange={(e) => update({ ...details, weeklyVolumeKm: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="e.g. 40"
          />
        </label>
        <label className="goalCategoryDetailsLabel">
          Long run baseline (km)
          <input
            type="number"
            min={0}
            step={0.5}
            className="goalCategoryDetailsInput"
            value={details.longRunBaselineKm ?? ""}
            onChange={(e) => update({ ...details, longRunBaselineKm: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="e.g. 15"
          />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Body Composition") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel">
          Current bodyweight (kg)
          <input type="number" min={0} step={0.1} className="goalCategoryDetailsInput" value={details.currentBodyweight ?? ""} onChange={(e) => update({ ...details, currentBodyweight: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 80" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target bodyweight (kg)
          <input type="number" min={0} step={0.1} className="goalCategoryDetailsInput" value={details.targetBodyweight ?? ""} onChange={(e) => update({ ...details, targetBodyweight: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 78" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current body fat (%)
          <input type="number" min={0} max={100} step={0.5} className="goalCategoryDetailsInput" value={details.currentBodyFat ?? ""} onChange={(e) => update({ ...details, currentBodyFat: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 18" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target body fat (%)
          <input type="number" min={0} max={100} step={0.5} className="goalCategoryDetailsInput" value={details.targetBodyFat ?? ""} onChange={(e) => update({ ...details, targetBodyFat: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 15" />
        </label>
        <label className="goalCategoryDetailsLabel goalCategoryDetailsLabelFull">
          Lean mass (optional, kg)
          <input type="number" min={0} step={0.1} className="goalCategoryDetailsInput" value={details.leanMass ?? ""} onChange={(e) => update({ ...details, leanMass: e.target.value ? Number(e.target.value) : undefined })} placeholder="optional" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabelFull { grid-column: 1 / -1; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Strength") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel">
          Primary lift focus
          <select className="goalCategoryDetailsInput" value={details.primaryLift ?? ""} onChange={(e) => update({ ...details, primaryLift: e.target.value || undefined })}>
            <option value="">Select</option>
            {LIFT_OPTIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="goalCategoryDetailsLabel">
          Current 1RM (kg)
          <input type="number" min={0} step={2.5} className="goalCategoryDetailsInput" value={details.current1RM ?? ""} onChange={(e) => update({ ...details, current1RM: e.target.value ? Number(e.target.value) : undefined })} placeholder={currentBenchmarks?.back_squat != null ? String(currentBenchmarks.back_squat) : "e.g. 100"} />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target 1RM (kg)
          <input type="number" min={0} step={2.5} className="goalCategoryDetailsInput" value={details.target1RM ?? ""} onChange={(e) => update({ ...details, target1RM: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 120" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Secondary lift (optional)
          <select className="goalCategoryDetailsInput" value={details.secondaryLift ?? ""} onChange={(e) => update({ ...details, secondaryLift: e.target.value || undefined })}>
            <option value="">None</option>
            {LIFT_OPTIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Performance") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel goalCategoryDetailsLabelFull">
          Primary KPI
          <input type="text" className="goalCategoryDetailsInput" value={details.primaryKpi ?? ""} onChange={(e) => update({ ...details, primaryKpi: e.target.value || undefined })} placeholder="e.g. PPS, Velocity" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current value
          <input type="number" className="goalCategoryDetailsInput" value={details.currentValue ?? ""} onChange={(e) => update({ ...details, currentValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 72" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target value
          <input type="number" className="goalCategoryDetailsInput" value={details.targetValue ?? ""} onChange={(e) => update({ ...details, targetValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 85" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabelFull { grid-column: 1 / -1; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Tactical") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel">
          Load carriage distance (km)
          <input type="number" min={0} step={0.1} className="goalCategoryDetailsInput" value={details.loadCarriageDistance ?? ""} onChange={(e) => update({ ...details, loadCarriageDistance: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 12" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Load weight (kg)
          <input type="number" min={0} step={1} className="goalCategoryDetailsInput" value={details.loadWeight ?? ""} onChange={(e) => update({ ...details, loadWeight: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 25" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current time (HH:MM:SS)
          <input type="text" className="goalCategoryDetailsInput" value={tacticalCurrentTimeDisplay} onChange={(e) => setTacticalCurrentTimeDisplay(e.target.value)} onBlur={handleTacticalCurrentTimeBlur} placeholder="00:00:00" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target time (HH:MM:SS)
          <input type="text" className="goalCategoryDetailsInput" value={tacticalTargetTimeDisplay} onChange={(e) => setTacticalTargetTimeDisplay(e.target.value)} onBlur={handleTacticalTargetTimeBlur} placeholder="00:00:00" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Skill") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel goalCategoryDetailsLabelFull">
          Skill type
          <input type="text" className="goalCategoryDetailsInput" value={details.skillType ?? ""} onChange={(e) => update({ ...details, skillType: e.target.value || undefined })} placeholder="e.g. Pistol squat" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current proficiency (1–10)
          <input type="number" min={1} max={10} step={0.5} className="goalCategoryDetailsInput" value={details.currentProficiency ?? ""} onChange={(e) => update({ ...details, currentProficiency: e.target.value ? Number(e.target.value) : undefined })} placeholder="1–10" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target proficiency (1–10)
          <input type="number" min={1} max={10} step={0.5} className="goalCategoryDetailsInput" value={details.targetProficiency ?? ""} onChange={(e) => update({ ...details, targetProficiency: e.target.value ? Number(e.target.value) : undefined })} placeholder="1–10" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabelFull { grid-column: 1 / -1; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Custom") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel goalCategoryDetailsLabelFull">
          KPI name
          <input type="text" className="goalCategoryDetailsInput" value={details.customKpiName ?? ""} onChange={(e) => update({ ...details, customKpiName: e.target.value || undefined })} placeholder="e.g. Custom metric" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current value
          <input type="number" className="goalCategoryDetailsInput" value={details.currentValue ?? ""} onChange={(e) => update({ ...details, currentValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 50" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target value
          <input type="number" className="goalCategoryDetailsInput" value={details.targetValue ?? ""} onChange={(e) => update({ ...details, targetValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 70" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabelFull { grid-column: 1 / -1; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  return null;
}
