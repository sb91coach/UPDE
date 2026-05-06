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
        className="weekSelectorRow"
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
              className={`weekPill ${isActive ? "weekPillActive" : ""}`}
            >
              <span>Week {weekNum}</span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .weekSelectorRow::-webkit-scrollbar {
          display: none;
        }

        .weekPill {
          flex-shrink: 0;
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(238, 240, 244, 0.4);
          cursor: pointer;
          white-space: nowrap;
          min-height: 34px;
        }

        .weekPillActive {
          background: rgba(0, 201, 160, 0.1);
          border-color: rgba(0, 201, 160, 0.3);
          color: #00c9a0;
          font-weight: 700;
        }

        @media (min-width: 769px) {
          .weekPill {
            padding: 7px 18px;
            border-radius: 18px;
            font-size: 13px;
            background: rgba(255, 255, 255, 0.05);
          }
          .weekPillActive {
            background: linear-gradient(135deg, #0a84ff, #7b61ff);
            color: #fff;
            border: none;
          }
        }
      `}</style>
    </div>
  );
}
