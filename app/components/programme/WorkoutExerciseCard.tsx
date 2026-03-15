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
    <div className="polish-card overflow-hidden rounded-xl">
      <div className="w-full flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 min-w-0 text-left flex items-center justify-between gap-3 active:opacity-90"
          aria-expanded={expanded}
        >
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{name}</h3>
            {prescription && (
              <p className="text-sm text-gray-600 truncate mt-0.5">{prescription}</p>
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
          className="flex-shrink-0 flex items-center text-gray-400 hover:text-gray-600"
          style={{ fontSize: 14 }}
          aria-label={`YouTube: ${name} technique`}
          onClick={(e) => e.stopPropagation()}
        >
          ▶
        </a>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
          {/* Video/demo placeholder */}
          <div>
            <button
              type="button"
              onClick={() => onPlayDemo?.(name, demoUrl)}
              className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center gap-2 text-gray-600 font-medium text-sm"
              aria-label={`Video demo for ${name}`}
            >
              <span className="text-lg" aria-hidden>▶</span>
              <span>{demoUrl ? "Watch demo" : "Video demo"}</span>
            </button>
          </div>

          {prescription && (
            <p className="text-sm text-gray-600">Prescription: {prescription}</p>
          )}
          {load != null && load !== "" && (
            <p className="text-sm text-gray-600">Load: {load}</p>
          )}
          {notes != null && notes !== "" && (
            <div className="pl-3 border-l-2 border-blue-200 py-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Coaching notes</p>
              <p className="text-sm text-gray-700">{notes}</p>
            </div>
          )}
          {rest != null && rest !== "" && (
            <p className="text-xs text-gray-500">Rest: {rest}</p>
          )}

          {setCount > 0 && (
            <>
              <p className="text-sm text-gray-500">Set logging</p>
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
                  className="w-full h-10 rounded-lg font-medium border border-gray-200 bg-gray-50 text-gray-700"
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
