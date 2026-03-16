"use client";

/**
 * WeekSelector — horizontal week selector for programme navigation.
 * Mobile-first: horizontal scroll, 44px touch targets, teal active indicator.
 */

export type WeekSelectorProps = {
  /** Total number of weeks in the phase */
  totalWeeks: number;
  /** Currently selected week (1-based) */
  selectedWeek: number;
  /** Callback when user selects a different week */
  onWeekChange: (week: number) => void;
  /** Optional class name for the container */
  className?: string;
};

export default function WeekSelector({
  totalWeeks,
  selectedWeek,
  onWeekChange,
  className = "",
}: WeekSelectorProps) {
  const weeks = Array.from({ length: Math.max(1, totalWeeks) }, (_, i) => i + 1);

  return (
    <div className={className ?? ""} role="tablist" aria-label="Select week">
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          scrollbarWidth: "none",
        }}
        role="presentation"
      >
        {weeks.map((weekNum) => {
          const isActive = weekNum === selectedWeek;
          return (
            <button
              key={weekNum}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Week ${weekNum}`}
              onClick={() => onWeekChange(weekNum)}
              style={
                isActive
                  ? {
                      background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
                      border: "none",
                      borderRadius: 18,
                      padding: "7px 18px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "white",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      flexShrink: 0,
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 18,
                      padding: "7px 18px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(238,240,244,0.5)",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      flexShrink: 0,
                    }
              }
            >
              <span>Week {weekNum}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
