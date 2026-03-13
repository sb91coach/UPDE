"use client";

import { useState, useCallback } from "react";
import { generateGoalRoadmap } from "@/lib/goalEngine";
import type { GoalRoadmapResult, CurrentBenchmarks } from "@/lib/goalEngine";
import GoalCategoryDetails from "@/app/components/GoalCategoryDetails";
import type { GoalDetails } from "@/app/components/GoalCategoryDetails";

const CATEGORIES = [
  "Performance",
  "Body Composition",
  "Strength",
  "Endurance",
  "Marathon",
  "Skill",
  "Tactical",
  "Custom",
];

const PRIORITIES = ["Low", "Moderate", "High"];

export type GoalInputCardProps = {
  onGenerate: (result: GoalRoadmapResult) => void;
  currentBenchmarks?: CurrentBenchmarks | null;
  className?: string;
};

function defaultDeadline(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

export default function GoalInputCard({
  onGenerate,
  currentBenchmarks,
  className = "",
}: GoalInputCardProps) {
  const [goalTitle, setGoalTitle] = useState("");
  const [category, setCategory] = useState("Performance");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [priority, setPriority] = useState("Moderate");
  const [constraints, setConstraints] = useState("");
  const [squatKg, setSquatKg] = useState("");
  const [benchKg, setBenchKg] = useState("");
  const [deadliftKg, setDeadliftKg] = useState("");
  const [overheadKg, setOverheadKg] = useState("");
  const [targetTimeSec, setTargetTimeSec] = useState("");
  const [targetTimeLabel, setTargetTimeLabel] = useState("");
  const [categoryDetails, setCategoryDetails] = useState<GoalDetails>({});

  const targetAchievements = {
    squat_kg: squatKg ? Number(squatKg) : undefined,
    bench_kg: benchKg ? Number(benchKg) : undefined,
    deadlift_kg: deadliftKg ? Number(deadliftKg) : undefined,
    overhead_press_kg: overheadKg ? Number(overheadKg) : undefined,
    target_time_sec: targetTimeSec ? Number(targetTimeSec) : (categoryDetails.targetTime ?? undefined),
    target_time_label: targetTimeLabel || undefined,
  };
  const hasTargets = [squatKg, benchKg, deadliftKg, overheadKg, targetTimeSec].some((s) => s !== "" && Number(s) > 0);
  const hasDetails = Object.keys(categoryDetails).length > 0 && (categoryDetails.targetValue != null || categoryDetails.targetTime != null || categoryDetails.target1RM != null || categoryDetails.distance != null);

  const handleCategoryDetailsUpdate = useCallback((details: GoalDetails) => {
    setCategoryDetails(details);
  }, []);

  const handleGenerate = () => {
    const goalDetailsMerged: GoalDetails = { ...categoryDetails };
    if (targetAchievements.target_time_sec != null) goalDetailsMerged.targetTime = targetAchievements.target_time_sec;
    if (currentBenchmarks?.two_mile_time_sec != null && categoryDetails.currentTime == null) goalDetailsMerged.currentTime = currentBenchmarks.two_mile_time_sec;
    const result = generateGoalRoadmap({
      goalTitle: goalTitle || "My goal",
      category,
      deadline,
      priority,
      constraints: constraints || undefined,
      targetAchievements: hasTargets ? targetAchievements : undefined,
      currentBenchmarks: currentBenchmarks ?? undefined,
      eventDistance: categoryDetails.distance ?? undefined,
      goalDetails: hasDetails || hasTargets ? goalDetailsMerged : undefined,
    });
    onGenerate(result);
  };

  return (
    <div className={`goalInputCard ${className}`}>
      <h3 className="goalInputCardTitle">Goal input</h3>
      <p className="goalInputCardSub">Define your goal and deadline to generate a roadmap.</p>
      <div className="goalInputCardForm">
        <label className="goalInputCardLabel">
          Goal title
          <input
            type="text"
            className="goalInputCardInput"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="e.g. Peak for competition"
          />
        </label>
        <label className="goalInputCardLabel">
          Category
          <select
            className="goalInputCardSelect"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className={`goalInputCardCategorySection ${category ? "goalInputCardCategorySection--visible" : ""}`}>
          <GoalCategoryDetails
            category={category}
            onUpdate={handleCategoryDetailsUpdate}
            currentBenchmarks={currentBenchmarks ?? undefined}
          />
        </div>
        <label className="goalInputCardLabel">
          Deadline
          <input
            type="date"
            className="goalInputCardInput"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
        <label className="goalInputCardLabel">
          Priority
          <select
            className="goalInputCardSelect"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        {category === "Strength" && (
          <>
            <label className="goalInputCardLabel">
              Target squat (kg)
              <input
                type="number"
                min={0}
                step={2.5}
                className="goalInputCardInput"
                value={squatKg}
                onChange={(e) => setSquatKg(e.target.value)}
                placeholder={currentBenchmarks?.back_squat != null ? `Current: ${currentBenchmarks.back_squat}` : "Target 1RM"}
              />
            </label>
            <label className="goalInputCardLabel">
              Target bench (kg)
              <input
                type="number"
                min={0}
                step={2.5}
                className="goalInputCardInput"
                value={benchKg}
                onChange={(e) => setBenchKg(e.target.value)}
                placeholder={currentBenchmarks?.bench_press != null ? `Current: ${currentBenchmarks.bench_press}` : "Target 1RM"}
              />
            </label>
            <label className="goalInputCardLabel">
              Target deadlift (kg)
              <input
                type="number"
                min={0}
                step={2.5}
                className="goalInputCardInput"
                value={deadliftKg}
                onChange={(e) => setDeadliftKg(e.target.value)}
                placeholder={currentBenchmarks?.deadlift != null ? `Current: ${currentBenchmarks.deadlift}` : "Target 1RM"}
              />
            </label>
            <label className="goalInputCardLabel">
              Target overhead (kg)
              <input
                type="number"
                min={0}
                step={2.5}
                className="goalInputCardInput"
                value={overheadKg}
                onChange={(e) => setOverheadKg(e.target.value)}
                placeholder={currentBenchmarks?.overhead_press != null ? `Current: ${currentBenchmarks.overhead_press}` : "Target 1RM"}
              />
            </label>
          </>
        )}
        {(category === "Endurance" || category === "Marathon") && (
          <>
            <label className="goalInputCardLabel">
              Target time (seconds)
              <input
                type="number"
                min={0}
                className="goalInputCardInput"
                value={targetTimeSec}
                onChange={(e) => setTargetTimeSec(e.target.value)}
                placeholder={currentBenchmarks?.two_mile_time_sec != null ? `Current: ${currentBenchmarks.two_mile_time_sec}s` : "e.g. 600"}
              />
            </label>
            <label className="goalInputCardLabel">
              Time label (optional)
              <input
                type="text"
                className="goalInputCardInput"
                value={targetTimeLabel}
                onChange={(e) => setTargetTimeLabel(e.target.value)}
                placeholder="e.g. 2-mile run"
              />
            </label>
          </>
        )}
        <label className="goalInputCardLabel goalInputCardLabelFull">
          Constraints (optional)
          <textarea
            className="goalInputCardTextarea"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="Injury considerations, schedule limits, etc."
            rows={2}
          />
        </label>
      </div>
      <button type="button" className="goalInputCardBtn" onClick={handleGenerate}>
        Generate roadmap
      </button>
      <style jsx>{`
        .goalInputCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .goalInputCard:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .goalInputCardTitle {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .goalInputCardSub {
          font-size: 14px;
          opacity: 0.8;
          margin: 0 0 20px;
          line-height: 1.45;
        }
        .goalInputCardForm {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .goalInputCardLabel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.9;
        }
        .goalInputCardLabelFull {
          grid-column: 1 / -1;
        }
        .goalInputCardCategorySection {
          grid-column: 1 / -1;
          overflow: hidden;
          opacity: 0;
          max-height: 0;
          transition: opacity 0.3s ease, max-height 0.35s ease;
        }
        .goalInputCardCategorySection--visible {
          opacity: 1;
          max-height: 400px;
        }
        .goalInputCardCategorySection--visible > :global(div) {
          margin-bottom: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: inset 0 0 24px rgba(39, 224, 166, 0.04);
          padding: 16px 20px;
        }
        .goalInputCardInput,
        .goalInputCardSelect {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
        }
        .goalInputCardTextarea {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          resize: vertical;
          min-height: 60px;
        }
        .goalInputCardInput:focus,
        .goalInputCardSelect:focus,
        .goalInputCardTextarea:focus {
          outline: none;
          border-color: rgba(47, 128, 237, 0.5);
        }
        .goalInputCardBtn {
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
        .goalInputCardBtn:hover {
          box-shadow: 0 0 20px rgba(47, 128, 237, 0.4), 0 0 36px rgba(39, 224, 166, 0.3);
          transform: scale(1.02);
        }
        @media (max-width: 600px) {
          .goalInputCardForm {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
