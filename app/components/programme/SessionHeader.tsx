"use client";

export type SessionHeaderProps = {
  title: string;
  duration?: string;
  focus?: string;
  onStartWorkout?: () => void;
  startWorkoutLabel?: string;
};

export default function SessionHeader({
  title,
  duration,
  focus,
  onStartWorkout,
  startWorkoutLabel = "Start Workout",
}: SessionHeaderProps) {
  return (
    <header
      className=""
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <h2
        style={{
          color: "rgba(238,240,244,0.95)",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.3px",
          margin: 0,
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, color: "rgba(238,240,244,0.6)" }}>
        {duration != null && duration !== "" && (
          <p style={{ margin: 0 }}>
            <span style={{ color: "rgba(238,240,244,0.35)" }}>Duration:</span> {duration}
          </p>
        )}
        {focus != null && focus !== "" && (
          <p style={{ margin: 0 }}>
            <span style={{ color: "rgba(238,240,244,0.35)" }}>Focus:</span> {focus}
          </p>
        )}
      </div>
      {onStartWorkout && (
        <button
          type="button"
          onClick={onStartWorkout}
          style={{
            height: 52,
            width: "100%",
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 15,
            background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
          }}
        >
          {startWorkoutLabel}
        </button>
      )}
    </header>
  );
}
