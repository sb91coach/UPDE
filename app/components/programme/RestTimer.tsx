"use client";

import { useState, useEffect, useRef } from "react";

/**
 * RestTimer — compact rest card. Countdown when started.
 */

export type RestTimerProps = {
  rest: string;
  label?: string;
};

function parseRestToSeconds(rest: string): number {
  if (!rest || typeof rest !== "string") return 0;
  const trimmed = rest.trim();
  const colon = trimmed.indexOf(":");
  if (colon !== -1) {
    const min = parseInt(trimmed.slice(0, colon), 10) || 0;
    const sec = parseInt(trimmed.slice(colon + 1), 10) || 0;
    return min * 60 + sec;
  }
  const num = parseInt(trimmed.replace(/\D/g, ""), 10);
  return Number.isNaN(num) ? 0 : num;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RestTimer({ rest, label = "Rest" }: RestTimerProps) {
  const totalSeconds = parseRestToSeconds(rest);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, totalSeconds]);

  const start = () => {
    setRemaining(totalSeconds > 0 ? totalSeconds : 60);
    setRunning(true);
  };

  const displaySeconds = totalSeconds > 0 ? totalSeconds : 60;

  return (
    <div
      className={`restTimerRoot ${running ? "restTimerFloating" : ""}`}
      style={{
        marginTop: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "16px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(238,240,244,0.35)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#00c9a0",
          fontSize: 36,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 10,
        }}
      >
        {running ? formatTime(remaining) : formatTime(displaySeconds)}
      </div>
      <button
        type="button"
        onClick={start}
        disabled={running}
        style={{
          minHeight: 44,
          minWidth: 120,
          padding: "10px 18px",
          fontSize: 13,
          fontWeight: 600,
          background: running ? "rgba(255,255,255,0.08)" : "rgba(47,128,237,0.4)",
          border: "1px solid rgba(47,128,237,0.5)",
          borderRadius: 10,
          color: "#fff",
          cursor: running ? "default" : "pointer",
        }}
      >
        {running ? "Resting…" : "Start Rest"}
      </button>
    </div>
  );
}
