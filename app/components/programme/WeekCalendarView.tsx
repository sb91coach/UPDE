"use client";

import type { ProgrammeDayData } from "./DayAccordion";
import type { ProgrammeWeekData } from "./ProgrammeWeekView";

export type DayCompletionStatus = "not_started" | "in_progress" | "complete";

export type WeekCalendarViewProps = {
  weekData: ProgrammeWeekData;
  /** Optional: session names that have been completed this week (e.g. from session_logs). */
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

const STATUS_LABELS: Record<DayCompletionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "✔ Completed",
};

const STATUS_STYLES: Record<DayCompletionStatus, string> = {
  not_started: "text-gray-500",
  in_progress: "text-amber-600",
  complete: "text-emerald-600",
};

export default function WeekCalendarView({
  weekData,
  completedSessionNames,
  onDaySelect,
}: WeekCalendarViewProps) {
  return (
    <div className="flex flex-col space-y-4">
      {weekData.days.map((day, i) => {
        const dayId = getDayId(day, weekData.week, i);
        const status = getStatus(day, completedSessionNames);
        return (
          <button
            key={dayId}
            type="button"
            onClick={() => onDaySelect(dayId, day)}
            className="polish-card w-full text-left overflow-hidden active:scale-[0.99] transition-transform min-h-[56px] flex flex-col justify-center p-4 touch-manipulation"
            style={{ minWidth: 0 }}
            aria-label={`${day.day} – ${day.title}, ${STATUS_LABELS[status]}`}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-base font-semibold text-gray-900 truncate">{day.day}</span>
              <span className={`text-sm font-medium flex-shrink-0 ${STATUS_STYLES[status]}`}>
                {STATUS_LABELS[status]}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5 truncate">{day.title}</p>
            {day.duration > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">~{day.duration} min</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
