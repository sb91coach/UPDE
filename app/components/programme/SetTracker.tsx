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
    <div
      className="setTrackerRoot"
      style={{
        marginTop: 16,
        paddingTop: 12,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {rows.map((row, i) => (
        <div
          key={exerciseKey ? `${exerciseKey}-${i}` : i}
          style={{
            display: "grid",
            gridTemplateColumns: showRpe ? "44px 1fr 1fr 1fr 36px" : "44px 1fr 1fr 36px",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: "rgba(238,240,244,0.4)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Set {i + 1}
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Reps"
            value={row.reps}
            onChange={(e) => setReps(i, e.target.value)}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              color: "rgba(238,240,244,0.9)",
              padding: "10px 12px",
              fontSize: 14,
              width: "100%",
              textAlign: "center",
              outline: "none",
            }}
            aria-label={`Set ${i + 1} reps`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder={unit}
            value={row.weight}
            onChange={(e) => setWeight(i, e.target.value)}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              color: "rgba(238,240,244,0.9)",
              padding: "10px 12px",
              fontSize: 14,
              width: "100%",
              textAlign: "center",
              outline: "none",
            }}
            aria-label={`Set ${i + 1} weight`}
          />
          {showRpe && (
            <input
              type="text"
              inputMode="decimal"
              placeholder="RPE"
              value={row.rpe}
              onChange={(e) => setRpe(i, e.target.value)}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "rgba(238,240,244,0.9)",
                padding: "10px 12px",
                fontSize: 14,
                width: "100%",
                textAlign: "center",
                outline: "none",
              }}
              aria-label={`Set ${i + 1} RPE`}
            />
          )}
          <input
            type="checkbox"
            checked={row.completed}
            onChange={() => setCompleted(i, !row.completed)}
            aria-label={row.completed ? `Set ${i + 1} completed` : `Mark set ${i + 1} complete`}
            style={{
              accentColor: "#00c9a0",
              width: 18,
              height: 18,
            }}
          />
        </div>
      ))}
    </div>
  );
}
