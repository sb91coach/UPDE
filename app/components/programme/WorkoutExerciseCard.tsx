"use client";

import { useState } from "react";
import SetTracker from "./SetTracker";
import RestTimer from "./RestTimer";
import type { ExerciseData } from "./ExerciseCard";

export type WorkoutExerciseCardProps = {
  exercise: ExerciseData;
  index: number;
  exerciseKey: string;
  sessionDate?: string;
  unit?: "kg" | "lb";
  showRpe?: boolean;
  onSetCompleted?: () => void;
  onPlayDemo?: (exerciseName: string, demoUrl?: string) => void;
  defaultExpanded?: boolean;
};

export default function WorkoutExerciseCard({
  exercise,
  index: _index,
  exerciseKey,
  sessionDate,
  unit = "kg",
  showRpe = false,
  onSetCompleted,
  onPlayDemo,
  defaultExpanded = true,
}: WorkoutExerciseCardProps) {
  const { name, sets, reps, load, rest, notes, demoUrl } = exercise;
  void _index;
  const setCount = sets ?? 0;
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const prescription =
    sets != null && reps != null
      ? load != null && load !== ""
        ? `${sets} × ${reps} @ ${load}`
        : `${sets} × ${reps}`
      : null;

  const handleCompletedChange = (completed: number) => {
    setCompletedCount(completed);
    if (completed > 0) {
      setShowRestTimer(true);
      onSetCompleted?.();
    }
  };

  return (
    <div className="polish-card overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="w-full flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 min-w-0 text-left flex items-center justify-between gap-3 active:opacity-90"
          aria-expanded={expanded}
        >
          <div className="min-w-0">
            <h3 className="truncate" style={{ fontSize: 15, fontWeight: 600, color: "rgba(238,240,244,0.92)" }}>
              {name}
            </h3>
            {prescription && (
              <p className="truncate mt-0.5" style={{ fontSize: 13, color: "rgba(238,240,244,0.6)" }}>
                {prescription}
              </p>
            )}
          </div>
          <span className="flex-shrink-0 text-gray-400 text-lg" aria-hidden>
            {expanded ? "▼" : "▶"}
          </span>
        </button>
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(name + " technique 30 seconds")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center"
          style={{ fontSize: 14, color: "rgba(238,240,244,0.35)" }}
          aria-label={`YouTube: ${name} technique`}
          onClick={(e) => e.stopPropagation()}
        >
          ▶
        </a>
      </div>

      {expanded && (
        <div className="space-y-3" style={{ padding: "0 16px 16px", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          {/* Video/demo link */}
          <div style={{ fontSize: 12 }}>
            <button
              type="button"
              onClick={() => onPlayDemo?.(name, demoUrl)}
              aria-label={`Video demo for ${name}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: 0,
                background: "transparent",
                border: "none",
                color: "rgba(0,201,160,0.8)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span aria-hidden>▶</span>
              <span>{demoUrl ? "Watch demo" : "Video demo"}</span>
            </button>
          </div>

          {prescription && (
            <p style={{ fontSize: 13, color: "rgba(238,240,244,0.6)", margin: 0 }}>Prescription: {prescription}</p>
          )}
          {load != null && load !== "" && (
            <p style={{ fontSize: 13, color: "rgba(238,240,244,0.6)", margin: 0 }}>Load: {load}</p>
          )}
          {notes != null && notes !== "" && (
            <div className="pl-3 border-l-2 border-blue-200 py-1">
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, color: "rgba(238,240,244,0.35)" }}>
                Coaching notes
              </p>
              <p style={{ fontSize: 13, color: "rgba(238,240,244,0.6)", margin: 0 }}>{notes}</p>
            </div>
          )}
          {rest != null && rest !== "" && (
            <p style={{ fontSize: 12, color: "rgba(238,240,244,0.35)", margin: 0 }}>Rest: {rest}</p>
          )}

          {setCount > 0 && (
            <>
              <p style={{ fontSize: 13, color: "rgba(238,240,244,0.35)", margin: 0 }}>Set logging</p>
              <SetTracker
                sets={setCount}
                exerciseKey={exerciseKey}
                sessionDate={sessionDate}
                showRpe={showRpe}
                unit={unit}
                onCompletedChange={handleCompletedChange}
              />
            </>
          )}

          {rest != null && rest !== "" && (
            <div>
              {showRestTimer || completedCount > 0 ? (
                <RestTimer rest={rest} label="Rest" />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRestTimer(true)}
                  style={{
                    width: "100%",
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(238,240,244,0.9)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Rest Timer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
