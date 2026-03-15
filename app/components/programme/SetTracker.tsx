"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "session";

/**
 * SetTracker — high-performance set execution as interactive pills.
 * Each pill: [ Set N ] weight ✓/○. Autosaves to localStorage.
 */

export type SetTrackerProps = {
  sets: number;
  onCompletedChange?: (completed: number, total: number) => void;
  exerciseKey?: string;
  sessionDate?: string;
  showRpe?: boolean;
  unit?: string;
};

type SetRow = {
  weight: string;
  reps: string;
  completed: boolean;
  rpe: string;
};

function getStorageKey(sessionDate: string, exerciseKey: string): string {
  return `${STORAGE_PREFIX}-${sessionDate}-${exerciseKey}`;
}

function loadRows(key: string, sets: number): SetRow[] {
  if (typeof window === "undefined") return Array.from({ length: sets }, () => ({ weight: "", reps: "", completed: false, rpe: "" }));
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return Array.from({ length: sets }, () => ({ weight: "", reps: "", completed: false, rpe: "" }));
    const parsed = JSON.parse(raw) as (SetRow & { reps?: string })[];
    const need = Math.max(0, sets);
    return Array.from({ length: need }, (_, i) => ({
      weight: parsed[i]?.weight ?? "",
      reps: parsed[i]?.reps ?? "",
      completed: parsed[i]?.completed ?? false,
      rpe: parsed[i]?.rpe ?? "",
    }));
  } catch {
    return Array.from({ length: sets }, () => ({ weight: "", reps: "", completed: false, rpe: "" }));
  }
}

export default function SetTracker({
  sets,
  onCompletedChange,
  exerciseKey,
  sessionDate,
  showRpe = false,
  unit = "kg",
}: SetTrackerProps) {
  const dateStr = sessionDate ?? (typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : "");
  const storageKey = exerciseKey && dateStr ? getStorageKey(dateStr, exerciseKey) : "";

  const [rows, setRows] = useState<SetRow[]>(() =>
    storageKey ? loadRows(storageKey, Math.max(0, sets)) : Array.from({ length: Math.max(0, sets) }, () => ({ weight: "", reps: "", completed: false, rpe: "" }))
  );

  useEffect(() => {
    const next = Math.max(0, sets);
    setRows((prev) => {
      if (prev.length === next) return prev;
      if (next > prev.length) {
        return [...prev, ...Array.from({ length: next - prev.length }, () => ({ weight: "", reps: "", completed: false, rpe: "" }))];
      }
      return prev.slice(0, next);
    });
  }, [sets]);

  useEffect(() => {
    if (!storageKey || rows.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows));
    } catch {
      // ignore
    }
  }, [storageKey, rows]);

  const completed = rows.filter((r) => r.completed).length;
  const total = rows.length;

  useEffect(() => {
    onCompletedChange?.(completed, total);
  }, [completed, total, onCompletedChange]);

  const setWeight = useCallback((index: number, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], weight: value };
      return next;
    });
  }, []);

  const setCompleted = useCallback((index: number, value: boolean) => {
    setRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], completed: value };
      return next;
    });
  }, []);

  const setReps = useCallback((index: number, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], reps: value };
      return next;
    });
  }, []);

  const setRpe = useCallback((index: number, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], rpe: value };
      return next;
    });
  }, []);

  if (total === 0) return null;

  return (
    <div className="setTrackerRoot mt-4 pt-4 border-t border-gray-100 space-y-3">
      {rows.map((row, i) => (
        <div
          key={exerciseKey ? `${exerciseKey}-${i}` : i}
          className={`flex flex-wrap items-center gap-2 rounded-lg w-full p-3 ${
            row.completed ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-100"
          }`}
        >
          <span className="text-sm font-semibold text-gray-700 min-w-[48px]">Set {i + 1}</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Reps"
            value={row.reps}
            onChange={(e) => setReps(i, e.target.value)}
            className="w-16 h-10 px-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-base text-center"
            aria-label={`Set ${i + 1} reps`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder={unit}
            value={row.weight}
            onChange={(e) => setWeight(i, e.target.value)}
            className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-gray-200 bg-white text-gray-900 text-base text-center"
            aria-label={`Set ${i + 1} weight`}
          />
          {showRpe && (
            <input
              type="text"
              inputMode="decimal"
              placeholder="RPE"
              value={row.rpe}
              onChange={(e) => setRpe(i, e.target.value)}
              className="w-14 h-10 px-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm text-center"
              aria-label={`Set ${i + 1} RPE`}
            />
          )}
          <button
            type="button"
            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 cursor-pointer transition-colors border-gray-300 bg-white text-gray-400 hover:border-emerald-400 hover:text-emerald-600"
            style={row.completed ? { background: "#10b981", borderColor: "#10b981", color: "#fff" } : undefined}
            onClick={() => setCompleted(i, !row.completed)}
            aria-label={row.completed ? `Set ${i + 1} completed` : `Mark set ${i + 1} complete`}
          >
            {row.completed ? "✓" : "○"}
          </button>
        </div>
      ))}
    </div>
  );
}
