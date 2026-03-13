"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import { loadReadinessEntries } from "@/lib/tacticalReadinessStorage";
import { getMapDataFromEntries, type MapPoint } from "@/lib/tacticalMapData";

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

const GRID_SIZE = 420;
const PADDING = 52;
const PLOT_SIZE = GRID_SIZE - PADDING * 2;

function toX(fatigue: number) {
  return PADDING + (fatigue / 100) * PLOT_SIZE;
}
function toY(readiness: number) {
  return PADDING + (1 - readiness / 100) * PLOT_SIZE;
}

type FilterType = "all" | "highRisk" | "bottomThird";
type ViewModeType = "individual" | "full";

export default function TacticalMapPage() {
  const pathname = usePathname();
  const [entries, setEntries] = useState(loadReadinessEntries());
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewModeType>("full");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(loadReadinessEntries());
  }, []);

  const allPoints = useMemo(() => getMapDataFromEntries(entries), [entries]);

  const filteredPoints = useMemo(() => {
    if (filter === "all") return allPoints;
    if (filter === "highRisk")
      return allPoints.filter((p) => p.riskLevel === "HIGH");
    if (filter === "bottomThird") {
      const sorted = [...allPoints].sort((a, b) => a.readinessScore - b.readinessScore);
      const third = Math.max(1, Math.floor(sorted.length / 3));
      return sorted.slice(0, third);
    }
    return allPoints;
  }, [allPoints, filter]);

  const idList = useMemo(
    () => allPoints.map((p) => p.id).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10)),
    [allPoints]
  );

  const riskGlow = (p: MapPoint) => {
    if (p.readinessStatusColor === "green") return "0 0 20px rgba(39,224,166,0.6), 0 0 40px rgba(39,224,166,0.3)";
    if (p.readinessStatusColor === "amber") return "0 0 20px rgba(234,179,8,0.6), 0 0 40px rgba(234,179,8,0.3)";
    return "0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3)";
  };

  const riskStroke = (p: MapPoint) => {
    if (p.readinessStatusColor === "green") return "rgba(39,224,166,0.9)";
    if (p.readinessStatusColor === "amber") return "rgba(234,179,8,0.9)";
    return "rgba(239,68,68,0.9)";
  };

  const isDimmed = (id: string) =>
    viewMode === "individual" && focusId !== null && focusId !== id;

  const tooltipPoint = hoverId ? filteredPoints.find((p) => p.id === hoverId) : null;

  return (
    <RequireAuth>
      <OSLayer>
        <div className="mapOuter">
          <nav className="mapNav">
            <div className="mapBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="mapTabs">
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

          <div className="mapContainer">
            <div className="mapHeader">
              <div className="mapPhase">TACTICAL</div>
              <h1 className="mapHeadline">Unit Readiness Map</h1>
              <p className="mapSub">
                Performance state of all IDs. X = Fatigue load, Y = Readiness. Identify who is optimal, fatiguing, undertrained, or at risk.
              </p>
              <Link href="/tactical" className="mapBackLink">← Back to Tactical Dashboard</Link>
            </div>

            {/* Controls */}
            <section className="mapSection">
              <h2 className="mapSectionTitle">Filter</h2>
              <div className="filterRow">
                <button
                  type="button"
                  className={`filterBtn ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  All IDs
                </button>
                <button
                  type="button"
                  className={`filterBtn ${filter === "highRisk" ? "active" : ""}`}
                  onClick={() => setFilter("highRisk")}
                >
                  High Risk Only
                </button>
                <button
                  type="button"
                  className={`filterBtn ${filter === "bottomThird" ? "active" : ""}`}
                  onClick={() => setFilter("bottomThird")}
                >
                  Bottom Third
                </button>
              </div>
            </section>

            <section className="mapSection">
              <h2 className="mapSectionTitle">View Mode</h2>
              <div className="viewRow">
                <button
                  type="button"
                  className={`viewBtn ${viewMode === "individual" ? "active" : ""}`}
                  onClick={() => setViewMode("individual")}
                >
                  Individual focus
                </button>
                <button
                  type="button"
                  className={`viewBtn ${viewMode === "full" ? "active" : ""}`}
                  onClick={() => setViewMode("full")}
                >
                  Full unit
                </button>
              </div>
              {viewMode === "individual" && (
                <div className="focusSelectWrap">
                  <label className="mapLabel">Select ID</label>
                  <select
                    value={focusId ?? ""}
                    onChange={(e) => setFocusId(e.target.value || null)}
                    className="mapSelect"
                  >
                    <option value="">—</option>
                    {idList.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            {/* Grid */}
            <section className="mapSection gridSection">
              <h2 className="mapSectionTitle">Readiness grid</h2>
              <div className="gridWrap">
                <svg
                  className="gridSvg"
                  viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
                  width={GRID_SIZE}
                  height={GRID_SIZE}
                >
                  <defs>
                    <filter id="glowOptimal">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="rgba(39,224,166,0.25)" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowMonitor">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="rgba(234,179,8,0.25)" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowUndertrained">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="rgba(47,128,237,0.25)" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowHighRisk">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="rgba(239,68,68,0.25)" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  {/* Quadrant fills */}
                  <rect x={PADDING} y={PADDING} width={PLOT_SIZE / 2} height={PLOT_SIZE / 2} fill="rgba(39,224,166,0.12)" filter="url(#glowOptimal)" />
                  <rect x={PADDING + PLOT_SIZE / 2} y={PADDING} width={PLOT_SIZE / 2} height={PLOT_SIZE / 2} fill="rgba(234,179,8,0.12)" filter="url(#glowMonitor)" />
                  <rect x={PADDING} y={PADDING + PLOT_SIZE / 2} width={PLOT_SIZE / 2} height={PLOT_SIZE / 2} fill="rgba(47,128,237,0.12)" filter="url(#glowUndertrained)" />
                  <rect x={PADDING + PLOT_SIZE / 2} y={PADDING + PLOT_SIZE / 2} width={PLOT_SIZE / 2} height={PLOT_SIZE / 2} fill="rgba(239,68,68,0.12)" filter="url(#glowHighRisk)" />
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((v) => (
                    <line key={`v${v}`} x1={toX(v)} y1={PADDING} x2={toX(v)} y2={PADDING + PLOT_SIZE} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  ))}
                  {[0, 25, 50, 75, 100].map((v) => (
                    <line key={`h${v}`} x1={PADDING} y1={toY(v)} x2={PADDING + PLOT_SIZE} y2={toY(v)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  ))}
                  {/* Axis lines */}
                  <line x1={toX(50)} y1={PADDING} x2={toX(50)} y2={PADDING + PLOT_SIZE} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  <line x1={PADDING} y1={toY(50)} x2={PADDING + PLOT_SIZE} y2={toY(50)} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  {/* Quadrant labels */}
                  <text x={PADDING + PLOT_SIZE / 4} y={PADDING + PLOT_SIZE / 4 - 8} textAnchor="middle" className="quadrantLabel optimal">OPTIMAL</text>
                  <text x={PADDING + (3 * PLOT_SIZE) / 4} y={PADDING + PLOT_SIZE / 4 - 8} textAnchor="middle" className="quadrantLabel monitor">MONITOR</text>
                  <text x={PADDING + PLOT_SIZE / 4} y={PADDING + (3 * PLOT_SIZE) / 4 + 8} textAnchor="middle" className="quadrantLabel undertrained">UNDERTRAINED</text>
                  <text x={PADDING + (3 * PLOT_SIZE) / 4} y={PADDING + (3 * PLOT_SIZE) / 4 + 8} textAnchor="middle" className="quadrantLabel highrisk">HIGH RISK</text>
                  {/* Axis labels */}
                  <text x={PADDING + PLOT_SIZE / 2} y={GRID_SIZE - 12} textAnchor="middle" className="axisLabel">Fatigue Load →</text>
                  <text x={12} y={PADDING + PLOT_SIZE / 2} textAnchor="middle" className="axisLabel vertical">Readiness ↑</text>
                  {/* Dots */}
                  {filteredPoints.map((p) => {
                    const x = toX(p.fatigueScore);
                    const y = toY(p.readinessScore);
                    const dimmed = isDimmed(p.id);
                    const isHover = hoverId === p.id;
                    return (
                      <g
                        key={p.id}
                        className="dotGroup"
                        style={{ opacity: dimmed ? 0.35 : 1 }}
                        onMouseEnter={() => setHoverId(p.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r={isHover ? 14 : 11}
                          fill="rgba(0,0,0,0.4)"
                          stroke={riskStroke(p)}
                          strokeWidth={2}
                          style={{
                            filter: riskGlow(p),
                            transition: "r 0.2s ease, opacity 0.2s ease",
                            animation: "dotPulse 2.5s ease-in-out infinite",
                          }}
                        />
                        <text
                          x={x}
                          y={y + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="dotLabel"
                        >
                          {p.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {filteredPoints.length === 0 && (
                  <p className="gridEmpty">No data to display. Log entries on Daily Input.</p>
                )}
              </div>

              {/* Tooltip */}
              {tooltipPoint && (
                <div className="tooltip" style={{ position: "absolute", left: "50%", bottom: 24, transform: "translateX(-50%)" }}>
                  <div className="tooltipTitle">{tooltipPoint.id}</div>
                  <div className="tooltipRow">Readiness: {tooltipPoint.readinessScore}</div>
                  <div className="tooltipRow">Fatigue: {tooltipPoint.fatigueScore}</div>
                  <div className="tooltipRow">Risk: {tooltipPoint.riskLevel === "HIGH" ? "High" : tooltipPoint.riskLevel === "MODERATE" ? "Moderate" : "Low"}</div>
                  <div className="tooltipRow">Capacity Buffer: {tooltipPoint.capacityBuffer >= 0 ? "+" : ""}{tooltipPoint.capacityBuffer}</div>
                </div>
              )}
            </section>
          </div>

          <style jsx>{`
            .mapOuter {
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
            .mapOuter::before {
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
            .mapNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 2;
            }
            .mapBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .mapTabs { display: flex; gap: 18px; flex-wrap: wrap; }
            .mapContainer { max-width: 720px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .mapHeader { margin-bottom: 32px; }
            .mapPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .mapHeadline { font-size: 26px; font-weight: 600; margin: 0 0 10px; }
            .mapSub { font-size: 14px; opacity: 0.8; margin: 0 0 14px; line-height: 1.5; }
            .mapBackLink { font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; }
            .mapBackLink:hover { text-decoration: underline; }
            .mapSection {
              margin-bottom: 28px;
              padding: 24px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.06);
              backdrop-filter: blur(8px);
            }
            .mapSectionTitle { font-size: 15px; font-weight: 600; margin: 0 0 14px; letter-spacing: 0.03em; }
            .filterRow, .viewRow { display: flex; gap: 12px; flex-wrap: wrap; }
            .filterBtn, .viewBtn {
              padding: 10px 20px;
              font-size: 13px; font-weight: 500;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 10px;
              color: rgba(255,255,255,0.9);
              cursor: pointer;
              transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .filterBtn:hover, .viewBtn:hover { background: rgba(255,255,255,0.08); }
            .filterBtn.active, .viewBtn.active {
              background: rgba(47,128,237,0.25);
              border-color: rgba(47,128,237,0.5);
              color: #fff;
              box-shadow: 0 0 18px rgba(47,128,237,0.25);
            }
            .focusSelectWrap { margin-top: 14px; }
            .mapLabel { display: block; font-size: 13px; opacity: 0.9; margin-bottom: 6px; }
            .mapSelect {
              padding: 10px 14px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(47,128,237,0.35);
              border-radius: 10px;
              color: #fff;
              font-size: 14px;
              min-width: 140px;
            }
            .gridSection { position: relative; }
            .gridWrap {
              position: relative;
              display: inline-block;
              padding: 20px;
              background: rgba(0,0,0,0.25);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 16px;
              box-shadow: 0 0 40px rgba(47,128,237,0.08), inset 0 0 30px rgba(0,0,0,0.2);
            }
            .gridSvg { display: block; }
            .quadrantLabel { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; opacity: 0.9; }
            .quadrantLabel.optimal { fill: rgba(39,224,166,0.95); }
            .quadrantLabel.monitor { fill: rgba(234,179,8,0.95); }
            .quadrantLabel.undertrained { fill: rgba(47,128,237,0.95); }
            .quadrantLabel.highrisk { fill: rgba(239,68,68,0.95); }
            .axisLabel { font-size: 11px; fill: rgba(255,255,255,0.7); }
            .axisLabel.vertical { transform: rotate(-90deg); transform-origin: center; }
            .dotLabel { font-size: 9px; font-weight: 700; fill: #fff; pointer-events: none; }
            .dotGroup { cursor: pointer; }
            .gridEmpty { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 14px; opacity: 0.75; margin: 0; }
            .tooltip {
              padding: 14px 20px;
              background: rgba(12,14,18,0.95);
              border: 1px solid rgba(47,128,237,0.4);
              border-radius: 12px;
              box-shadow: 0 0 30px rgba(47,128,237,0.2);
              min-width: 200px;
              animation: tooltipIn 0.2s ease;
            }
            .tooltipTitle { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
            .tooltipRow { font-size: 13px; opacity: 0.9; margin-bottom: 4px; }
            .tooltipRow:last-child { margin-bottom: 0; }
            @keyframes tooltipIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            @keyframes dotPulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.85; }
            }
            @media (max-width: 768px) {
              .mapNav { padding: 16px; }
              .mapTabs { gap: 12px; }
              .mapContainer { padding: 16px; }
              .filterRow, .viewRow { flex-direction: column; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
