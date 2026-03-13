"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import NutritionMacroChart from "@/app/components/NutritionMacroChart";
import type { MacroDay } from "@/app/components/NutritionMacroChart";
import MacroSummaryCards from "@/app/components/MacroSummaryCards";
import type { MacroSummary } from "@/app/components/MacroSummaryCards";
import FuelStrategyTool from "@/app/components/FuelStrategyTool";
import LogMacrosModal from "@/app/components/LogMacrosModal";
import BodyCompositionModal from "@/app/components/BodyCompositionModal";
import { getMacroLogs } from "@/lib/nutritionStore";
import { getBodyComposition } from "@/lib/nutritionStore";
import { PerformanceEngine } from "@/lib/performanceEngine";
import { subscribe as subscribePerformance } from "@/lib/performanceEvents";

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

function mockMacroSummaries(): MacroSummary[] {
  const last7 = { protein: 82, carbs: 280, fats: 58, calories: 1920 };
  const prev7 = { protein: 78, carbs: 260, fats: 62, calories: 1880 };
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
  return [
    { label: "Protein", sevenDayAvg: last7.protein, percentChangeVsPrevious7: pct(last7.protein, prev7.protein), unit: "g" },
    { label: "Carbs", sevenDayAvg: last7.carbs, percentChangeVsPrevious7: pct(last7.carbs, prev7.carbs), unit: "g" },
    { label: "Fats", sevenDayAvg: last7.fats, percentChangeVsPrevious7: pct(last7.fats, prev7.fats), unit: "g" },
    { label: "Calories", sevenDayAvg: last7.calories, percentChangeVsPrevious7: pct(last7.calories, prev7.calories), unit: "kcal" },
  ];
}

function buildChartDataFromLogs(logs: { date: string; protein: number; carbs: number; fats: number; calories: number }[]): MacroDay[] {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const out: MacroDay[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const log = byDate.get(dateStr);
    out.push(
      log
        ? { date: dateStr, protein: log.protein, carbs: log.carbs, fats: log.fats, calories: log.calories }
        : { date: dateStr, protein: 0, carbs: 0, fats: 0, calories: 0 }
    );
  }
  return out;
}

