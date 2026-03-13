"use client";

import { useState, useMemo } from "react";

const BLUE = "#3b82f6";
const GREEN = "#22c55e";
const ORANGE = "#f97316";
const PURPLE = "#a855f7";

type MacroKey = "protein" | "carbs" | "fats" | "calories";

const MACRO_COLORS: Record<MacroKey, string> = {
  protein: BLUE,
  carbs: GREEN,
  fats: ORANGE,
  calories: PURPLE,
};

export type MacroDay = {
  date: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
};

function last30Days(): MacroDay[] {
  const out: MacroDay[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 50 + (i % 7) * 5 + Math.sin(i * 0.4) * 15;
    out.push({
      date: d.toISOString().slice(0, 10),
      protein: Math.round(80 + Math.sin(i * 0.3) * 25),
      carbs: Math.round(Math.max(150, base + 120 + Math.cos(i * 0.5) * 40)),
      fats: Math.round(55 + Math.sin(i * 0.35) * 15),
      calories: Math.round(1800 + Math.sin(i * 0.25) * 250),
    });
  }
  return out;
}

function smoothPath(
  points: { x: number; y: number }[],
  tension: number
): string {
  if (points.length < 2) return "";
  const t = tension;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 2] ?? points[i - 1];
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[i + 1] ?? points[i];
    const cp1x = p1.x + (p2.x - p0.x) / 6 * t;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * t;
    const cp2x = p2.x - (p3.x - p1.x) / 6 * t;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * t;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export type NutritionMacroChartProps = {
  data?: MacroDay[];
  className?: string;
};

