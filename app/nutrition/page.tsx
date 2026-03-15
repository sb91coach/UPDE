"use client";

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
  const [showMacroModal, setShowMacroModal] = useState(false);
  const [showBodyCompModal, setShowBodyCompModal] = useState(false);
  const [macroLogs, setMacroLogs] = useState<ReturnType<typeof getMacroLogs>>([]);
  const [bodyComposition, setBodyComposition] = useState<ReturnType<typeof getBodyComposition>>(null);
  const [strategicInsights, setStrategicInsights] = useState<string[]>([]);

  const refreshMacroLogs = useCallback(() => {
    setMacroLogs(getMacroLogs());
    PerformanceEngine.updateNutrition({ macroLogs: getMacroLogs() });
  }, []);
  const refreshBodyComposition = useCallback(() => {
    setBodyComposition(getBodyComposition());
    PerformanceEngine.updateNutrition({ bodyComposition: getBodyComposition() });
  }, []);

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
      arr.reduce((s, d) => s + Number(d[key]), 0) / arr.length;
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
        <div className="nutrition-page">
          <style jsx>{`
            .nutrition-page {
              max-width: 860px;
              margin: 0 auto;
              padding: 0 16px 24px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .nutrition-card {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.07);
              border-radius: 20px;
              padding: 20px;
            }
            .nutrition-section-label {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: rgba(238,240,244,0.25);
              margin-bottom: 12px;
            }
            .nutrition-headline {
              font-size: 22px;
              font-weight: 700;
              color: rgba(238,240,244,0.95);
              margin: 0 0 6px;
            }
            .nutrition-sub {
              font-size: 14px;
              color: rgba(238,240,244,0.55);
              margin: 0;
              line-height: 1.5;
            }
            .nutrition-insights-banner {
              padding: 14px 18px;
              background: rgba(47,128,237,0.08);
              border: 1px solid rgba(47,128,237,0.2);
              border-radius: 12px;
              font-size: 12px;
              color: rgba(238,240,244,0.85);
            }
            .nutrition-insights-banner strong {
              letter-spacing: 0.04em;
              color: rgba(238,240,244,0.95);
            }
            .nutrition-insights-banner ul {
              margin: 8px 0 0;
              padding-left: 18px;
              color: rgba(238,240,244,0.55);
            }
            .nutrition-placeholder {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .nutrition-placeholder-text {
              margin: 0;
              font-size: 14px;
              color: rgba(238,240,244,0.55);
            }
            .nutrition-placeholder-buttons {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }
            .nutrition-cta-btn {
              display: inline-flex;
              align-items: center;
              gap: 12px;
              padding: 14px 20px;
              border-radius: 14px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              border: none;
              font-family: inherit;
              text-align: left;
              text-decoration: none;
              color: #fff;
              background: linear-gradient(135deg, #0A84FF, #7B61FF);
              transition: opacity 0.2s, transform 0.15s;
            }
            .nutrition-cta-btn:hover {
              opacity: 0.95;
              transform: scale(1.01);
            }
            .nutrition-cta-btn.secondary {
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              color: rgba(238,240,244,0.95);
            }
            .nutrition-cta-btn.secondary:hover {
              background: rgba(255,255,255,0.09);
            }
            .nutrition-cta-btn span:first-child {
              font-size: 18px;
            }
            .nutrition-cta-label {
              display: block;
              margin-bottom: 2px;
            }
            .nutrition-cta-sub {
              font-size: 12px;
              opacity: 0.85;
              font-weight: 500;
            }
            .nutrition-content {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .nutrition-scroll-wrap {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              margin: 0 -20px;
              padding: 0 20px;
            }
          `}</style>

          <div className="nutrition-card">
            <div className="nutrition-section-label">Nutrition</div>
            <h1 className="nutrition-headline">Fuel strategy</h1>
            <p className="nutrition-sub">
              Adaptive fuelling from training demand, readiness, and recovery. No meal logging — targets and reasoning only.
            </p>
          </div>

          {strategicInsights.length > 0 && (
            <div className="nutrition-card nutrition-insights-banner">
              <strong>Performance insights</strong>
              <ul>
                {strategicInsights.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="nutrition-card">
            <div className="nutrition-placeholder">
              <p className="nutrition-placeholder-text">Weekly overview and daily strategies will appear here.</p>
              <div className="nutrition-placeholder-buttons">
                <button
                  type="button"
                  className="nutrition-cta-btn secondary"
                  onClick={() => setShowBodyCompModal(true)}
                  aria-label="Update body composition"
                >
                  <span aria-hidden>◇</span>
                  <span>
                    <span className="nutrition-cta-label">Update body composition</span>
                    <span className="nutrition-cta-sub">Weight, body fat, muscle mass</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="nutrition-cta-btn"
                  onClick={() => setShowMacroModal(true)}
                  aria-label="Log macros"
                >
                  <span aria-hidden>+</span>
                  <span>
                    <span className="nutrition-cta-label">Log macros</span>
                    <span className="nutrition-cta-sub">Add today&apos;s intake</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <LogMacrosModal isOpen={showMacroModal} onClose={() => setShowMacroModal(false)} onSaved={refreshMacroLogs} />
          <BodyCompositionModal isOpen={showBodyCompModal} onClose={() => setShowBodyCompModal(false)} onSaved={refreshBodyComposition} />

          <div className="nutrition-content">
            <div className="nutrition-card nutrition-scroll-wrap">
              <NutritionMacroChart data={chartData} />
            </div>
            <div className="nutrition-card nutrition-scroll-wrap">
              <MacroSummaryCards summaries={macroSummariesResolved} />
            </div>
            <div className="nutrition-card">
              <FuelStrategyTool bodyComposition={bodyComposition} />
            </div>
          </div>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
