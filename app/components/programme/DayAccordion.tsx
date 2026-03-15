"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import SessionBlock, { type SessionBlockData, getTotalSetsFromBlocks } from "./SessionBlock";
import SessionProgress from "./SessionProgress";
import SessionOverview from "./SessionOverview";
import SessionSummary from "./SessionSummary";

/**
 * Day type for colour coding: Red = high load, Green = moderate, Recovery = light/off.
 */
export type DayType = "Red" | "Green" | "Recovery" | "Off";

export type ProgrammeDayData = {
  day: string;
  type: DayType;
  title: string;
  duration: number;
  performanceNotes?: string;
  blocks: SessionBlockData[];
};

export type DayAccordionProps = {
  day: ProgrammeDayData;
  dayId: string;
  expanded: boolean;
  onToggle: () => void;
  /** Session date for autosave (YYYY-MM-DD), default today */
  sessionDate?: string;
  unit?: "kg" | "lb";
  showRpe?: boolean;
  /** When provided, shows a full-width "Begin Session" CTA at bottom of expanded state (mobile-friendly) */
  onBeginSession?: (dayId: string) => void;
};

const DAY_INDICATOR: Record<DayType, { char: string; color: string }> = {
  Red: { char: "🔴", color: "rgba(239,68,68,0.9)" },
  Green: { char: "🟢", color: "rgba(39,224,166,0.9)" },
  Recovery: { char: "⚪", color: "rgba(255,255,255,0.6)" },
  Off: { char: "⚫", color: "rgba(255,255,255,0.4)" },
};

export default function DayAccordion({
  day,
  dayId,
  expanded,
  onToggle,
  sessionDate: propsSessionDate,
  unit = "kg",
  showRpe = false,
  onBeginSession,
}: DayAccordionProps) {
  const indicator = DAY_INDICATOR[day.type] ?? DAY_INDICATOR.Recovery;
  const sessionDate = propsSessionDate ?? (typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : "");

  const totalSets = useMemo(() => getTotalSetsFromBlocks(day.blocks), [day.blocks]);
  const [completedByKey, setCompletedByKey] = useState<Record<string, number>>({});
  const completedSets = useMemo(
    () => Object.values(completedByKey).reduce((a, b) => a + b, 0),
    [completedByKey]
  );
  const [completionTime, setCompletionTime] = useState<string | null>(null);
  const completionRecordedRef = useRef(false);

  useEffect(() => {
    if (totalSets > 0 && completedSets >= totalSets) {
      if (!completionRecordedRef.current) {
        completionRecordedRef.current = true;
        setCompletionTime(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
      }
    } else {
      completionRecordedRef.current = false;
    }
  }, [totalSets, completedSets]);

  const handleSetCompletionChange = (
    blockIndex: number,
    exerciseIndex: number,
    completed: number
  ) => {
    setCompletedByKey((prev) => ({
      ...prev,
      [`${blockIndex}-${exerciseIndex}`]: completed,
    }));
  };

  const allComplete = totalSets > 0 && completedSets >= totalSets;

  return (
    <div
      className="dayAccordionRoot"
      style={{
        marginBottom: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`day-content-${dayId}`}
        id={`day-header-${dayId}`}
        className="dayAccordionHeader"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          minHeight: 56,
          background: "none",
          border: "none",
          color: "inherit",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 0", minWidth: 0 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }} aria-hidden>
            {indicator.char}
          </span>
          <span style={{ minWidth: 0 }}>
            {day.day} – {day.type} Day
            {day.duration > 0 && (
              <span style={{ opacity: 0.75, fontWeight: 400 }}> ({day.duration} min)</span>
            )}
          </span>
        </span>
        <span
          className="dayAccordionChevron"
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 44,
            minHeight: 44,
            margin: -8,
            fontSize: 12,
            opacity: 0.8,
          }}
          aria-hidden
        >
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      <div
        id={`day-content-${dayId}`}
        role="region"
        aria-labelledby={`day-header-${dayId}`}
        className="dayAccordionContent"
        style={{
          maxHeight: expanded ? 8000 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s ease-out",
        }}
      >
        <div
          style={{
            padding: "0 16px 18px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {totalSets > 0 && (
            <SessionProgress
              totalSets={totalSets}
              completedSets={completedSets}
              label="Session Progress"
            />
          )}

          <SessionOverview
            focus={day.title}
            duration={day.duration > 0 ? day.duration : undefined}
            objective={day.performanceNotes ?? "High force output, low fatigue"}
          />

          {day.blocks.map((block, i) => (
            <SessionBlock
              key={i}
              block={block}
              index={i}
              sessionDate={sessionDate}
              unit={unit}
              showRpe={showRpe}
              onSetCompletionChange={handleSetCompletionChange}
            />
          ))}

          {allComplete && (
            <SessionSummary
              totalSetsCompleted={completedSets}
              completionTime={completionTime ?? undefined}
            />
          )}

          {onBeginSession && (
            <button
              type="button"
              onClick={() => onBeginSession(dayId)}
              className="dayAccordionBeginBtn"
              style={{
                width: "100%",
                height: 48,
                marginTop: 16,
                padding: "0 16px",
                background: "rgba(0,201,160,0.25)",
                border: "1px solid #00C9A0",
                borderRadius: 12,
                color: "#00C9A0",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              Begin Session →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
