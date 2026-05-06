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
    <div
      className={`dayCard ${expanded ? "dayCardExpanded" : ""}`}
      style={{
        marginBottom: 10,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`day-content-${dayId}`}
        id={`day-header-${dayId}`}
        className="dayHeader"
      >
        <span className="dayAccordionHeaderLeft">
          <span
            className={`dayAccordionDot ${
              day.type === "Red"
                ? "dotRed"
                : day.type === "Green"
                  ? "dotGreen"
                  : day.type === "Recovery"
                    ? "dotRecovery"
                    : "dotOff"
            }`}
            aria-hidden
          />
          <span className="dayAccordionTitleWrap">
            <span className="dayAccordionDay">{day.day}</span>
            <span className="dayAccordionType">{day.title}</span>
          </span>
        </span>
        <span className="dayAccordionHeaderRight" aria-hidden>
          {day.duration > 0 && (
            <span className="dayAccordionDuration">~{day.duration} min</span>
          )}
          <span className="dayAccordionChevron">›</span>
        </span>
      </button>

      <div
        id={`day-content-${dayId}`}
        role="region"
        aria-labelledby={`day-header-${dayId}`}
        className={`dayContent ${expanded ? "dayContentOpen" : ""}`}
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
        .dayAccordionHeaderLeft {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1 1 0;
          min-width: 0;
        }
        .dayAccordionHeaderRight {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .dayCard {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          color: rgba(238, 240, 244, 0.9);
          overflow: hidden;
          transition: background 0.15s, border-color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .dayCard:hover {
          background: rgba(255, 255, 255, 0.055);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .dayCardExpanded {
          background: rgba(255, 255, 255, 0.055);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .dayHeader {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 16px;
          min-height: 62px;
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          text-align: left;
        }

        .dayAccordionDot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dotRed {
          background: #f04e37;
          box-shadow: 0 0 8px rgba(240, 78, 55, 0.35);
        }
        .dotGreen {
          background: #00c9a0;
          box-shadow: 0 0 8px rgba(0, 201, 160, 0.35);
        }
        .dotRecovery {
          background: rgba(238, 240, 244, 0.18);
        }
        .dotOff {
          background: rgba(238, 240, 244, 0.12);
        }

        .dayAccordionTitleWrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .dayAccordionDay {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.2px;
          color: #ffffff;
        }
        .dayAccordionType {
          font-size: 12px;
          font-weight: 400;
          color: rgba(238, 240, 244, 0.4);
          margin-top: 2px;
        }

        .dayAccordionDuration {
          margin-left: auto;
          font-size: 12px;
          font-weight: 500;
          color: rgba(238, 240, 244, 0.3);
          white-space: nowrap;
        }
        .dayAccordionChevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(238, 240, 244, 0.18);
          font-size: 14px;
          margin-left: 8px;
          flex-shrink: 0;
        }

        .dayContent {
          display: none;
        }
        .dayContentOpen {
          display: block;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .dayAccordionInner {
          padding: 0;
          border-top: none;
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
          border-radius: 10px;
          background: #00c9a0;
          border: none;
          color: #08090c;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        @media (min-width: 769px) {
          .dayCard {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.09);
            border-radius: 14px;
          }
          .dayHeader {
            padding: 14px 16px;
            min-height: 56px;
          }
          .dayAccordionDay {
            font-weight: 600;
            letter-spacing: 0;
            color: var(--text-primary);
          }
          .dayAccordionType {
            display: none;
          }
          .dayAccordionChevron {
            color: var(--text-muted);
          }
          .dayContentOpen {
            background: rgba(255, 255, 255, 0.02);
          }
          .dayAccordionBeginBtn {
            border-radius: var(--radius-btn);
            background: var(--gradient-cta);
            color: #ffffff;
            font-weight: 700;
            letter-spacing: 0;
          }
        }
      `}</style>
    </div>
  );
}
