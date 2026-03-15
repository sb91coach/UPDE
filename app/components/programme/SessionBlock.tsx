"use client";

import { useState } from "react";
/**
 * SessionBlock — renders a single block within an expanded day (Prep, Main, Accessory, Conditioning, etc.).
 * Renders all exercises as ExerciseCards (name, sets, reps, load, rest, tempo, notes + SetTracker + RestTimer).
 * On mobile, block is collapsible (expandable card).
 */

import ExerciseCard, { type ExerciseData } from "./ExerciseCard";

export type { ExerciseData };

export type SessionBlockType =
  | "performanceNotes"
  | "prep"
  | "main"
  | "accessory"
  | "conditioning"
  | "recovery";

export type SessionBlockData = {
  type: SessionBlockType;
  /** For performanceNotes */
  text?: string;
  /** For prep, main, accessory, conditioning, recovery: strings (legacy) or structured exercises */
  exercises?: (string | ExerciseData)[];
  /** Optional label override */
  label?: string;
};

const BLOCK_LABELS: Record<SessionBlockType, string> = {
  performanceNotes: "Performance Notes",
  prep: "PREP",
  main: "MAIN",
  accessory: "ACCESSORY",
  conditioning: "Conditioning",
  recovery: "Recovery",
};

function isExerciseData(x: string | ExerciseData): x is ExerciseData {
  return typeof x === "object" && x !== null && "name" in x;
}

/**
 * Parse string exercises like "Trap Bar Deadlift 6x2 @ 90%" or "Strict Press 4x5 @ RPE 8"
 * into ExerciseData so we can render ExerciseCard (with SetTracker + RestTimer).
 * If no pattern matches, returns { name: str } for basic card display.
 */
function parseStringToExerciseData(str: string): ExerciseData {
  const trimmed = str.trim();
  if (!trimmed) return { name: trimmed };

  // e.g. "Trap Bar Deadlift 6x2 @ 90%" or "Back Squat 4x4 @ 80%" or "Strict Press 4x5 @ RPE 8"
  const setsRepsLoad = trimmed.match(/^(.+?)\s+(\d+)x(\d+)(?:\s*@\s*(.+))?$/);
  if (setsRepsLoad) {
    const [, name, setsStr, repsStr, load] = setsRepsLoad;
    const nameTrim = (name ?? trimmed).trim();
    const sets = parseInt(setsStr ?? "0", 10);
    const reps = parseInt(repsStr ?? "0", 10);
    return {
      name: nameTrim,
      sets: Number.isNaN(sets) ? undefined : sets,
      reps: Number.isNaN(reps) ? undefined : reps,
      load: load?.trim() ?? undefined,
      rest: "2:00",
    };
  }

  // e.g. "Split Squat 3x8 ea" or "RDL 3x8" (no load)
  const setsRepsOnly = trimmed.match(/^(.+?)\s+(\d+)x(\d+)\s*(.*)$/);
  if (setsRepsOnly) {
    const [, name, setsStr, repsStr, suffix] = setsRepsOnly;
    const nameTrim = (name ?? "").trim();
    const sets = parseInt(setsStr ?? "0", 10);
    const repsVal = (suffix ?? "").trim() ? `${repsStr} ${suffix.trim()}` : repsStr;
    return {
      name: nameTrim,
      sets: Number.isNaN(sets) ? undefined : sets,
      reps: repsVal,
      rest: "2:00",
    };
  }

  return { name: trimmed };
}

/**
 * Normalize each exercise to ExerciseData so we always render ExerciseCard.
 */
function normalizeExercise(item: string | ExerciseData): ExerciseData {
  if (isExerciseData(item)) return item;
  return parseStringToExerciseData(item);
}

/**
 * Count total sets across all blocks (normalizes string exercises for count).
 * Used by DayAccordion for SessionProgress and SessionSummary.
 */
export function getTotalSetsFromBlocks(blocks: SessionBlockData[]): number {
  return blocks.reduce((sum, block) => {
    const ex = block.exercises ?? [];
    return sum + ex.reduce((s, e) => s + (normalizeExercise(e).sets ?? 0), 0);
  }, 0);
}

/**
 * Flatten all exercises from blocks into a single list (for workout execution view).
 */
export function getFlattenedExercisesFromBlocks(blocks: SessionBlockData[]): ExerciseData[] {
  const out: ExerciseData[] = [];
  for (const block of blocks) {
    if (block.type === "performanceNotes") continue;
    const ex = block.exercises ?? [];
    for (const e of ex) out.push(normalizeExercise(e));
  }
  return out;
}

export type SessionBlockProps = {
  block: SessionBlockData;
  index?: number;
  onSetCompletionChange?: (blockIndex: number, exerciseIndex: number, completed: number, total: number) => void;
  /** Session date for SetTracker autosave (YYYY-MM-DD) */
  sessionDate?: string;
  /** Unit for weight display (kg/lb) */
  unit?: "kg" | "lb";
  showRpe?: boolean;
};

export default function SessionBlock({ block, index: blockIndex = 0, onSetCompletionChange, sessionDate, unit = "kg", showRpe = false }: SessionBlockProps) {
  const [mobileOpen, setMobileOpen] = useState(blockIndex === 0);
  const label = block.label ?? BLOCK_LABELS[block.type];

  if (block.type === "performanceNotes") {
    return (
      <div
        style={{
          padding: "14px 16px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            opacity: 0.7,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
          {block.text || "—"}
        </div>
      </div>
    );
  }

  const exercises = block.exercises ?? [];

  if (exercises.length === 0) {
    return (
      <div
        style={{
          padding: "14px 16px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            opacity: 0.85,
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 14, opacity: 0.7 }}>—</div>
      </div>
    );
  }

  const normalizedExercises = exercises.map(normalizeExercise);

  return (
    <div
      className="sessionBlockRoot"
      style={{
        padding: "14px 16px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="sessionBlockToggle md:pointer-events-none md:cursor-default w-full text-left flex items-center justify-between gap-2 min-h-[44px] py-3"
        aria-expanded={mobileOpen}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            opacity: 0.85,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <span
          className="sessionBlockChevron md:hidden text-white/70 text-lg flex items-center justify-center min-w-[44px] min-h-[44px]"
          style={{ margin: "-8px -8px -8px 0" }}
          aria-hidden
        >
          {mobileOpen ? "▼" : "▶"}
        </span>
      </button>
      <div className={`sessionBlockContent flex flex-col gap-0 mt-2 ${mobileOpen ? "block" : "hidden"} md:block`}>
        <div className="flex flex-col gap-0">
          {normalizedExercises.map((exercise, i) => (
            <ExerciseCard
              key={`${exercise.name}-${blockIndex}-${i}`}
              exercise={exercise}
              index={i}
              exerciseKey={`block-${blockIndex}-ex-${i}`}
              sessionDate={sessionDate}
              unit={unit}
              showRpe={showRpe}
              onCompletedChange={
                onSetCompletionChange
                  ? (completed, total) => onSetCompletionChange(blockIndex, i, completed, total)
                  : undefined
              }
            />
        ))}
        </div>
      </div>
    </div>
  );
}
