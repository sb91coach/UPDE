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
  completed: boolean;
  rpe: string;
};

function getStorageKey(sessionDate: string, exerciseKey: string): string {
  return `${STORAGE_PREFIX}-${sessionDate}-${exerciseKey}`;
}

function loadRows(key: string, sets: number): SetRow[] {
  if (typeof window === "undefined") return Array.from({ length: sets }, () => ({ weight: "", completed: false, rpe: "" }));
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return Array.from({ length: sets }, () => ({ weight: "", completed: false, rpe: "" }));
    const parsed = JSON.parse(raw) as SetRow[];
    const need = Math.max(0, sets);
    return Array.from({ length: need }, (_, i) => ({
      weight: parsed[i]?.weight ?? "",
      completed: parsed[i]?.completed ?? false,
      rpe: parsed[i]?.rpe ?? "",
    }));
  } catch {
    return Array.from({ length: sets }, () => ({ weight: "", completed: false, rpe: "" }));
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
    storageKey ? loadRows(storageKey, Math.max(0, sets)) : Array.from({ length: Math.max(0, sets) }, () => ({ weight: "", completed: false, rpe: "" }))
  );

  useEffect(() => {
    const next = Math.max(0, sets);
    setRows((prev) => {
      if (prev.length === next) return prev;
      if (next > prev.length) {
        return [...prev, ...Array.from({ length: next - prev.length }, () => ({ weight: "", completed: false, rpe: "" }))];
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
      style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {rows.map((row, i) => (
          <div
            key={exerciseKey ? `${exerciseKey}-${i}` : i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              minHeight: 48,
              background: row.completed ? "rgba(39,224,166,0.12)" : "rgba(255,255,255,0.06)",
              border: row.completed ? "1px solid rgba(39,224,166,0.3)" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              flex: "1 1 140px",
              maxWidth: 220,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, minWidth: 36 }}>Set {i + 1}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder={unit}
              value={row.weight}
              onChange={(e) => setWeight(i, e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "8px 10px",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
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
                  width: 40,
                  padding: "8px 6px",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  textAlign: "center",
                }}
                aria-label={`Set ${i + 1} RPE`}
              />
            )}
            <button
              type="button"
              onClick={() => setCompleted(i, !row.completed)}
              aria-label={row.completed ? `Set ${i + 1} completed` : `Mark set ${i + 1} complete`}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)",
                background: row.completed ? "rgba(39,224,166,0.5)" : "transparent",
                color: row.completed ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: 16,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {row.completed ? "✓" : "○"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
