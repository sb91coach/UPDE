"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import SessionBlock, { type SessionBlockData, getTotalSetsFromBlocks } from "./SessionBlock";
import SessionProgress from "./SessionProgress";
import SessionOverview from "./SessionOverview";
import SessionSummary from "./SessionSummary";
import { SoftPaywall } from "@/app/components/SoftPaywall";

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
  /** When false, Begin Session is gated behind soft paywall */
  isPro?: boolean;
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
  isPro = true,
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
    <div className="dayAccordionRoot">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`day-content-${dayId}`}
        id={`day-header-${dayId}`}
        className="dayAccordionHeader"
      >
        <span className="dayAccordionHeaderLeft">
          <span className="dayAccordionDot" aria-hidden />
          <span className="dayAccordionTitleWrap">
            <span className="dayAccordionDay">{day.day}</span>
            <span className="dayAccordionTypePill">{day.type} Day</span>
          </span>
        </span>
        <span className="dayAccordionHeaderRight" aria-hidden>
          {day.duration > 0 && (
            <span className="dayAccordionDuration">~{day.duration} min</span>
          )}
          <span className={`dayAccordionChevron ${expanded ? "dayAccordionChevron--open" : ""}`}>⌃</span>
        </span>
      </button>

      <div
        id={`day-content-${dayId}`}
        role="region"
        aria-labelledby={`day-header-${dayId}`}
        className={`dayAccordionContent ${expanded ? "dayAccordionContent--open" : ""}`}
      >
        <div
          className="dayAccordionInner"
        >
          {!isPro ? (
            <>
              <div
                className="dayAccordionBlur"
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
              </div>
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <span style={{ fontSize: 12, color: "rgba(238,240,244,0.4)" }}>
                  🔒 Upgrade to see full session detail
                </span>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          {onBeginSession && (
            <SoftPaywall isPro={isPro} feature="Programme Engine">
              <button
                type="button"
                onClick={() => isPro && onBeginSession(dayId)}
                className="dayAccordionBeginBtn"
              >
                Begin Session →
              </button>
            </SoftPaywall>
          )}
        </div>
      </div>
      <style jsx>{`
        .dayAccordionRoot {
          margin-bottom: 10px;
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius-card);
          overflow: hidden;
        }
        .dayAccordionHeader {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          min-height: 56px;
          background: transparent;
          border: none;
          color: inherit;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
        }
        .dayAccordionHeaderLeft {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1 1 0;
          min-width: 0;
        }
        .dayAccordionDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--accent-teal);
          box-shadow: 0 0 10px rgba(0, 201, 160, 0.6);
          flex-shrink: 0;
        }
        .dayAccordionTitleWrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .dayAccordionDay {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .dayAccordionTypePill {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          font-size: 11px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
        }
        .dayAccordionHeaderRight {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .dayAccordionDuration {
          font-size: 13px;
          color: var(--text-muted);
        }
        .dayAccordionChevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          color: var(--text-muted);
          font-size: 11px;
          transform: rotate(0deg);
          transition: transform 0.2s ease;
        }
        .dayAccordionChevron--open {
          transform: rotate(180deg);
        }
        .dayAccordionContent {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
        }
        .dayAccordionContent--open {
          max-height: 8000px;
        }
        .dayAccordionInner {
          padding: 0 16px 16px;
          border-top: var(--border-subtle);
        }
        .dayAccordionBlur {
          filter: blur(3px);
          user-select: none;
          pointer-events: none;
        }
        .dayAccordionBeginBtn {
          width: 100%;
          height: 50px;
          margin-top: 16px;
          padding: 0 16px;
          border-radius: var(--radius-btn);
          background: var(--gradient-cta);
          border: none;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
