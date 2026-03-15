"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import { supabase } from "@/lib/supabaseClient";
import OSLayer from "@/app/components/OSLayer";
import GoalInputCard from "@/app/components/GoalInputCard";
import RoadmapTimeline from "@/app/components/RoadmapTimeline";
import GoalProjectionChart from "@/app/components/GoalProjectionChart";
import StrategyKPIPanel from "@/app/components/StrategyKPIPanel";
import InjuryStatusPanel from "@/app/components/InjuryStatusPanel";
import StrategyAdjustmentsPanel from "@/app/components/StrategyAdjustmentsPanel";
import MilestoneUpdateModal from "@/app/components/MilestoneUpdateModal";
import {
  calculateExecutionProbability,
  calculateExecutionProbabilityDynamic,
  type GoalRoadmapResult,
  type CurrentBenchmarks,
} from "@/lib/goalEngine";
import type { Phase } from "@/lib/goalEngine";
import type { PerformanceBenchmarks } from "@/lib/profile/benchmarkSchema";
import type { StrategyGoal, InjuryStatus } from "@/lib/strategyStore";
import { PerformanceEngine } from "@/lib/performanceEngine";
import { subscribe as subscribePerformance } from "@/lib/performanceEvents";

function phasePillColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("accumulation") || n.includes("foundation")) return "#0A84FF";
  if (n.includes("intensification") || n.includes("build")) return "#7B61FF";
  if (n.includes("overreach") || n.includes("peak")) return "#f59e0b";
  if (n.includes("deload") || n.includes("taper") || n.includes("consolidate")) return "#00c9a0";
  return "rgba(238,240,244,0.4)";
}

function profileToCurrentBenchmarks(pb: PerformanceBenchmarks | null | undefined): CurrentBenchmarks | null {
  if (!pb?.exerciseBenchmarks) return null;
  const eb = pb.exerciseBenchmarks;
  const num = (key: string): number | null => {
    const b = eb[key];
    if (!b) return null;
    const v = b.oneRM ?? b.estimatedOneRM ?? null;
    return v != null && v > 0 ? v : null;
  };
  const twoMile = pb.aerobicBenchmarks?.two_mile_time ?? null;
  return {
    back_squat: num("back_squat"),
    bench_press: num("bench_press"),
    deadlift: num("deadlift"),
    overhead_press: num("overhead_press"),
    two_mile_time_sec: twoMile,
  };
}

