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
    <div
      className={className}
      role="tablist"
      aria-label="Select week"
      style={{
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        className="weekSelectorScroll"
        role="presentation"
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          gap: 8,
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 4,
        }}
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
              style={{
                flexShrink: 0,
                minWidth: 72,
                height: 36,
                padding: "0 14px",
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: isActive ? 700 : 600,
                letterSpacing: "0.02em",
                border: isActive ? "1px solid rgba(0,201,160,0.3)" : "1px solid rgba(255,255,255,0.08)",
                background: isActive ? "rgba(0,201,160,0.1)" : "rgba(255,255,255,0.03)",
                color: isActive ? "#00C9A0" : "rgba(238,240,244,0.4)",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                fontFamily: "inherit",
              }}
            >
              Week {weekNum}
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .weekSelectorScroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