export default function NutritionPage() {
  const pathname = usePathname();
  const [showMacroModal, setShowMacroModal] = useState(false);
  const [showBodyCompModal, setShowBodyCompModal] = useState(false);
  const [macroLogs, setMacroLogs] = useState<ReturnType<typeof getMacroLogs>>([]);
  const [bodyComposition, setBodyComposition] = useState<ReturnType<typeof getBodyComposition>>(null);

  const refreshMacroLogs = useCallback(() => {
    setMacroLogs(getMacroLogs());
    PerformanceEngine.updateNutrition({ macroLogs: getMacroLogs() });
  }, []);
  const refreshBodyComposition = useCallback(() => {
    setBodyComposition(getBodyComposition());
    PerformanceEngine.updateNutrition({ bodyComposition: getBodyComposition() });
  }, []);

  const [strategicInsights, setStrategicInsights] = useState<string[]>([]);

  useEffect(() => {
    refreshMacroLogs();
    refreshBodyComposition();
  }, [refreshMacroLogs, refreshBodyComposition]);

  useEffect(() => {
    setStrategicInsights(PerformanceEngine.getStrategicInsights());
    const unsub = subscribePerformance("stateRecalculated", () => {
      setStrategicInsights(PerformanceEngine.getStrategicInsights());
    });
    return () => unsub();
  }, []);

  const chartData = useMemo(() => buildChartDataFromLogs(macroLogs), [macroLogs]);

  const macroSummariesResolved = useMemo(() => {
    const sorted = [...macroLogs].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 14) return mockMacroSummaries();
    const last7 = sorted.slice(-7);
    const prev7 = sorted.slice(-14, -7);
    const avg = (arr: typeof last7, key: keyof typeof last7[0]) =>
      arr.reduce((s, d) => s + d[key], 0) / arr.length;
    const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
    return [
      { label: "Protein", sevenDayAvg: Math.round(avg(last7, "protein")), percentChangeVsPrevious7: pct(avg(last7, "protein"), avg(prev7, "protein")), unit: "g" },
      { label: "Carbs", sevenDayAvg: Math.round(avg(last7, "carbs")), percentChangeVsPrevious7: pct(avg(last7, "carbs"), avg(prev7, "carbs")), unit: "g" },
      { label: "Fats", sevenDayAvg: Math.round(avg(last7, "fats")), percentChangeVsPrevious7: pct(avg(last7, "fats"), avg(prev7, "fats")), unit: "g" },
      { label: "Calories", sevenDayAvg: Math.round(avg(last7, "calories")), percentChangeVsPrevious7: pct(avg(last7, "calories"), avg(prev7, "calories")), unit: "kcal" },
    ];
  }, [macroLogs]);

  return (
    <RequireAuth>
      <OSLayer>
        <div className="nutritionOuter">
          <nav className="nutritionNav">
            <div className="nutritionBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="nutritionTabs">
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

          <div className="nutritionContainer">
            <div className="nutritionHeader">
              <div className="nutritionPhase">NUTRITION</div>
              <h1 className="nutritionHeadline">Fuel strategy</h1>
              <p className="nutritionSub">
                Adaptive fuelling from training demand, readiness, and recovery. No meal logging — targets and reasoning only.
              </p>
            </div>
            {strategicInsights.length > 0 && (
              <div className="nutritionInsightsBanner" style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(47, 128, 237, 0.08)", border: "1px solid rgba(47, 128, 237, 0.2)", borderRadius: 12, fontSize: 12 }}>
                <strong style={{ letterSpacing: "0.04em" }}>Performance insights</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {strategicInsights.map((s, i) => (
                    <li key={i} style={{ marginTop: 2 }}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="nutritionPlaceholder">
              <p className="nutritionPlaceholderText">Weekly overview and daily strategies will appear here.</p>
              <div className="nutritionPlaceholderButtons">
                <button type="button" className="nutritionLogMacrosBtn nutritionBodyCompBtn" onClick={() => setShowBodyCompModal(true)} aria-label="Update body composition">
                  <span className="nutritionLogMacrosOrb" aria-hidden />
                  <span className="nutritionLogMacrosText">
                    <span className="nutritionLogMacrosLabel">Update body composition</span>
                    <span className="nutritionLogMacrosSub">Weight, body fat, muscle mass</span>
                  </span>
                </button>
                <button type="button" className="nutritionLogMacrosBtn" onClick={() => setShowMacroModal(true)} aria-label="Log macros">
                  <span className="nutritionLogMacrosOrb" aria-hidden />
                  <span className="nutritionLogMacrosText">
                    <span className="nutritionLogMacrosLabel">Log macros</span>
                    <span className="nutritionLogMacrosSub">Add today&apos;s intake</span>
                  </span>
                </button>
              </div>
            </div>
            <LogMacrosModal isOpen={showMacroModal} onClose={() => setShowMacroModal(false)} onSaved={refreshMacroLogs} />
            <BodyCompositionModal isOpen={showBodyCompModal} onClose={() => setShowBodyCompModal(false)} onSaved={refreshBodyComposition} />
            <div className="nutritionContent">
              <NutritionMacroChart data={chartData} />
              <MacroSummaryCards summaries={macroSummariesResolved} />
              <FuelStrategyTool bodyComposition={bodyComposition} />
            </div>
          </div>

          <style jsx>{`
            .nutritionOuter {
              min-height: 100vh;
              background:
                radial-gradient(circle at 20% 10%, rgba(47,128,237,0.12), transparent 40%),
                radial-gradient(circle at 80% 90%, rgba(39,224,166,0.08), transparent 40%),
                linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .nutritionOuter::before {
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
            .nutritionNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .nutritionBrand {
              font-size: 12px;
              letter-spacing: 2px;
              opacity: 0.6;
            }
            .nutritionTabs {
              display: flex;
              gap: 30px;
            }
            .nutritionContainer {
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px;
            }
            .nutritionHeader {
              margin-bottom: 32px;
            }
            .nutritionPhase {
              font-size: 11px;
              letter-spacing: 0.12em;
              opacity: 0.6;
              margin-bottom: 8px;
            }
            .nutritionHeadline {
              font-size: 28px;
              font-weight: 600;
              margin: 0 0 12px;
            }
            .nutritionSub {
              font-size: 15px;
              opacity: 0.8;
              margin: 0;
              line-height: 1.5;
            }
            .nutritionPlaceholder {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 24px;
              padding: 24px 28px;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 16px;
              font-size: 14px;
              opacity: 0.8;
              flex-wrap: wrap;
            }
            .nutritionPlaceholderText {
              margin: 0;
              flex: 1;
              min-width: 0;
            }
            .nutritionPlaceholderButtons {
              display: flex;
              align-items: center;
              gap: 12px;
              flex-shrink: 0;
              flex-wrap: wrap;
            }
            .nutritionLogMacrosBtn {
              display: inline-flex;
              align-items: center;
              gap: 14px;
              padding: 12px 22px 12px 14px;
              border-radius: 9999px;
              border: 1px solid rgba(255,255,255,0.25);
              background: rgba(255,255,255,0.12);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              color: #fff;
              cursor: pointer;
              font: inherit;
              box-shadow: 0 2px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06) inset;
              transition: background 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
              text-align: left;
              flex-shrink: 0;
            }
            .nutritionLogMacrosBtn:hover {
              background: rgba(255,255,255,0.18);
              box-shadow: 0 0 20px rgba(47,128,237,0.35), 0 0 36px rgba(39,224,166,0.2), 0 4px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset;
              transform: scale(1.01);
            }
            .nutritionLogMacrosOrb {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: radial-gradient(circle at 30% 30%, #27E0A6, #2F80ED 60%, rgba(17,24,39,0.9));
              box-shadow: 0 0 16px rgba(47,128,237,0.6), 0 0 28px rgba(39,224,166,0.4), 0 2px 8px rgba(0,0,0,0.2) inset;
              flex-shrink: 0;
            }
            .nutritionLogMacrosText {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 2px;
            }
            .nutritionLogMacrosLabel {
              font-weight: 600;
              font-size: 15px;
              letter-spacing: -0.02em;
            }
            .nutritionLogMacrosSub {
              font-size: 12px;
              opacity: 0.85;
            }
            .nutritionContent {
              display: flex;
              flex-direction: column;
              gap: 20px;
              margin-top: 20px;
            }
            @media (max-width: 768px) {
              .nutritionNav { padding: 16px; flex-wrap: wrap; gap: 12px; }
              .nutritionTabs { gap: 16px; flex-wrap: wrap; }
              .nutritionContainer { padding: 16px; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