function NavTab({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={active ? "active" : undefined}
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

export default function StrategyPage() {
  const pathname = usePathname();
  const [goals, setGoals] = useState<StrategyGoal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentBenchmarks, setCurrentBenchmarks] = useState<CurrentBenchmarks | null>(null);
  const [milestoneModalMilestone, setMilestoneModalMilestone] = useState<{ id: string; label: string; week: number; targetValue: number } | null>(null);

  useEffect(() => {
    setGoals(PerformanceEngine.getGoals());
    const unsub = subscribePerformance("stateRecalculated", () => {
      setGoals(PerformanceEngine.getGoals());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (goals.length > 0 && !selectedId) setSelectedId(goals[0].id);
    if (goals.length === 0) setSelectedId(null);
    if (selectedId && !goals.some((g) => g.id === selectedId)) setSelectedId(goals[0]?.id ?? null);
  }, [goals, selectedId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("performance_benchmarks")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setCurrentBenchmarks(profileToCurrentBenchmarks(data?.performance_benchmarks ?? null));
    })();
    return () => { cancelled = true; };
  }, []);

  const addGoal = useCallback((result: GoalRoadmapResult) => {
    const title = result.goalTitle || "My goal";
    const category = result.kpis.length ? "Custom" : "Custom";
    const added = PerformanceEngine.addGoal({
      title,
      category,
      deadline: result.deadline,
      roadmap: result,
      goalDetails: result.goalDetails,
    });
    setGoals(PerformanceEngine.getGoals());
    setSelectedId(added.id);
  }, []);

  const removeGoal = useCallback((id: string) => {
    const next = PerformanceEngine.removeGoal(id);
    setGoals(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }, [selectedId]);

  const selected = goals.find((g) => g.id === selectedId);

  const executionLegacy = selected
    ? calculateExecutionProbability(
        selected.roadmap.totalWeeks,
        selected.roadmap.priority,
        (selected.roadmap.constraints || "").length,
        selected.roadmap.kpis
      )
    : null;

  const execution = selected
    ? calculateExecutionProbabilityDynamic(
        selected.roadmap.totalWeeks,
        selected.roadmap.priority,
        (selected.roadmap.constraints || "").length,
        selected.roadmap.kpis,
        {
          injuryActive: selected.injuryStatus?.active,
          injurySeverity: selected.injuryStatus?.severity,
          milestoneDeviations: selected.milestoneProgress?.map((m) => m.deviation ?? 0).filter((d) => d !== 0),
          eventDistanceKm: selected.eventDistance,
        }
      )
    : null;

  const riskHeat = selected?.roadmap.weeklyTargets?.slice(0, selected.roadmap.totalWeeks).map((_, i) => {
    if (selected.injuryStatus?.active && (i + 1) % 4 === 0) return "red" as const;
    const kpiRisk = selected.roadmap.kpis[0]?.risk;
    if (kpiRisk === "red") return "red" as const;
    if (kpiRisk === "amber") return "amber" as const;
    return "green" as const;
  });

  const handleInjuryChange = useCallback(
    (status: InjuryStatus | null) => {
      if (!selectedId) return;
      PerformanceEngine.updateGoal(selectedId, { injuryStatus: status ?? undefined });
      setGoals(PerformanceEngine.getGoals());
    },
    [selectedId]
  );

  const handleMilestoneSave = useCallback(
    (milestoneId: string, actualValue: number, notes: string) => {
      if (!selected || !milestoneModalMilestone) return;
      const milestone = selected.roadmap.milestones.find((m) => m.id === milestoneId);
      if (!milestone) return;
      const primaryKpi = selected.roadmap.kpis[0];
      if (!primaryKpi) return;
      const targetAtMilestone =
        (primaryKpi.currentValue ?? primaryKpi.targetValue - primaryKpi.ratePerWeek * selected.roadmap.totalWeeks) +
        (primaryKpi.targetValue - (primaryKpi.currentValue ?? primaryKpi.targetValue - primaryKpi.ratePerWeek * selected.roadmap.totalWeeks)) *
          (milestone.week / selected.roadmap.totalWeeks);
      const deviation = targetAtMilestone !== 0 ? ((actualValue - targetAtMilestone) / targetAtMilestone) * 100 : 0;
      const existing = selected.milestoneProgress ?? [];
      const next = existing.filter((m) => m.milestoneId !== milestoneId);
      next.push({ milestoneId, completed: Math.abs(deviation) <= 5, actualValue, deviation });
      if (selectedId != null) PerformanceEngine.updateMilestone(selectedId, next);
      setGoals(PerformanceEngine.getGoals());
      setMilestoneModalMilestone(null);
    },
    [selected, selectedId, milestoneModalMilestone]
  );

  const getPhaseForWeek = useCallback((week: number, phases: Phase[]): Phase | undefined => {
    return phases.find((p) => week >= p.startWeek && week <= p.endWeek);
  }, []);

  return (
    <RequireAuth>
      <OSLayer>
        <div className="strategy-page">
          <nav className="strategy-nav">
            <div className="strategy-brand">PERFORMANCE PATHFINDER OS</div>
            <div className="strategy-tabs">
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

          <div className="strategy-container">
            <div className="strategy-card strategy-header-card">
              <div className="strategy-section-label">STRATEGY</div>
              <h1 className="strategy-headline">Strategy Roadmap</h1>
              <p className="strategy-sub">Turn intent into execution.</p>
            </div>

            <div className="strategy-card strategy-goal-bar">
              <div className="strategy-goal-pills">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`strategy-goal-pill ${g.id === selectedId ? "active" : ""}`}
                    onClick={() => setSelectedId(g.id)}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
              <div className="strategy-goal-actions">
                <a href="#strategy-goal-form" className="strategy-goal-btn strategy-goal-btn-add">
                  Add Goal
                </a>
                {selectedId && (
                  <button
                    type="button"
                    className="strategy-goal-btn strategy-goal-btn-remove"
                    onClick={() => removeGoal(selectedId)}
                    aria-label="Remove goal"
                  >
                    Remove Goal
                  </button>
                )}
              </div>
            </div>

            {selected && (
              <>
                {selected.roadmap.phases?.length > 0 && (
                  <div className="strategy-card strategy-phase-pills-wrap">
                    <div className="strategy-section-label">PHASES</div>
                    <div className="strategy-phase-pills">
                      {selected.roadmap.phases.map((p) => (
                        <span
                          key={p.id}
                          className="strategy-phase-pill"
                          style={{
                            background: `${phasePillColor(p.name)}22`,
                            borderColor: phasePillColor(p.name),
                            color: phasePillColor(p.name),
                          }}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="strategy-card strategy-execution-card">
                  <div className="strategy-section-label">EXECUTION</div>
                  <div className="strategy-execution-inner">
                    <div className="strategy-execution-percent">{execution?.score ?? executionLegacy?.percentage ?? 0}%</div>
                    <div className="strategy-execution-confidence">
                      {(execution?.confidenceBand ?? executionLegacy?.band ?? "medium").toUpperCase()} CONFIDENCE
                    </div>
                    {execution?.riskDrivers?.length ? (
                      <ul className="strategy-execution-risk-drivers">
                        {execution.riskDrivers.slice(0, 3).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>

                {selected.roadmap.kpis.length > 0 && (
                  <div className="strategy-card strategy-chart-wrap">
                    <div className="strategy-section-label">PROJECTION</div>
                    <div className="strategy-chart-scroll">
                      <GoalProjectionChart
                        totalWeeks={selected.roadmap.totalWeeks}
                        phases={selected.roadmap.phases}
                        milestones={selected.roadmap.milestones}
                        primaryKpi={selected.roadmap.kpis[0]}
                        milestoneProgress={selected.milestoneProgress}
                      />
                    </div>
                  </div>
                )}

                <div className="strategy-card">
                  <div className="strategy-section-label">ROADMAP</div>
                  <RoadmapTimeline
                    phases={selected.roadmap.phases}
                    milestones={selected.roadmap.milestones}
                    totalWeeks={selected.roadmap.totalWeeks}
                    progressPercent={0}
                    riskHeat={riskHeat}
                  />
                </div>

                <div className="strategy-card strategy-week-timeline-wrap">
                  <div className="strategy-section-label">WEEK-BY-WEEK</div>
                  <div className="strategy-week-timeline">
                    {Array.from({ length: selected.roadmap.totalWeeks }, (_, i) => i + 1).map((week) => {
                      const phase = getPhaseForWeek(week, selected.roadmap.phases);
                      const wt = selected.roadmap.weeklyTargets?.find((t) => t.week === week);
                      const color = phase ? phasePillColor(phase.name) : "rgba(238,240,244,0.25)";
                      return (
                        <div key={week} className="strategy-week-item">
                          <div className="strategy-week-line-dot" style={{ background: color }} />
                          <div className="strategy-week-card">
                            <div className="strategy-week-card-header">
                              <span className="strategy-week-number">Week {week}</span>
                              {phase && (
                                <span
                                  className="strategy-week-phase-pill"
                                  style={{
                                    background: `${color}22`,
                                    borderColor: color,
                                    color,
                                  }}
                                >
                                  {phase.name}
                                </span>
                              )}
                            </div>
                            {wt && (
                              <div className="strategy-week-card-focus">
                                {wt.focus}
                                {wt.targetValue != null && wt.unit && (
                                  <span className="strategy-week-target"> — {wt.targetValue} {wt.unit}</span>
                                )}
                                {wt.volumeKm != null && (
                                  <span className="strategy-week-target"> — {wt.volumeKm} km</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="strategy-card">
                  <StrategyAdjustmentsPanel goal={selected} execution={execution ?? null} />
                </div>

                <div className="strategy-card">
                  <InjuryStatusPanel
                    injuryStatus={selected.injuryStatus ?? null}
                    onChange={handleInjuryChange}
                  />
                </div>

                <div className="strategy-card strategy-milestone-controls">
                  <div className="strategy-section-label">MILESTONE UPDATES</div>
                  <p className="strategy-milestone-sub">Record actual performance to track deviation.</p>
                  <div className="strategy-milestone-buttons">
                    {selected.roadmap.milestones.map((m) => {
                      const targetVal =
                        selected.roadmap.kpis[0] &&
                        (selected.roadmap.kpis[0].currentValue ??
                          selected.roadmap.kpis[0].targetValue -
                            selected.roadmap.kpis[0].ratePerWeek * selected.roadmap.totalWeeks) +
                          (selected.roadmap.kpis[0].targetValue -
                            (selected.roadmap.kpis[0].currentValue ??
                              selected.roadmap.kpis[0].targetValue -
                                selected.roadmap.kpis[0].ratePerWeek * selected.roadmap.totalWeeks)) *
                            (m.week / selected.roadmap.totalWeeks);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className="strategy-milestone-btn"
                          onClick={() =>
                            setMilestoneModalMilestone({
                              id: m.id,
                              label: m.label,
                              week: m.week,
                              targetValue: targetVal,
                            })
                          }
                        >
                          {m.label} — W{m.week}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="strategy-card">
                  <StrategyKPIPanel kpis={selected.roadmap.kpis} />
                </div>
              </>
            )}

            {milestoneModalMilestone && selected && selected.roadmap.kpis[0] && (
              <MilestoneUpdateModal
                milestone={selected.roadmap.milestones.find((m) => m.id === milestoneModalMilestone.id) ?? null}
                primaryUnit={selected.roadmap.kpis[0].unit}
                isTimeMetric={selected.roadmap.kpis[0].unit === "sec"}
                existingProgress={selected.milestoneProgress?.find((p) => p.milestoneId === milestoneModalMilestone.id)}
                onSave={(actualValue, notes) => handleMilestoneSave(milestoneModalMilestone.id, actualValue, notes)}
                onClose={() => setMilestoneModalMilestone(null)}
              />
            )}

            <div id="strategy-goal-form" className="strategy-card strategy-section-form">
              <GoalInputCard onGenerate={addGoal} currentBenchmarks={currentBenchmarks} />
            </div>
          </div>

          <style jsx>{`
            .strategy-page {
              min-height: 100vh;
              background: #0a0a0f;
              color: rgba(238,240,244,0.95);
              position: relative;
              overflow-x: hidden;
            }
            .strategy-nav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 16px 20px;
              border-bottom: 1px solid rgba(255,255,255,0.07);
              gap: 12px;
              flex-wrap: wrap;
            }
            .strategy-brand {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: rgba(238,240,244,0.25);
            }
            .strategy-tabs {
              display: flex;
              gap: 16px;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              padding-bottom: 4px;
            }
            .strategy-container {
              max-width: 860px;
              margin: 0 auto;
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .strategy-card {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.07);
              border-radius: 20px;
              padding: 20px;
            }
            .strategy-section-label {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: rgba(238,240,244,0.25);
              margin-bottom: 12px;
            }
            .strategy-header-card .strategy-headline {
              font-size: 22px;
              font-weight: 700;
              color: rgba(238,240,244,0.95);
              margin: 0 0 6px;
            }
            .strategy-header-card .strategy-sub {
              font-size: 14px;
              color: rgba(238,240,244,0.55);
              margin: 0;
              line-height: 1.5;
            }
            .strategy-goal-bar {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            }
            .strategy-goal-pills {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .strategy-goal-pill {
              padding: 10px 16px;
              font-size: 13px;
              font-weight: 500;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.07);
              border-radius: 999px;
              color: rgba(238,240,244,0.95);
              cursor: pointer;
              transition: background 0.2s, border-color 0.2s;
            }
            .strategy-goal-pill:hover {
              background: rgba(255,255,255,0.08);
              border-color: rgba(0,201,160,0.3);
            }
            .strategy-goal-pill.active {
              background: rgba(0,201,160,0.12);
              border-color: rgba(0,201,160,0.4);
              color: #fff;
            }
            .strategy-goal-actions {
              display: flex;
              gap: 8px;
            }
            .strategy-goal-btn {
              padding: 10px 14px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              border-radius: 10px;
              cursor: pointer;
              text-decoration: none;
              transition: opacity 0.2s;
            }
            .strategy-goal-btn-add {
              background: rgba(0,201,160,0.15);
              border: 1px solid rgba(0,201,160,0.35);
              color: rgba(0,201,160,0.95);
            }
            .strategy-goal-btn-remove {
              background: transparent;
              border: 1px solid rgba(255,255,255,0.12);
              color: rgba(238,240,244,0.55);
            }
            .strategy-goal-btn-remove:hover {
              border-color: rgba(239,68,68,0.4);
              color: rgba(254,202,202,0.95);
            }
            .strategy-phase-pills-wrap {
              padding-top: 16px;
            }
            .strategy-phase-pills {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .strategy-phase-pill {
              display: inline-block;
              padding: 6px 12px;
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.04em;
              border-radius: 999px;
              border: 1px solid;
            }
            .strategy-execution-card .strategy-execution-inner {
              position: relative;
              padding: 20px;
              background: rgba(255,255,255,0.02);
              border-radius: 12px;
              text-align: center;
            }
            .strategy-execution-percent {
              font-size: 32px;
              font-weight: 700;
              color: rgba(238,240,244,0.95);
              line-height: 1.1;
            }
            .strategy-execution-confidence {
              margin-top: 8px;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: rgba(238,240,244,0.55);
            }
            .strategy-execution-risk-drivers {
              margin: 12px 0 0;
              padding-left: 18px;
              font-size: 11px;
              color: rgba(238,240,244,0.55);
              line-height: 1.5;
            }
            .strategy-chart-wrap {
              overflow: hidden;
            }
            .strategy-chart-scroll {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              max-width: 100%;
              min-width: 0;
            }
            .strategy-week-timeline-wrap {
              padding-left: 8px;
            }
            .strategy-week-timeline {
              position: relative;
              padding-left: 20px;
              border-left: 3px solid #00c9a0;
            }
            .strategy-week-item {
              position: relative;
              padding-bottom: 12px;
            }
            .strategy-week-item:last-child {
              padding-bottom: 0;
            }
            .strategy-week-line-dot {
              position: absolute;
              left: -26px;
              top: 10px;
              width: 10px;
              height: 10px;
              border-radius: 50%;
            }
            .strategy-week-card {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.07);
              border-radius: 12px;
              padding: 12px 14px;
              margin-left: 0;
            }
            .strategy-week-card-header {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }
            .strategy-week-number {
              font-size: 14px;
              font-weight: 700;
              color: rgba(238,240,244,0.95);
            }
            .strategy-week-phase-pill {
              font-size: 10px;
              font-weight: 600;
              letter-spacing: 0.04em;
              padding: 4px 8px;
              border-radius: 999px;
              border: 1px solid;
            }
            .strategy-week-card-focus {
              font-size: 12px;
              color: rgba(238,240,244,0.55);
              margin-top: 6px;
              line-height: 1.4;
            }
            .strategy-week-target {
              color: rgba(238,240,244,0.4);
            }
            .strategy-milestone-sub {
              font-size: 12px;
              color: rgba(238,240,244,0.55);
              margin: 0 0 12px;
              line-height: 1.4;
            }
            .strategy-milestone-buttons {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .strategy-milestone-btn {
              padding: 10px 14px;
              font-size: 12px;
              font-weight: 500;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.07);
              border-radius: 10px;
              color: rgba(238,240,244,0.95);
              cursor: pointer;
              transition: border-color 0.2s, background 0.2s;
            }
            .strategy-milestone-btn:hover {
              border-color: rgba(0,201,160,0.35);
              background: rgba(0,201,160,0.06);
            }
            @media (max-width: 375px) {
              .strategy-container { padding: 12px; }
              .strategy-card { padding: 16px; }
              .strategy-nav { padding: 12px; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
