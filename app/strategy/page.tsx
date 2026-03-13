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
import type { PerformanceBenchmarks } from "@/lib/profile/benchmarkSchema";
import {
  loadStrategyGoals,
  addStrategyGoal,
  removeStrategyGoal,
  updateStrategyGoal,
  type StrategyGoal,
  type InjuryStatus,
  type MilestoneProgressEntry,
} from "@/lib/strategyStore";
import { PerformanceEngine } from "@/lib/performanceEngine";
import { subscribe as subscribePerformance } from "@/lib/performanceEvents";

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
      PerformanceEngine.updateMilestone(selectedId, next);
      setGoals(PerformanceEngine.getGoals());
      setMilestoneModalMilestone(null);
    },
    [selected, selectedId, milestoneModalMilestone]
  );

  return (
    <RequireAuth>
      <OSLayer>
        <div className="strategyOuter">
          <nav className="strategyNav">
            <div className="strategyBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="strategyTabs">
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

          <div className="strategyContainer">
            <div className="strategyHeaderRow">
              <div className="strategyHeader">
                <div className="strategyPhase">STRATEGY</div>
                <h1 className="strategyHeadline">Strategy Roadmap</h1>
                <p className="strategySub">Turn intent into execution.</p>
              </div>
            </div>

            <div className="strategyGoalBar">
              <div className="strategyGoalPills">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`strategyGoalPill ${g.id === selectedId ? "active" : ""}`}
                    onClick={() => setSelectedId(g.id)}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
              <div className="strategyGoalActions">
                <a href="#strategy-goal-form" className="strategyGoalBtn strategyGoalBtnAdd">
                  Add Goal
                </a>
                {selectedId && (
                  <button
                    type="button"
                    className="strategyGoalBtn strategyGoalBtnRemove"
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
                <div className="strategySection strategySectionExecution">
                  <div className="strategyExecutionCard">
                    <div className="strategyExecutionGlow" />
                    <div className="strategyExecutionPercent">{execution?.score ?? executionLegacy?.percentage ?? 0}%</div>
                    <div className="strategyExecutionConfidence">
                      {(execution?.confidenceBand ?? executionLegacy?.band ?? "medium").toUpperCase()} CONFIDENCE
                    </div>
                    {execution?.riskDrivers?.length ? (
                      <ul className="strategyExecutionRiskDrivers">
                        {execution.riskDrivers.slice(0, 3).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>

                {selected.roadmap.kpis.length > 0 && (
                  <div className="strategySection">
                    <GoalProjectionChart
                      totalWeeks={selected.roadmap.totalWeeks}
                      phases={selected.roadmap.phases}
                      milestones={selected.roadmap.milestones}
                      primaryKpi={selected.roadmap.kpis[0]}
                      milestoneProgress={selected.milestoneProgress}
                    />
                  </div>
                )}

                <div className="strategySection">
                  <RoadmapTimeline
                    phases={selected.roadmap.phases}
                    milestones={selected.roadmap.milestones}
                    totalWeeks={selected.roadmap.totalWeeks}
                    progressPercent={0}
                    riskHeat={riskHeat}
                  />
                </div>

                <div className="strategySection">
                  <StrategyAdjustmentsPanel goal={selected} execution={execution ?? null} />
                </div>

                <div className="strategySection">
                  <InjuryStatusPanel
                    injuryStatus={selected.injuryStatus ?? null}
                    onChange={handleInjuryChange}
                  />
                </div>

                <div className="strategySection strategyMilestoneControls">
                  <h3 className="strategyMilestoneControlsTitle">Milestone updates</h3>
                  <p className="strategyMilestoneControlsSub">Record actual performance to track deviation.</p>
                  <div className="strategyMilestoneButtons">
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
                          className="strategyMilestoneBtn"
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

                <div className="strategySection">
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

            <div id="strategy-goal-form" className="strategySection strategySectionForm">
              <GoalInputCard onGenerate={addGoal} currentBenchmarks={currentBenchmarks} />
            </div>
          </div>

          <style jsx>{`
            .strategyOuter {
              min-height: 100vh;
              background:
                radial-gradient(circle at 20% 10%, rgba(47,128,237,0.12), transparent 40%),
                radial-gradient(circle at 80% 90%, rgba(39,224,166,0.08), transparent 40%),
                linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .strategyOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.4;
              pointer-events: none;
            }
            .strategyNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .strategyBrand {
              font-size: 12px;
              letter-spacing: 2px;
              opacity: 0.6;
            }
            .strategyTabs {
              display: flex;
              gap: 30px;
            }
            .strategyContainer {
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px;
              position: relative;
              z-index: 1;
            }
            .strategyHeaderRow {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              margin-bottom: 48px;
              flex-wrap: wrap;
            }
            .strategyHeader {
              margin-bottom: 0;
            }
            .strategyPhase {
              font-size: 11px;
              letter-spacing: 0.12em;
              opacity: 0.6;
              margin-bottom: 8px;
            }
            .strategyHeadline {
              font-size: 28px;
              font-weight: 600;
              margin: 0 0 12px;
            }
            .strategySub {
              font-size: 15px;
              opacity: 0.8;
              margin: 0;
              line-height: 1.5;
            }
            .strategyGoalBar {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 48px;
            }
            .strategyGoalPills {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .strategyGoalPill {
              padding: 10px 18px;
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.03em;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 999px;
              color: rgba(255, 255, 255, 0.8);
              cursor: pointer;
              transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
            }
            .strategyGoalPill:hover {
              background: rgba(255, 255, 255, 0.08);
              border-color: rgba(39, 224, 166, 0.25);
              box-shadow: 0 0 20px rgba(39, 224, 166, 0.15);
            }
            .strategyGoalPill.active {
              background: rgba(39, 224, 166, 0.12);
              border-color: rgba(39, 224, 166, 0.4);
              color: #fff;
              box-shadow: 0 0 24px rgba(39, 224, 166, 0.25);
            }
            .strategyGoalActions {
              display: flex;
              gap: 10px;
            }
            .strategyGoalBtn {
              padding: 8px 14px;
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              border-radius: 8px;
              cursor: pointer;
              transition: opacity 0.2s ease, box-shadow 0.2s ease;
              text-decoration: none;
              color: inherit;
            }
            .strategyGoalBtnAdd {
              background: rgba(39, 224, 166, 0.15);
              border: 1px solid rgba(39, 224, 166, 0.35);
              color: rgba(39, 224, 166, 0.95);
            }
            .strategyGoalBtnAdd:hover {
              box-shadow: 0 0 20px rgba(39, 224, 166, 0.25);
            }
            .strategyGoalBtnRemove {
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.15);
              color: rgba(255, 255, 255, 0.7);
            }
            .strategyGoalBtnRemove:hover {
              border-color: rgba(239, 68, 68, 0.4);
              color: rgba(254, 202, 202, 0.95);
            }
            .strategySection {
              margin-bottom: 48px;
            }
            .strategySectionForm {
              margin-bottom: 0;
            }
            .strategySectionExecution {
              display: flex;
              justify-content: flex-start;
            }
            .strategyExecutionCard {
              position: relative;
              width: 120px;
              padding: 24px 28px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: 12px;
              text-align: center;
              box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
            }
            .strategyExecutionGlow {
              position: absolute;
              inset: -20px;
              background: radial-gradient(circle, rgba(39, 224, 166, 0.12) 0%, transparent 70%);
              border-radius: 50%;
              pointer-events: none;
              animation: strategyExecutionPulse 3s ease-in-out infinite;
            }
            .strategyExecutionPercent {
              position: relative;
              font-size: 36px;
              font-weight: 700;
              letter-spacing: -0.02em;
              color: #fff;
              line-height: 1.1;
            }
            .strategyExecutionConfidence {
              position: relative;
              margin-top: 8px;
              font-size: 9px;
              font-weight: 600;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              opacity: 0.65;
            }
            .strategyExecutionRiskDrivers {
              position: relative;
              margin: 12px 0 0;
              padding-left: 14px;
              font-size: 9px;
              opacity: 0.7;
              line-height: 1.4;
            }
            .strategyMilestoneControlsTitle {
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 0.04em;
              margin: 0 0 6px;
              color: #fff;
            }
            .strategyMilestoneControlsSub {
              font-size: 11px;
              opacity: 0.65;
              margin: 0 0 14px;
              line-height: 1.4;
            }
            .strategyMilestoneButtons {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .strategyMilestoneBtn {
              padding: 8px 14px;
              font-size: 11px;
              font-weight: 500;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              color: rgba(255, 255, 255, 0.9);
              cursor: pointer;
              transition: box-shadow 0.2s ease, border-color 0.2s ease;
            }
            .strategyMilestoneBtn:hover {
              border-color: rgba(39, 224, 166, 0.35);
              box-shadow: 0 0 16px rgba(39, 224, 166, 0.12);
            }
            @keyframes strategyExecutionPulse {
              0%, 100% { opacity: 0.6; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
            @media (max-width: 768px) {
              .strategyNav { padding: 16px; flex-wrap: wrap; gap: 12px; }
              .strategyTabs { gap: 16px; flex-wrap: wrap; }
              .strategyContainer { padding: 16px; }
              .strategyHeaderRow { margin-bottom: 32px; }
              .strategyGoalBar { margin-bottom: 32px; }
              .strategySection { margin-bottom: 32px; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