export default function NutritionMacroChart({
  data: propData,
  className = "",
}: NutritionMacroChartProps) {
  const data = propData ?? last30Days();
  const [visible, setVisible] = useState<Record<MacroKey, boolean>>({
    protein: true,
    carbs: true,
    fats: true,
    calories: true,
  });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    day: MacroDay;
    index: number;
  } | null>(null);

  const w = 700;
  const h = 280;
  const pad = { top: 20, right: 16, bottom: 36, left: 44 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const { paths, areas, toX, toY, minY, maxY } = useMemo(() => {
    const allVals = data.flatMap((d) => [d.protein, d.carbs, d.fats, d.calories]);
    const minY = Math.min(...allVals, 0) - 20;
    const maxY = Math.max(...allVals, 2500) + 100;
    const range = maxY - minY || 1;
    const n = data.length;
    const toX = (i: number) => pad.left + (i / Math.max(n - 1, 1)) * innerW;
    const toY = (v: number) =>
      pad.top + innerH - ((v - minY) / range) * innerH;

    const keys: MacroKey[] = ["protein", "carbs", "fats", "calories"];
    const paths: Record<MacroKey, string> = {} as Record<MacroKey, string>;
    const areas: Record<MacroKey, string> = {} as Record<MacroKey, string>;

    keys.forEach((key) => {
      const points = data.map((d, i) => ({ x: toX(i), y: toY(d[key]) }));
      paths[key] = smoothPath(points, 0.4);
      const bottom = pad.top + innerH;
      areas[key] = `${paths[key]} L ${toX(n - 1)} ${bottom} L ${toX(0)} ${bottom} Z`;
    });

    return { paths, areas, toX, toY, minY, maxY };
  }, [data]);

  const toggle = (k: MacroKey) =>
    setVisible((v) => ({ ...v, [k]: !v[k] }));

  return (
    <div className={`nutritionMacroChart ${className}`}>
      <div className="nutritionMacroCard">
        <h3 className="nutritionMacroTitle">Macro intake (last 30 days)</h3>
        <div className="nutritionMacroLegend">
          {(["protein", "carbs", "fats", "calories"] as MacroKey[]).map(
            (key) => (
              <button
                key={key}
                type="button"
                className={`nutritionMacroLegendBtn ${visible[key] ? "on" : "off"}`}
                onClick={() => toggle(key)}
                style={{
                  borderColor: visible[key] ? MACRO_COLORS[key] : "rgba(255,255,255,0.2)",
                  color: visible[key] ? MACRO_COLORS[key] : "rgba(255,255,255,0.5)",
                }}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            )
          )}
        </div>
        <div
          className="nutritionMacroChartWrap"
          onMouseLeave={() => setTooltip(null)}
        >
          <svg
            width="100%"
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            className="nutritionMacroSvg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {(["protein", "carbs", "fats", "calories"] as MacroKey[]).map(
                (key) => (
                  <linearGradient
                    key={key}
                    id={`macroGrad-${key}`}
                    x1="0"
                    y1="1"
                    x2="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor={MACRO_COLORS[key]} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={MACRO_COLORS[key]} stopOpacity="0" />
                  </linearGradient>
                )
              )}
              {(["protein", "carbs", "fats", "calories"] as MacroKey[]).map(
                (key) => (
                  <filter
                    key={key}
                    id={`macroGlow-${key}`}
                    x="-30%"
                    y="-30%"
                    width="160%"
                    height="160%"
                  >
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )
              )}
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const v = minY + (maxY - minY) * frac;
              const y = pad.top + innerH - ((v - minY) / (maxY - minY)) * innerH;
              return (
                <line
                  key={frac}
                  x1={pad.left}
                  y1={y}
                  x2={w - pad.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}
            {(["protein", "carbs", "fats", "calories"] as MacroKey[]).map(
              (key) =>
                visible[key] && (
                  <g key={key}>
                    <path
                      d={areas[key]}
                      fill={`url(#macroGrad-${key})`}
                    />
                    <path
                      d={paths[key]}
                      fill="none"
                      stroke={MACRO_COLORS[key]}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={`url(#macroGlow-${key})`}
                    />
                    {data.map((d, i) => (
                      <circle
                        key={i}
                        cx={pad.left + (i / Math.max(data.length - 1, 1)) * innerW}
                        cy={
                          pad.top +
                          innerH -
                          ((d[key] - minY) / (maxY - minY)) * innerH
                        }
                        r={3}
                        fill={MACRO_COLORS[key]}
                        filter={`url(#macroGlow-${key})`}
                        style={{ pointerEvents: "none" }}
                      />
                    ))}
                  </g>
                )
            )}
            <line
              x1={pad.left}
              y1={pad.top + innerH}
              x2={w - pad.right}
              y2={pad.top + innerH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <line
              x1={pad.left}
              y1={pad.top}
              x2={pad.left}
              y2={pad.top + innerH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <text
              x={pad.left - 6}
              y={pad.top + 4}
              textAnchor="end"
              fontSize="11"
              fill="rgba(255,255,255,0.6)"
            >
              (g / kcal)
            </text>
            {data.map((d, i) => (
              <rect
                key={i}
                x={pad.left + (i / Math.max(data.length - 1, 1)) * innerW - 8}
                y={pad.top}
                width={16}
                height={innerH}
                fill="transparent"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const svg = e.currentTarget.ownerSVGElement;
                  if (!svg) return;
                  const pt = svg.createSVGPoint();
                  pt.x = rect.left + rect.width / 2;
                  pt.y = rect.top;
                  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                  setTooltip({
                    x: svgP.x,
                    y: svgP.y - 10,
                    day: d,
                    index: i,
                  });
                }}
              />
            ))}
            {tooltip && (
              <g className="nutritionMacroTooltip">
                <rect
                  x={tooltip.x - 72}
                  y={tooltip.y - 58}
                  width={144}
                  height={52}
                  rx={8}
                  fill="rgba(17,24,39,0.98)"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                />
                <text
                  x={tooltip.x}
                  y={tooltip.y - 38}
                  textAnchor="middle"
                  fontSize="11"
                  fill="rgba(255,255,255,0.9)"
                >
                  {new Date(tooltip.day.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </text>
                <text
                  x={tooltip.x}
                  y={tooltip.y - 24}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.75)"
                >
                  P {tooltip.day.protein}g · C {tooltip.day.carbs}g · F {tooltip.day.fats}g
                </text>
                <text
                  x={tooltip.x}
                  y={tooltip.y - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.75)"
                >
                  {tooltip.day.calories} kcal
                </text>
              </g>
            )}
          </svg>
        </div>
        <div className="nutritionMacroChartX">
          {[0, 7, 14, 21, 28].map((i) => (
            <span key={i}>
              {new Date(data[Math.min(i, data.length - 1)].date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          ))}
        </div>
      </div>
      <style jsx>{`
        .nutritionMacroChart {
          margin-bottom: 24px;
        }
        .nutritionMacroCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 24px 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .nutritionMacroCard:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .nutritionMacroTitle {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 16px;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .nutritionMacroLegend {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .nutritionMacroLegendBtn {
          padding: 6px 14px;
          border-radius: 10px;
          border: 1px solid;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .nutritionMacroLegendBtn.on:hover {
          filter: brightness(1.15);
        }
        .nutritionMacroLegendBtn.off {
          opacity: 0.6;
        }
        .nutritionMacroChartWrap {
          overflow: hidden;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.25);
        }
        .nutritionMacroSvg {
          display: block;
        }
        .nutritionMacroChartX {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          padding: 0 44px 0 48px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }
        @media (max-width: 768px) {
          .nutritionMacroChartX {
            padding: 0 24px;
          }
        }
      `}</style>
    </div>
  );
}
