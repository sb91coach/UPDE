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
    <header className="polish-card space-y-3">
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "rgba(238,240,244,0.95)", margin: 0 }}>{title}</h2>
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
