"use client";

import type { ProgrammeDayData } from "./DayAccordion";
import type { ProgrammeWeekData } from "./ProgrammeWeekView";

export type DayCompletionStatus = "not_started" | "in_progress" | "complete";

export type WeekCalendarViewProps = {
  weekData: ProgrammeWeekData;
  completedSessionNames?: string[];
  onDaySelect: (dayId: string, day: ProgrammeDayData) => void;
};

function getDayId(day: ProgrammeDayData, week: number, index: number): string {
  return `${day.day.toLowerCase().replace(/\s/g, "-")}-w${week}-${index}`;
}

function getStatus(
  day: ProgrammeDayData,
  completedSessionNames: string[] | undefined
): DayCompletionStatus {
  if (!completedSessionNames?.length) return "not_started";
  const title = day.title?.trim();
  if (!title) return "not_started";
  const isComplete = completedSessionNames.some(
    (n) => n.trim().toLowerCase() === title.toLowerCase()
  );
  return isComplete ? "complete" : "not_started";
}

function dotClass(type: ProgrammeDayData["type"]): string {
  if (type === "Red") return "session-dot session-dot-red";
  if (type === "Green") return "session-dot session-dot-green";
  return "session-dot session-dot-grey";
}

const STATUS_LABELS: Record<DayCompletionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "✔ Completed",
};

export default function WeekCalendarView({
  weekData,
  completedSessionNames,
  onDaySelect,
}: WeekCalendarViewProps) {
  return (
    <div className="week-calendar-list">
      {weekData.days.map((day, i) => {
        const dayId = getDayId(day, weekData.week, i);
        const status = getStatus(day, completedSessionNames);
        return (
          <button
            key={dayId}
            type="button"
            onClick={() => onDaySelect(dayId, day)}
            className="session-card"
            aria-label={`${day.day} – ${day.title}, ${STATUS_LABELS[status]}`}
          >
            <span className={dotClass(day.type)} aria-hidden />
            <div className="session-card-inner">
              <span className="session-card-day">{day.day}</span>
              <span className="session-card-title">{day.title}</span>
            </div>
            {day.duration > 0 && (
              <span className="session-card-duration">~{day.duration} min</span>
            )}
            <span className="session-card-chevron" aria-hidden>›</span>
          </button>
        );
      })}
      <style jsx>{`
        .week-calendar-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .session-card {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius-card);
          padding: 16px 18px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 64px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
          -webkit-tap-highlight-color: transparent;
          width: 100%;
          text-align: left;
        }
        .session-card:hover,
        .session-card:active {
          background: var(--bg-card-hover);
          border: var(--border-active);
          transform: translateY(-1px);
        }
        .session-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .session-dot-red {
          background: var(--accent-red);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        }
        .session-dot-green {
          background: var(--accent-teal);
          box-shadow: 0 0 8px rgba(0, 201, 160, 0.4);
        }
        .session-dot-grey {
          background: rgba(238, 240, 244, 0.2);
        }
        .session-card-inner {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .session-card-day {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.2px;
          color: var(--text-primary);
        }
        .session-card-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .session-card-duration {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          margin-left: auto;
        }
        .session-card-chevron {
          color: var(--text-faint);
          margin-left: 8px;
          font-size: 18px;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
