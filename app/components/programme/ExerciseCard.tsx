"use client";

import { useState, useEffect } from "react";
import SetTracker from "./SetTracker";
import RestTimer from "./RestTimer";

/**
 * ExerciseCard — high-performance execution card.
 * Prescription line, rest, tempo, coach notes, demo (modal), set pills, rest timer.
 */

export type ExerciseData = {
  name: string;
  sets?: number;
  reps?: number | string;
  load?: string;
  rest?: string;
  tempo?: string;
  notes?: string;
  demoUrl?: string;
};

export type ExerciseCardProps = {
  exercise: ExerciseData;
  index?: number;
  onCompletedChange?: (completed: number, total: number) => void;
  exerciseKey?: string;
  unit?: "kg" | "lb";
  sessionDate?: string;
  showRpe?: boolean;
};

function toEmbedUrl(url: string): string {
  const u = url.trim();
  const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  return u;
}

export default function ExerciseCard({
  exercise,
  index = 0,
  onCompletedChange,
  exerciseKey,
  unit = "kg",
  sessionDate,
  showRpe = false,
}: ExerciseCardProps) {
  const { name, sets, reps, load, rest, tempo, notes, demoUrl } = exercise;
  const setCount = sets ?? 0;
  const key = exerciseKey ?? `${name}-${index}`;
  const [demoOpen, setDemoOpen] = useState(false);

  const prescription =
    sets != null && reps != null
      ? load != null && load !== ""
        ? `${sets} × ${reps} @ ${load}`
        : `${sets} × ${reps}`
      : null;

  useEffect(() => {
    if (!demoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDemoOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [demoOpen]);

  const isYoutube = demoUrl?.includes("youtube") || demoUrl?.includes("youtu.be");

  const detailParts = [
    prescription,
    rest != null && rest !== "" ? `Rest ${rest}` : null,
    tempo != null && tempo !== "" ? `Tempo ${tempo}` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <div
        className="exerciseCardRoot p-4 sm:p-5 rounded-xl mb-3 min-w-0"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="exerciseCardName"
          style={{
            fontSize: "clamp(14px, 4vw, 16px)",
            fontWeight: 700,
            marginBottom: 4,
            opacity: 0.98,
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
          }}
        >
          {name}
        </div>

        {detailParts.length > 0 && (
          <div
            className="exerciseCardDetail"
            style={{
              fontSize: 14,
              fontWeight: 500,
              opacity: 0.75,
              marginBottom: notes ? 10 : 8,
              lineHeight: 1.4,
            }}
          >
            {detailParts.join(" · ")}
          </div>
        )}

        {notes != null && notes !== "" && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              paddingLeft: 12,
              borderLeft: "3px solid rgba(47,128,237,0.5)",
              background: "rgba(0,0,0,0.15)",
              borderRadius: 0,
              fontSize: 12,
              lineHeight: 1.5,
              opacity: 0.9,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: "0.06em", opacity: 0.75, marginBottom: 4 }}>Coach Note</div>
            <span style={{ fontSize: 14 }}>{notes}</span>
          </div>
        )}

        {demoUrl != null && demoUrl !== "" && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                minHeight: 44,
                minWidth: 44,
                fontSize: 14,
                fontWeight: 600,
                background: "rgba(47,128,237,0.25)",
                border: "1px solid rgba(47,128,237,0.45)",
                borderRadius: 10,
                color: "#93c5fd",
                cursor: "pointer",
              }}
            >
              Watch Demo
            </button>
          </div>
        )}

        {setCount > 0 && (
          <SetTracker
            sets={setCount}
            exerciseKey={key}
            sessionDate={sessionDate}
            showRpe={showRpe}
            unit={unit}
            onCompletedChange={onCompletedChange}
          />
        )}

        {rest != null && rest !== "" && <RestTimer rest={rest} label="Rest" />}
      </div>

      {demoOpen && demoUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Exercise demo video"
          onClick={() => setDemoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0a0a0f",
              borderRadius: 16,
              overflow: "hidden",
              maxWidth: 640,
              width: "100%",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{name} — Demo</span>
              <button
                type="button"
                onClick={() => setDemoOpen(false)}
                aria-label="Close"
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: 24,
                  cursor: "pointer",
                  opacity: 0.8,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
              {isYoutube ? (
                <iframe
                  src={toEmbedUrl(demoUrl)}
                  title={`${name} demo`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={demoUrl}
                  controls
                  autoPlay
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
