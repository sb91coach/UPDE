"use client";

/**
 * WeekSelector — horizontal week selector for programme navigation.
 * Displays week buttons, highlights the active week, triggers week change via callback.
 * Additive component; does not modify existing layout or styling.
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
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
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
              padding: "10px 16px",
              minWidth: 72,
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "#fff" : "rgba(255,255,255,0.85)",
              background: isActive
                ? "linear-gradient(135deg, rgba(47,128,237,0.4), rgba(39,224,166,0.2))"
                : "rgba(255,255,255,0.06)",
              border: isActive ? "1px solid rgba(47,128,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              cursor: "pointer",
              transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            Week {weekNum}
          </button>
        );
      })}
    </div>
  );
}
