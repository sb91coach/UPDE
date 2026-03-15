"use client";

import { useState } from "react";
import WorkoutExerciseCard from "./WorkoutExerciseCard";
import SessionHeader from "./SessionHeader";
import type { ExerciseData } from "./ExerciseCard";
import RestTimer from "./RestTimer";

export type WorkoutSessionViewProps = {
  exercises: ExerciseData[];
  sessionTitle?: string;
  /** e.g. "55 min" */
  sessionDuration?: string;
  /** e.g. "Force production" */
  sessionFocus?: string;
  sessionDate?: string;
  unit?: "kg" | "lb";
  showRpe?: boolean;
  onFinishWorkout?: () => void;
  /** Called when user enters or leaves workout mode (e.g. to hide app bottom nav). */
  onWorkoutModeChange?: (active: boolean) => void;
  /** Optional: when user taps video demo on an exercise card. */
  onPlayDemo?: (exerciseName: string, demoUrl?: string) => void;
};

const defaultRest = "2:00";

export default function WorkoutSessionView({
  exercises,
  sessionTitle,
  sessionDuration,
  sessionFocus,
  sessionDate,
  unit = "kg",
  showRpe = false,
  onFinishWorkout,
  onWorkoutModeChange,
  onPlayDemo,
}: WorkoutSessionViewProps) {
  const [workoutMode, setWorkoutMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [globalRestVisible, setGlobalRestVisible] = useState(false);

  const setWorkoutModeState = (next: boolean) => {
    setWorkoutMode(next);
    onWorkoutModeChange?.(next);
  };

  const count = exercises.length;
  const current = exercises[currentIndex];
  const sessionRest = current?.rest ?? defaultRest;

  if (exercises.length === 0) {
    return (
      <div className="mobile-polish p-6 text-center text-gray-600">
        <p>No exercises in this session. Select a day below to view the programme.</p>
      </div>
    );
  }

  return (
    <div className="mobile-polish workoutSessionView pb-32 md:pb-8 flex flex-col space-y-6">
      {!workoutMode ? (
        <>
          <SessionHeader
            title={sessionTitle ?? "Session"}
            duration={sessionDuration}
            focus={sessionFocus}
            onStartWorkout={() => setWorkoutModeState(true)}
            startWorkoutLabel="Start Workout"
          />
          <div className="flex flex-col space-y-4">
            {exercises.map((ex, i) => (
              <WorkoutExerciseCard
                key={`${ex.name}-${i}`}
                exercise={ex}
                index={i}
                exerciseKey={`workout-${i}-${ex.name}`}
                sessionDate={sessionDate}
                unit={unit}
                showRpe={showRpe}
                defaultExpanded={false}
                onPlayDemo={onPlayDemo}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">
              Exercise {currentIndex + 1} of {count}
            </p>
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={count} aria-label={`Exercise ${currentIndex + 1} of ${count}`}>
              <div className="h-full bg-blue-600 transition-[width] duration-200" style={{ width: `${((currentIndex + 1) / count) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium disabled:opacity-40"
                disabled={currentIndex === 0}
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(count - 1, i + 1))}
                className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium disabled:opacity-40"
                disabled={currentIndex === count - 1}
              >
                Next →
              </button>
            </div>
          </div>

          <WorkoutExerciseCard
            exercise={current}
            index={currentIndex}
            exerciseKey={`workout-mode-${currentIndex}-${current.name}`}
            sessionDate={sessionDate}
            unit={unit}
            showRpe={showRpe}
            defaultExpanded={true}
            onPlayDemo={onPlayDemo}
          />

          {/* Sticky footer - large touch targets */}
          <div
            className="fixed bottom-0 left-0 right-0 z-[9000] flex items-center justify-around gap-2 p-4 pt-3 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] safe-area-pb"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.min(count - 1, i + 1))}
              disabled={currentIndex === count - 1}
              className="flex-1 h-12 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors"
            >
              Next Exercise
            </button>
            <div className="min-w-[100px] flex justify-center">
              {globalRestVisible ? (
                <RestTimer rest={sessionRest} label="Rest" />
              ) : (
                <button
                  type="button"
                  onClick={() => setGlobalRestVisible(true)}
                  className="h-10 px-4 rounded-lg font-medium border border-gray-200 bg-white text-gray-700"
                >
                  Rest Timer
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setWorkoutModeState(false); onFinishWorkout?.(); }}
              className="flex-1 h-12 rounded-xl font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Finish Workout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
