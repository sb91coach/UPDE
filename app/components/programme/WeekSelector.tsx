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
                padding: "10px 18px",
                minHeight: 44,
                minWidth: 80,
                whiteSpace: "nowrap",
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#00C9A0" : "rgba(255,255,255,0.85)",
                background: isActive ? "rgba(0,201,160,0.2)" : "rgba(255,255,255,0.06)",
                border: isActive ? "1px solid #00C9A0" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                cursor: "pointer",
                transition: "background 0.2s ease, border-color 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
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
