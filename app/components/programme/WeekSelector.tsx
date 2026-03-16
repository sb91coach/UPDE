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
    <div className={`weekSelectorRoot ${className ?? ""}`} role="tablist" aria-label="Select week">
      <div className="weekSelectorScroll" role="presentation">
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
              className={`weekSelectorPill ${isActive ? "weekSelectorPill--active" : ""}`}
            >
              <span className="weekSelectorDot" aria-hidden />
              <span className="weekSelectorLabel">Week {weekNum}</span>
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .weekSelectorRoot {
          margin-bottom: 14px;
          overflow: hidden;
        }
        .weekSelectorScroll::-webkit-scrollbar {
          display: none;
        }
        .weekSelectorScroll {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding: 4px 0 4px;
        }
        .weekSelectorPill {
          position: relative;
          flex-shrink: 0;
          min-width: 64px;
          height: 36px;
          padding: 0 14px;
          border-radius: 18px;
          border: var(--border-card);
          background: var(--bg-card);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.12s ease;
          font-family: inherit;
        }
        .weekSelectorPill--active {
          background: var(--gradient-cta);
          border: none;
          color: #ffffff;
          transform: translateY(-1px);
        }
        .weekSelectorDot {
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: transparent;
        }
        .weekSelectorPill--active .weekSelectorDot {
          background: var(--accent-teal);
          box-shadow: 0 0 8px rgba(0, 201, 160, 0.65);
        }
        .weekSelectorLabel {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}
