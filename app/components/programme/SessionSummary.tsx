"use client";

/**
 * SessionSummary — shown when all sets are complete.
 * Displays total sets completed, estimated load lifted, completion time.
 * Additive component; does not change programme page layout or styling.
 */

export type SessionSummaryProps = {
  /** Total sets completed */
  totalSetsCompleted: number;
  /** Estimated load lifted (e.g. "12,400 kg" or optional) */
  estimatedLoadLifted?: string;
  /** Completion time (e.g. "10:45 AM" or "42 min") */
  completionTime?: string;
};

export default function SessionSummary({
  totalSetsCompleted,
  estimatedLoadLifted,
  completionTime,
}: SessionSummaryProps) {
  return (
    <div
      style={{
        marginTop: 20,
        marginBottom: 16,
        padding: "18px 20px",
        background: "linear-gradient(135deg, rgba(39,224,166,0.1), rgba(47,128,237,0.08))",
        border: "1px solid rgba(39,224,166,0.25)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 14,
          opacity: 0.95,
        }}
      >
        Session Complete
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.8 }}>Total Sets Completed</span>
          <span style={{ fontWeight: 600, opacity: 0.95 }}>{totalSetsCompleted}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.8 }}>Estimated Load Lifted</span>
          <span style={{ opacity: 0.95 }}>{estimatedLoadLifted ?? "—"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.8 }}>Completion Time</span>
          <span style={{ opacity: 0.95 }}>{completionTime ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}
