"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import {
  loadReadinessEntries,
  getStoredIdList,
  getPillarScoresFromEntry,
  type ReadinessEntry,
  type PillarScores,
} from "@/lib/tacticalReadinessStorage";

const PILLAR_LABELS: (keyof PillarScores)[] = [
  "recovery",
  "structuralIntegrity",
  "strengthCapacity",
  "aerobicCapacity",
  "movementDurability",
];

const AXIS_LABELS: Record<keyof PillarScores, string> = {
  recovery: "Recovery",
  structuralIntegrity: "Structural Integrity",
  strengthCapacity: "Strength Capacity",
  aerobicCapacity: "Aerobic Capacity",
  movementDurability: "Movement Durability",
};

function NavTab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

/** Latest entry per ID (by date). */
function getLatestById(entries: ReadinessEntry[]): Map<string, ReadinessEntry> {
  const byId = new Map<string, ReadinessEntry>();
  entries.forEach((e) => {
    const existing = byId.get(e.id);
    if (!existing || e.date > existing.date) byId.set(e.id, e);
  });
  return byId;
}

function scoreColor(score: number): string {
  if (score >= 70) return "green";
  if (score >= 50) return "amber";
  return "red";
}

export default function TacticalRadarPage() {
  const pathname = usePathname();
  const [entries, setEntries] = useState<ReadinessEntry[]>([]);
  const [viewMode, setViewMode] = useState<"Individual" | "Unit">("Individual");
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    setEntries(loadReadinessEntries());
  }, []);

  const idList = useMemo(() => {
    const fromStorage = getStoredIdList(entries);
    return fromStorage.length > 0 ? fromStorage : ["ID 1", "ID 2", "ID 3", "ID 4", "ID 5"];
  }, [entries]);

  useEffect(() => {
    if (idList.length > 0 && !idList.includes(selectedId)) setSelectedId(idList[0]);
    else if (!selectedId && idList.length > 0) setSelectedId(idList[0]);
  }, [idList, selectedId]);

  const latestById = useMemo(() => getLatestById(entries), [entries]);

  const pillarScores = useMemo((): PillarScores | null => {
    if (viewMode === "Individual" && selectedId) {
      const entry = latestById.get(selectedId);
      if (!entry) return null;
      return getPillarScoresFromEntry(entry);
    }
    if (viewMode === "Unit") {
      const ids = Array.from(latestById.keys());
      if (ids.length === 0) return null;
      const sums: PillarScores = {
        recovery: 0,
        structuralIntegrity: 0,
        strengthCapacity: 0,
        aerobicCapacity: 0,
        movementDurability: 0,
      };
      ids.forEach((id) => {
        const p = getPillarScoresFromEntry(latestById.get(id)!);
        (Object.keys(sums) as (keyof PillarScores)[]).forEach((k) => (sums[k] += p[k]));
      });
      (Object.keys(sums) as (keyof PillarScores)[]).forEach((k) => (sums[k] = Math.round(sums[k] / ids.length)));
      return sums;
    }
    return null;
  }, [viewMode, selectedId, latestById]);

  const radarSize = 280;
  const center = radarSize / 2;
  const maxRadius = center - 48;

  const polygonPoints = useMemo(() => {
    if (!pillarScores) return "";
    return PILLAR_LABELS.map((key, i) => {
      const angle = (i * 360) / PILLAR_LABELS.length - 90;
      const rad = (angle * Math.PI) / 180;
      const r = (pillarScores[key] / 100) * maxRadius;
      const x = center + r * Math.cos(rad);
      const y = center + r * Math.sin(rad);
      return `${x},${y}`;
    }).join(" ");
  }, [pillarScores, maxRadius, center]);

  const axisLines = useMemo(() => {
    return PILLAR_LABELS.map((_, i) => {
      const angle = (i * 360) / PILLAR_LABELS.length - 90;
      const rad = (angle * Math.PI) / 180;
      const x = center + maxRadius * Math.cos(rad);
      const y = center + maxRadius * Math.sin(rad);
      return { x1: center, y1: center, x2: x, y2: y };
    });
  }, [maxRadius, center]);

  const axisLabelPositions = useMemo(() => {
    return PILLAR_LABELS.map((key, i) => {
      const angle = (i * 360) / PILLAR_LABELS.length - 90;
      const rad = (angle * Math.PI) / 180;
      const r = maxRadius + 28;
      const x = center + r * Math.cos(rad);
      const y = center + r * Math.sin(rad);
      return { key, x, y };
    });
  }, [maxRadius, center]);

  const fillColor = pillarScores
    ? (() => {
        const avg = Object.values(pillarScores).reduce((a, b) => a + b, 0) / 5;
        const c = scoreColor(avg);
        return c === "green"
          ? "rgba(39,224,166,0.4)"
          : c === "amber"
            ? "rgba(234,179,8,0.4)"
            : "rgba(239,68,68,0.4)";
      })()
    : "rgba(47,128,237,0.2)";
  const strokeColor = pillarScores
    ? (() => {
        const avg = Object.values(pillarScores).reduce((a, b) => a + b, 0) / 5;
        const c = scoreColor(avg);
        return c === "green"
          ? "rgba(39,224,166,0.9)"
          : c === "amber"
            ? "rgba(234,179,8,0.9)"
            : "rgba(239,68,68,0.9)";
      })()
    : "rgba(47,128,237,0.6)";

  return (
    <RequireAuth>
      <OSLayer>
        <div className="radarOuter">
          <nav className="radarNav">
            <div className="radarBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="radarTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="radarContainer">
            <div className="radarHeader">
              <div className="radarPhase">TACTICAL</div>
              <h1 className="radarHeadline">Performance Radar</h1>
              <p className="radarSub">Five core readiness pillars: Recovery, Structural Integrity, Strength, Aerobic Capacity, Durability.</p>
              <Link href="/tactical" className="radarBackLink">← Back to Tactical Dashboard</Link>
            </div>

            {/* View mode toggle */}
            <section className="radarSection">
              <h2 className="radarSectionTitle">View Mode</h2>
              <div className="viewToggle">
                <button
                  type="button"
                  className={`viewBtn ${viewMode === "Individual" ? "active" : ""}`}
                  onClick={() => setViewMode("Individual")}
                >
                  Individual
                </button>
                <button
                  type="button"
                  className={`viewBtn ${viewMode === "Unit" ? "active" : ""}`}
                  onClick={() => setViewMode("Unit")}
                >
                  Unit
                </button>
              </div>
            </section>

            {viewMode === "Individual" && (
              <section className="radarSection">
                <label className="radarLabel">Select ID</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="radarSelect"
                >
                  {idList.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </section>
            )}

            {/* Radar chart */}
            <section className="radarSection radarChartSection">
              <h2 className="radarSectionTitle">
                {viewMode === "Individual" ? `${selectedId} — Readiness pillars` : "Unit average — Readiness pillars"}
              </h2>
              {!pillarScores && (
                <p className="radarEmpty">No readiness data yet. Log entries on the Daily Input page.</p>
              )}
              {pillarScores && (
                <div className="radarWrap">
                  <svg
                    className="radarSvg"
                    viewBox={`0 0 ${radarSize} ${radarSize}`}
                    width={radarSize}
                    height={radarSize}
                  >
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="glowStrong">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Grid rings */}
                    {[0.25, 0.5, 0.75, 1].map((scale) => (
                      <circle
                        key={scale}
                        cx={center}
                        cy={center}
                        r={maxRadius * scale}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Axis lines */}
                    {axisLines.map((line, i) => (
                      <line
                        key={i}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Data polygon */}
                    <polygon
                      points={polygonPoints}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth="2"
                      filter="url(#glowStrong)"
                      className="radarPolygon"
                    />
                    {/* Axis labels */}
                    {axisLabelPositions.map(({ key, x, y }) => (
                      <text
                        key={key}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="radarAxisLabel"
                      >
                        {AXIS_LABELS[key]}
                      </text>
                    ))}
                    {/* Value labels at polygon vertices */}
                    {pillarScores &&
                      axisLabelPositions.map(({ key }, i) => {
                        const score = pillarScores[key];
                        const angle = (i * 360) / PILLAR_LABELS.length - 90;
                        const rad = (angle * Math.PI) / 180;
                        const r = (score / 100) * maxRadius * 0.7;
                        const x = center + r * Math.cos(rad);
                        const y = center + r * Math.sin(rad);
                        return (
                          <text
                            key={`val-${key}`}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className={`radarValueLabel value-${scoreColor(score)}`}
                          >
                            {Math.round(score)}
                          </text>
                        );
                      })}
                  </svg>
                </div>
              )}
              {pillarScores && (
                <div className="radarLegend">
                  <span className="legendItem green">Strong (70+)</span>
                  <span className="legendItem amber">Moderate (50–69)</span>
                  <span className="legendItem red">Weak (&lt;50)</span>
                </div>
              )}
            </section>
          </div>

          <style jsx>{`
            .radarOuter {
              min-height: 100vh;
              background: #08090c;
              background-image:
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(47,128,237,0.12), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(39,224,166,0.06), transparent),
                linear-gradient(180deg, #08090c 0%, #0c0e12 50%, #08090c 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .radarOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.3;
              pointer-events: none;
            }
            .radarNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 2;
            }
            .radarBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .radarTabs { display: flex; gap: 20px; flex-wrap: wrap; }
            .radarContainer { max-width: 680px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .radarHeader { margin-bottom: 32px; }
            .radarPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .radarHeadline { font-size: 26px; font-weight: 600; margin: 0 0 10px; }
            .radarSub { font-size: 14px; opacity: 0.8; margin: 0 0 14px; line-height: 1.5; }
            .radarBackLink { font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; }
            .radarBackLink:hover { text-decoration: underline; }
            .radarSection {
              margin-bottom: 28px;
              padding: 24px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.06);
              backdrop-filter: blur(8px);
            }
            .radarSectionTitle { font-size: 15px; font-weight: 600; margin: 0 0 16px; letter-spacing: 0.03em; }
            .viewToggle { display: flex; gap: 12px; }
            .viewBtn {
              padding: 12px 24px;
              font-size: 14px; font-weight: 500;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 10px;
              color: rgba(255,255,255,0.85);
              cursor: pointer;
              transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .viewBtn:hover { background: rgba(255,255,255,0.08); }
            .viewBtn.active {
              background: rgba(47,128,237,0.25);
              border-color: rgba(47,128,237,0.5);
              color: #fff;
              box-shadow: 0 0 20px rgba(47,128,237,0.25);
            }
            .radarLabel { display: block; font-size: 13px; opacity: 0.9; margin-bottom: 8px; }
            .radarSelect {
              padding: 12px 16px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(47,128,237,0.35);
              border-radius: 10px;
              color: #fff;
              font-size: 14px;
              min-width: 160px;
              box-shadow: 0 0 16px rgba(47,128,237,0.15);
            }
            .radarSelect:focus { outline: none; border-color: rgba(47,128,237,0.6); }
            .radarChartSection { text-align: center; }
            .radarEmpty { font-size: 14px; opacity: 0.75; margin: 0; }
            .radarWrap {
              display: inline-block;
              padding: 20px;
              border-radius: 16px;
              background: rgba(0,0,0,0.2);
              border: 1px solid rgba(255,255,255,0.06);
              box-shadow: 0 0 40px rgba(47,128,237,0.1), inset 0 0 30px rgba(0,0,0,0.2);
            }
            .radarSvg { display: block; }
            .radarPolygon { transition: fill 0.3s ease, stroke 0.3s ease; }
            .radarAxisLabel {
              font-size: 11px;
              fill: rgba(255,255,255,0.85);
              letter-spacing: 0.02em;
            }
            .radarValueLabel {
              font-size: 12px;
              font-weight: 700;
            }
            .radarValueLabel.value-green { fill: rgba(39,224,166,0.95); text-shadow: 0 0 10px rgba(39,224,166,0.6); }
            .radarValueLabel.value-amber { fill: rgba(234,179,8,0.95); text-shadow: 0 0 10px rgba(234,179,8,0.5); }
            .radarValueLabel.value-red { fill: rgba(239,68,68,0.95); text-shadow: 0 0 10px rgba(239,68,68,0.5); }
            .radarLegend { display: flex; justify-content: center; gap: 24px; margin-top: 20px; font-size: 12px; opacity: 0.9; }
            .legendItem.green { color: rgba(39,224,166,0.95); }
            .legendItem.amber { color: rgba(234,179,8,0.95); }
            .legendItem.red { color: rgba(239,68,68,0.95); }
            @media (max-width: 768px) {
              .radarNav { padding: 16px; }
              .radarTabs { gap: 14px; }
              .radarContainer { padding: 16px; }
              .viewToggle { flex-direction: column; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
