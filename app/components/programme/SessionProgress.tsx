"use client";

/**
 * SessionProgress — progress bar and sets count at top of expanded session.
 * Shows completed sets / total sets and percentage.
 */

export type SessionProgressProps = {
  totalSets: number;
  completedSets: number;
  label?: string;
};

export default function SessionProgress({
  totalSets,
  completedSets,
  label = "Session Progress",
}: SessionProgressProps) {
  const total = Math.max(0, totalSets);
  const completed = Math.max(0, Math.min(completedSets, total));
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "14px 18px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          fontSize: 12,
          letterSpacing: "0.05em",
          opacity: 0.85,
        }}
      >
        <span>{label}</span>
        <span>{completed} / {total} sets · {percent}%</span>
      </div>
      <div
        style={{
          height: 8,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "linear-gradient(90deg, rgba(47,128,237,0.6), rgba(39,224,166,0.5))",
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
