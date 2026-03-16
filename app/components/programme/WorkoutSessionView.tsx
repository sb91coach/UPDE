"use client";

import { useState } from "react";
import WorkoutExerciseCard from "./WorkoutExerciseCard";
import SessionHeader from "./SessionHeader";
import type { ExerciseData } from "./ExerciseCard";
import RestTimer from "./RestTimer";
import { SoftPaywall } from "@/app/components/SoftPaywall";

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
  /** When false, Start Workout is gated behind soft paywall */
  isPro?: boolean;
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
  isPro = true,
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
      <div
        className=""
        style={{
          background: "#0a0c12",
          minHeight: "100vh",
          padding: "0 16px 120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(238,240,244,0.6)",
          textAlign: "center",
        }}
      >
        <p>No exercises in this session. Select a day below to view the programme.</p>
      </div>
    );
  }

  return (
    <div
      className=""
      style={{
        background: "#0a0c12",
        minHeight: "100vh",
        padding: "0 16px 120px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {!workoutMode ? (
        <>
          <SoftPaywall isPro={isPro} feature="Programme Engine">
            <SessionHeader
              title={sessionTitle ?? "Session"}
              duration={sessionDuration}
              focus={sessionFocus}
              onStartWorkout={isPro ? () => setWorkoutModeState(true) : undefined}
              startWorkoutLabel="Start Workout"
            />
          </SoftPaywall>
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
            <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(238,240,244,0.9)", margin: 0 }}>
              Exercise {currentIndex + 1} of {count}
            </p>
            <div
              className="w-full overflow-hidden"
              style={{
                height: 6,
                borderRadius: 9999,
                background: "rgba(255,255,255,0.06)",
              }}
              role="progressbar"
              aria-valuenow={currentIndex + 1}
              aria-valuemin={1}
              aria-valuemax={count}
              aria-label={`Exercise ${currentIndex + 1} of ${count}`}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 9999,
                  background: "linear-gradient(90deg,#0A84FF,#00c9a0)",
                  width: `${((currentIndex + 1) / count) * 100}%`,
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(238,240,244,0.9)",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: currentIndex === 0 ? "default" : "pointer",
                  opacity: currentIndex === 0 ? 0.4 : 1,
                }}
                disabled={currentIndex === 0}
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(count - 1, i + 1))}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(238,240,244,0.9)",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: currentIndex === count - 1 ? "default" : "pointer",
                  opacity: currentIndex === count - 1 ? 0.4 : 1,
                }}
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
            className=""
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9000,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              gap: 8,
              padding: "12px 16px",
              paddingTop: 12,
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              background: "rgba(10,12,18,0.98)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.6)",
            }}
          >
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.min(count - 1, i + 1))}
              disabled={currentIndex === count - 1}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
                border: "none",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 15,
                opacity: currentIndex === count - 1 ? 0.4 : 1,
                cursor: currentIndex === count - 1 ? "default" : "pointer",
              }}
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
                  style={{
                    height: 40,
                    padding: "0 16px",
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
            <button
              type="button"
              onClick={() => { setWorkoutModeState(false); onFinishWorkout?.(); }}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                background: "#00c9a0",
                border: "none",
                color: "#0b1120",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Finish Workout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
