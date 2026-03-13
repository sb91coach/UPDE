"use client";

import { useState, useCallback } from "react";
import DayAccordion, { type ProgrammeDayData } from "./DayAccordion";

/**
 * Data for a single week: week number and list of days.
 */
export type ProgrammeWeekData = {
  week: number;
  days: ProgrammeDayData[];
};

export type ProgrammeWeekViewProps = {
  /** The selected week's data */
  weekData: ProgrammeWeekData;
  /** Callback when user expands/collapses a day; parent can track expandedDay for controlled use */
  onExpandedDayChange?: (dayId: string | null) => void;
  /** Optional: controlled expanded day id (e.g. "monday-1"). If not provided, internal state is used. */
  expandedDayId?: string | null;
};

export default function ProgrammeWeekView({
  weekData,
  onExpandedDayChange,
  expandedDayId: controlledExpandedId,
}: ProgrammeWeekViewProps) {
  const [internalExpanded, setInternalExpanded] = useState<string | null>(null);

  const isControlled = controlledExpandedId !== undefined;
  const expandedDay = isControlled ? controlledExpandedId : internalExpanded;

  const handleToggle = useCallback(
    (dayId: string) => {
      const next = expandedDay === dayId ? null : dayId;
      if (isControlled && onExpandedDayChange) {
        onExpandedDayChange(next);
      } else {
        setInternalExpanded(next);
        onExpandedDayChange?.(next);
      }
    },
    [expandedDay, isControlled, onExpandedDayChange]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {weekData.days.map((day, i) => {
        const dayId = `${day.day.toLowerCase().replace(/\s/g, "-")}-w${weekData.week}-${i}`;
        return (
          <DayAccordion
            key={dayId}
            day={day}
            dayId={dayId}
            expanded={expandedDay === dayId}
            onToggle={() => handleToggle(dayId)}
          />
        );
      })}
    </div>
  );
}
