"use client";

/** Stress level for body regions: high = red, medium = amber, low = green */
export type StressLevel = "high" | "medium" | "low" | "none";

export type BodyRegionStress = {
  chest?: StressLevel;
  shoulders?: StressLevel;
  abs?: StressLevel;
  lats?: StressLevel;
  lowerBack?: StressLevel;
  glutes?: StressLevel;
  quads?: StressLevel;
  hamstrings?: StressLevel;
  calves?: StressLevel;
  biceps?: StressLevel;
  triceps?: StressLevel;
  forearms?: StressLevel;
};

const STRESS_COLORS: Record<StressLevel, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
  none: "#6b7280",
};

const BASE_BODY = "#eab308";
const GREY_NEUTRAL = "#6b7280";
const TEAL = "#14b8a6";

export type BodyReportChartProps = {
  stress?: BodyRegionStress | null;
  lastSessionFocus?: string | null;
  sessions?: number;
  exercises?: number;
  sets?: number;
  reps?: number;
  volumeKg?: number;
  className?: string;
};

function deriveStressFromSessionFocus(focus: string): BodyRegionStress {
  const f = focus.toLowerCase();
  const s: BodyRegionStress = {};
  if (f.includes("lower") || f.includes("leg") || f.includes("squat") || f.includes("deadlift")) {
    s.quads = "high";
    s.glutes = "high";
    s.hamstrings = "high";
    s.lowerBack = "medium";
  }
  if (f.includes("upper") || f.includes("push") || f.includes("bench") || f.includes("press")) {
    s.chest = "high";
    s.shoulders = "high";
    s.triceps = "high";
  }
  if (f.includes("pull") || f.includes("row") || f.includes("lat")) {
    s.lats = "high";
    s.biceps = "medium";
  }
  if (f.includes("full") || f.includes("body")) {
    s.chest = s.shoulders = s.lats = s.quads = s.glutes = s.hamstrings = "medium";
    s.lowerBack = "medium";
  }
  return s;
}

/** Fill for a region: stress color if set, else grey for shoulders/neck, else base orange/yellow */
function fillFor(regions: BodyRegionStress, key: keyof BodyRegionStress): string {
  const level = regions[key];
  if (level && level !== "none") return STRESS_COLORS[level];
  if (key === "shoulders") return GREY_NEUTRAL;
  return BASE_BODY;
}

export default function BodyReportChart({
  stress,
  lastSessionFocus = "Lower body",
  sessions = 0,
  exercises = 0,
  sets = 0,
  reps = 0,
  volumeKg = 0,
  className = "",
}: BodyReportChartProps) {
  const regions = stress ?? deriveStressFromSessionFocus(lastSessionFocus || "");
  const get = (key: keyof BodyRegionStress) => fillFor(regions, key);

  const stats = [
    { label: "SESSIONS", value: sessions },
    { label: "EXERCISES", value: exercises },
    { label: "SETS", value: sets },
    { label: "REPS", value: reps },
    { label: "VOLUME (KG)", value: volumeKg.toLocaleString() },
  ];

  return (
    <div className={`bodyReport ${className}`}>
      <div className="bodyReportTitle">Body report</div>
      <div className="bodyReportSub">Last trained · stress by area</div>
      <div className="bodyReportLayout">
        <div className="bodyReportRow1">
          <div className="bodyReportFigure">
            <div className="bodyReportFigureLabel">FRONT</div>
            <svg viewBox="0 0 120 200" className="bodyReportSvg">
              {/* Head - oval, base orange */}
              <ellipse cx="60" cy="18" rx="14" ry="10" fill={get("shoulders")} stroke={GREY_NEUTRAL} strokeWidth="1" />
              {/* Neck/shoulders - grey blocks */}
              <path d="M 44 28 L 52 38 L 68 38 L 76 28 Z" fill={GREY_NEUTRAL} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
              {/* Chest/torso */}
              <path d="M 38 38 Q 60 48 82 38 L 78 72 Q 60 68 42 72 Z" fill={get("chest")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              <rect x="48" y="72" width="24" height="38" rx="2" fill={get("abs")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              {/* Arms raised - block style */}
              <rect x="28" y="32" width="14" height="32" rx="2" fill={get("biceps")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              <rect x="78" y="32" width="14" height="32" rx="2" fill={get("triceps")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              {/* Lower body - trapezoidal */}
              <path d="M 40 110 L 52 200 L 68 200 L 80 110 Z" fill={get("quads")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            </svg>
          </div>
          <div className="bodyReportStats">
            {stats.map(({ label, value }) => (
              <div key={label} className="bodyReportStatRow">
                <span className="bodyReportStatLabel">{label}</span>
                <span className="bodyReportStatValue">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bodyReportFigure bodyReportBack">
          <div className="bodyReportFigureLabel">BACK</div>
          <svg viewBox="0 0 120 200" className="bodyReportSvg">
            <ellipse cx="60" cy="18" rx="14" ry="10" fill={BASE_BODY} stroke={GREY_NEUTRAL} strokeWidth="1" />
            <path d="M 44 28 L 52 38 L 68 38 L 76 28 Z" fill={GREY_NEUTRAL} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
            <path d="M 42 38 Q 60 34 78 38 L 78 72 Q 60 76 42 72 Z" fill={get("lats")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <path d="M 42 72 L 42 110 Q 60 108 78 110 L 78 72 Z" fill={get("lowerBack")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <rect x="28" y="32" width="14" height="32" rx="2" fill={get("triceps")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <rect x="78" y="32" width="14" height="32" rx="2" fill={get("triceps")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <path d="M 42 110 Q 60 118 78 110 L 72 200 L 48 200 Z" fill={get("glutes")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <path d="M 48 200 L 52 112 M 72 200 L 68 112" fill="none" stroke={get("hamstrings")} strokeWidth="8" strokeLinecap="round" />
            <path d="M 52 182 L 52 198 M 68 182 L 68 198" fill="none" stroke={get("calves")} strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="bodyReportLegend">
        <span className="bodyReportLegendItem high">High stress</span>
        <span className="bodyReportLegendItem medium">Medium</span>
        <span className="bodyReportLegendItem low">Low / recovered</span>
      </div>
      <style jsx>{`
        .bodyReport {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
        }
        .bodyReportTitle {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
          color: #fff;
        }
        .bodyReportSub {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 16px;
          color: #fff;
        }
        .bodyReportLayout {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 20px;
        }
        .bodyReportRow1 {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 28px;
        }
        .bodyReportFigure {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bodyReportBack {
          align-self: center;
        }
        .bodyReportFigureLabel {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #fff;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .bodyReportSvg {
          width: 100%;
          max-width: 95px;
          height: auto;
        }
        .bodyReportStats {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 110px;
        }
        .bodyReportStatRow {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .bodyReportStatLabel {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #fff;
          opacity: 0.95;
        }
        .bodyReportStatValue {
          font-size: 18px;
          font-weight: 700;
          color: ${TEAL};
        }
        .bodyReportLegend {
          display: flex;
          gap: 12px;
          margin-top: 14px;
          font-size: 10px;
          opacity: 0.9;
        }
        .bodyReportLegendItem.high { color: #ef4444; }
        .bodyReportLegendItem.medium { color: #f59e0b; }
        .bodyReportLegendItem.low { color: #22c55e; }
      `}</style>
    </div>
  );
}
