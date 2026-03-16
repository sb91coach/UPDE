"use client";

/**
 * SessionOverview — compact card at top of expanded session.
 * Shows session focus, estimated duration, primary objective.
 * Additive component; does not change programme page layout or styling.
 */

export type SessionOverviewProps = {
  /** Session focus (e.g. "Neural Strength") */
  focus?: string;
  /** Estimated duration in minutes */
  duration?: number;
  /** Primary objective (e.g. "High force output, low fatigue") */
  objective?: string;
};

export default function SessionOverview({
  focus,
  duration,
  objective,
}: SessionOverviewProps) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: "18px 20px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
      }}
    >
      <div
        style={{
          color: "rgba(238,240,244,0.25)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Session Overview
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, lineHeight: 1.5 }}>
        {focus != null && focus !== "" && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "rgba(238,240,244,0.35)", minWidth: 72 }}>Focus</span>
            <span style={{ color: "rgba(238,240,244,0.95)" }}>{focus}</span>
          </div>
        )}
        {duration != null && duration > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "rgba(238,240,244,0.35)", minWidth: 72 }}>Duration</span>
            <span style={{ color: "rgba(238,240,244,0.95)" }}>{duration} minutes</span>
          </div>
        )}
        {objective != null && objective !== "" && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "rgba(238,240,244,0.35)", minWidth: 72 }}>Objective</span>
            <span style={{ color: "rgba(238,240,244,0.95)" }}>{objective}</span>
          </div>
        )}
        {(!focus || focus === "") && (!duration || duration <= 0) && (!objective || objective === "") && (
          <span style={{ opacity: 0.7 }}>—</span>
        )}
      </div>
    </div>
  );
}
