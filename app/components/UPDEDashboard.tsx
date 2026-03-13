"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ALL_BENCHMARK_DISPLAY_NAMES } from "@/lib/profile/benchmarkSchema";
import { ALL_OPTION_DISPLAY_NAMES } from "@/lib/profile/benchmarkExerciseOptions";
import { identityLabel } from "@/lib/profile/identityModel";
import RemakerProgressBlock from "@/app/ui/RemakerProgressBlock";
import WeeklyBrief from "@/app/ui/WeeklyBrief";
import ForecastSummary from "@/app/components/ForecastSummary";
import { usePerformanceForecast } from "@/hooks/usePerformanceForecast";
import DecisionLog from "@/app/ui/DecisionLog";
import type { DecisionLogEntry } from "@/app/ui/DecisionLog";
import type { InjuryEntry } from "@/engine/injuryMemoryEngine";
import { getAdvisories } from "@/engine/advisoriesEngine";
import { generateWeeklyBrief } from "@/engine/weeklyBriefGenerator";
import { systemBiasPhrase } from "@/engine/systemBias";
import { getRiskSignals } from "@/engine/riskIndex";
import RiskBadge from "@/app/ui/RiskBadge";
import { PerformanceEngine } from "@/lib/performanceEngine";
import { subscribe as subscribePerformance } from "@/lib/performanceEvents";

type Profile = {
  id: string;
  readiness_score: number;
  aerobic_score: number;
  strength_upper: number;
  strength_lower: number;
  mobility_score: number;
  sleep_score: number;
  primary_limiter: string;
  momentum: string;
  stress_level?: number;
  fatigue_score?: number;
  focus?: string;
  goal?: string;
  current_week?: number;
  days_per_week?: number;
  minutes_per_session?: number;
  checkin_date?: string;
  checkin_readiness?: number;
  checkin_feel?: string;
  checkin_pain?: string;
  checkin_pain_areas?: string;
  checkin_energy?: string;
  checkin_sleep?: string;
  performance_benchmarks?: import("@/lib/profile/benchmarkSchema").PerformanceBenchmarks | null;
  last_session_focus?: string | null;
};

type TodaySession = {
  sessionTitle: string;
  duration: string;
  intensity: string;
  exercisesCount: number;
  detail: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function UPDEDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    readiness: 7,
    feel: "good" as "good" | "okay" | "poor",
    pain: "none" as "none" | "yes",
    painAreas: "",
    energy: "medium" as "low" | "medium" | "high",
    sleep: "good" as "poor" | "okay" | "good",
  });
  const [todaySession, setTodaySession] = useState<TodaySession | null>(null);
  const [sessionsThisWeek, setSessionsThisWeek] = useState<{ completed: number; planned: number } | null>(null);
  const [behaviourDrift, setBehaviourDrift] = useState<{
    simplificationRecommended?: boolean;
  } | null>(null);
  const [activeInjuries, setActiveInjuries] = useState<InjuryEntry[]>([]);
  const [decisionLogEntries, setDecisionLogEntries] = useState<DecisionLogEntry[]>([]);
  const [decisionCollapsed, setDecisionCollapsed] = useState(true);
  const [domainCollapsed, setDomainCollapsed] = useState(true);
  const [strategicInsights, setStrategicInsights] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<ReturnType<typeof PerformanceEngine.getMetrics> | null>(null);
  const [readinessComposite, setReadinessComposite] = useState<number | null>(null);
  const [readinessBreakdown, setReadinessBreakdown] = useState<ReturnType<typeof PerformanceEngine.getReadinessBreakdown> | null>(null);
  const [capacityBreakdownExpanded, setCapacityBreakdownExpanded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setStrategicInsights(PerformanceEngine.getStrategicInsights());
    setPerformanceMetrics(PerformanceEngine.getMetrics());
    setReadinessComposite(PerformanceEngine.getReadinessComposite());
    setReadinessBreakdown(PerformanceEngine.getReadinessBreakdown());
    const unsubRecalc = subscribePerformance("stateRecalculated", () => {
      setStrategicInsights(PerformanceEngine.getStrategicInsights());
      setPerformanceMetrics(PerformanceEngine.getMetrics());
      setReadinessComposite(PerformanceEngine.getReadinessComposite());
      setReadinessBreakdown(PerformanceEngine.getReadinessBreakdown());
    });
    const unsubInsights = subscribePerformance("strategicInsightsUpdated", () => {
      setStrategicInsights(PerformanceEngine.getStrategicInsights());
    });
    return () => {
      unsubRecalc();
      unsubInsights();
    };
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      setProfile(data);
    }

    load();
  }, []);

  useEffect(() => {
    if (!checkinOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCheckinOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [checkinOpen]);

  useEffect(() => {
    if (!profile || !checkinOpen || profile.checkin_date !== todayStr()) return;
    setCheckinForm({
      readiness: profile.checkin_readiness ?? 7,
      feel: (profile.checkin_feel as "good" | "okay" | "poor") ?? "okay",
      pain: (profile.checkin_pain as "none" | "yes") ?? "none",
      painAreas: profile.checkin_pain_areas ?? "",
      energy: (profile.checkin_energy as "low" | "medium" | "high") ?? "medium",
      sleep: (profile.checkin_sleep as "poor" | "okay" | "good") ?? "good",
    });
  }, [checkinOpen, profile]);

  useEffect(() => {
    if (!profile?.id || pathname !== "/profile") return;
    fetch("/api/today-session")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.todaySession) setTodaySession(data.todaySession);
        if (data?.sessionsThisWeek) setSessionsThisWeek(data.sessionsThisWeek);
      })
      .catch(() => {});
  }, [profile?.id, pathname]);

  useEffect(() => {
    if (!profile?.id || pathname !== "/profile") return;
    fetch("/api/behaviour-drift")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBehaviourDrift(d))
      .catch(() => setBehaviourDrift(null));
  }, [profile?.id, pathname]);

  useEffect(() => {
    if (!profile?.id || pathname !== "/profile") return;
    fetch("/api/injuries")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setActiveInjuries((d.entries ?? []).filter((e: InjuryEntry) => !e.resolved)))
      .catch(() => setActiveInjuries([]));
  }, [profile?.id, pathname]);

  useEffect(() => {
    if (!profile?.id || pathname !== "/profile") return;
    fetch("/api/decision-log?limit=10")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setDecisionLogEntries(d.entries ?? []))
      .catch(() => setDecisionLogEntries([]));
  }, [profile?.id, pathname]);

  async function submitCheckin() {
    if (!profile) return;
    setCheckinSubmitting(true);
    const updates = {
      checkin_date: todayStr(),
      checkin_readiness: checkinForm.readiness,
      checkin_feel: checkinForm.feel,
      checkin_pain: checkinForm.pain,
      checkin_pain_areas: checkinForm.painAreas,
      checkin_energy: checkinForm.energy,
      checkin_sleep: checkinForm.sleep,
    };
    await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);
    const { data: fresh } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.id)
      .single();
    if (fresh) setProfile(fresh as Profile);
    else setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    setCheckinSubmitting(false);
    setCheckinOpen(false);
  }

  const profileSnapshot = useMemo(
    () =>
      profile
        ? {
            aerobic_score: profile.aerobic_score,
            strength_upper: profile.strength_upper,
            strength_lower: profile.strength_lower,
            sleep_score: profile.sleep_score,
            stress_level: profile.stress_level,
            readiness_score: readinessComposite ?? profile.readiness_score,
            primary_limiter: profile.primary_limiter,
            goal: profile.goal,
            focus: profile.focus,
            current_week: profile.current_week,
            loadProgressionPercent: performanceMetrics?.loadProgressionPercent,
            nutritionAlignmentScore: performanceMetrics?.nutritionAlignmentScore,
          }
        : null,
    [profile, readinessComposite, performanceMetrics]
  );

  const capacityBreakdown = useMemo(
    () => PerformanceEngine.calculateCapacityBreakdown(profileSnapshot),
    [profileSnapshot]
  );
  const recoveryBreakdown = useMemo(
    () => PerformanceEngine.calculateRecoveryBreakdown(profileSnapshot),
    [profileSnapshot]
  );
  const identityProfile = useMemo(
    () => PerformanceEngine.calculateIdentityProfile(profileSnapshot),
    [profileSnapshot]
  );
  const trendDeltas = useMemo(
    () => PerformanceEngine.calculateTrendDeltas(profileSnapshot),
    [profileSnapshot]
  );
  const decisionTransparency = useMemo(
    () => PerformanceEngine.getDecisionTransparency(profileSnapshot),
    [profileSnapshot]
  );

  if (!profile) return null;
  const p = profile;

  /* =========================
     DERIVED METRICS
  ========================= */

  const avgStrength =
    (p.strength_upper + p.strength_lower) / 2;

  const workCapacity = Math.round(
    p.aerobic_score * 0.5 +
      avgStrength * 0.5
  );

  const readinessScore = readinessComposite ?? p.readiness_score ?? 70;
  const circumference = 2 * Math.PI * 80;
  const offset =
    circumference -
    (readinessScore / 100) *
      circumference;

  const domains = [
    { label: "Aerobic Capacity", value: p.aerobic_score },
    { label: "Sleep Quality", value: p.sleep_score },
    { label: "Hip Mobility", value: p.mobility_score },
    { label: "Strength (Upper)", value: p.strength_upper },
    { label: "Strength (Lower)", value: p.strength_lower },
    { label: "Work Capacity", value: workCapacity },
  ];

  function getAdaptation(): "reduce" | "normal" | "increase" {
    if (p.checkin_date !== todayStr()) return "normal";
    const readiness = p.checkin_readiness ?? 7;
    const feel = p.checkin_feel ?? "okay";
    const pain = p.checkin_pain ?? "none";
    const energy = p.checkin_energy ?? "medium";
    const sleep = p.checkin_sleep ?? "okay";
    if (pain === "yes" || feel === "poor" || energy === "low" || sleep === "poor" || readiness < 5) return "reduce";
    if (feel === "good" && (energy === "high" || sleep === "good") && readiness >= 7 && pain === "none") return "increase";
    return "normal";
  }

  const adaptation = getAdaptation();
  const advisories = getAdvisories({
    readiness: p.checkin_readiness ?? 7,
    feel: (p.checkin_feel as "good" | "okay" | "poor") ?? "okay",
    pain: (p.checkin_pain as "none" | "yes") ?? "none",
    painAreas: p.checkin_pain_areas ?? null,
    energy: (p.checkin_energy as "low" | "medium" | "high") ?? "medium",
    sleep: (p.checkin_sleep as "poor" | "okay" | "good") ?? "okay",
    adaptation,
    sessionFocus: "Lower body",
  });
  const hasCheckinToday = profile.checkin_date === todayStr();

  const DASHBOARD_PHASES = ["Accumulation", "Accumulation", "Intensification", "Intensification", "Overreach", "Deload"];
  const MACROCYCLE_LABELS: Record<string, string> = { Accumulation: "GPP", Intensification: "SPP", Overreach: "SPP", Deload: "Recovery" };
  const weekNum = p.current_week ?? 1;
  const phaseLabel = DASHBOARD_PHASES[(weekNum - 1) % DASHBOARD_PHASES.length] ?? "Accumulation";
  const macrocycle = MACROCYCLE_LABELS[phaseLabel] ?? "GPP";
  const programmeLabel = p.goal ? String(p.goal).replace(/^./, (c) => c.toUpperCase()) : (p.focus ? String(p.focus) : "Strength–Endurance Hybrid");
  const weeklyBriefData = generateWeeklyBrief({
    ...p,
    phase: phaseLabel,
    macrocycle,
    current_week: weekNum,
  });
  const trainingFocus = systemBiasPhrase(p);
  const capacityPts = Math.round((p.aerobic_score + (p.strength_upper + p.strength_lower) / 2) / 2);

  const historicalPps = (() => {
    const base = p.readiness_score ?? 70;
    return Array.from({ length: 8 }, (_, i) => base - 4 + i + (i % 3 === 0 ? 1 : 0));
  })();
  const adherence = 0.85;
  const consistencyScore = Math.round((p.aerobic_score + p.strength_upper + p.strength_lower) / 3) || 70;
  const performanceForecast = usePerformanceForecast(historicalPps, adherence, consistencyScore, 8);
  const baselinePps = historicalPps[historicalPps.length - 1] ?? 70;
  const projectedPpsPercent =
    performanceForecast.projected.length > 0
      ? performanceForecast.projected.map(
          (p) => ((p - baselinePps) / baselinePps) * 100
        )
      : undefined;

  return (
    <div className="outer">

      {/* NAVIGATION */}

      <nav className="nav">
        <div className="brand">
          PERFORMANCE PATHFINDER OS
        </div>
        <div className="tabs">
          <NavTab href="/" label="Home" pathname={pathname} />
          <NavTab href="/profile" label="Profile" pathname={pathname} />
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

      {/* DESKTOP LAYOUT — command centre (unchanged) */}
      <div className="hidden lg:block">
        <div className="container containerDesktop">
          <div className="dashboardContent">

          {/* 1) Top row: Weekly Brief + Performance Readiness side by side */}
          <section className="dashboardSection dashboardTopRow">
            <div className="topRowBrief">
              <WeeklyBrief
                phaseIntent={weeklyBriefData.phaseIntent}
                systemBias={weeklyBriefData.systemBias}
                primaryLimiter={weeklyBriefData.primaryLimiter}
                recoveryBandwidth={weeklyBriefData.recoveryBandwidth}
                whyThisWeek={weeklyBriefData.whyThisWeek}
                weekNumber={weekNum}
              />
            </div>
            <div className="topRowReadiness">
              <div className="readinessBlock">
                <div className="readinessLabel">Performance Readiness</div>
                <svg width="200" height="200" viewBox="0 0 200 200" className="readinessGauge" aria-hidden>
                  <defs>
                    <linearGradient id="readinessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2F80ED" />
                      <stop offset="50%" stopColor="#5b9cf2" />
                      <stop offset="100%" stopColor="#27E0A6" />
                    </linearGradient>
                    <filter id="readinessGlow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <circle cx="100" cy="100" r="80" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="transparent" className="readinessGaugeBg" />
                  <circle cx="100" cy="100" r="80" stroke="url(#readinessGradient)" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="readinessGaugeArc" style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)", filter: "drop-shadow(0 0 8px rgba(47,128,237,0.5))" }} />
                  <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="44" fill="#fff" fontWeight="700" className="readinessGaugeText">{readinessScore}</text>
                </svg>
                <div className="readinessSub">out of 100 · data-driven composite</div>
                {readinessBreakdown && (
                  <div className="readinessBreakdown" style={{ marginTop: 10, fontSize: 11, display: "flex", flexWrap: "wrap", gap: "8px 12px", justifyContent: "center" }}>
                    <span title="Recovery">Recovery {readinessBreakdown.recovery}</span>
                    <span title="Load balance">Load {readinessBreakdown.loadBalance}</span>
                    <span title="Nutrition">Nutrition {readinessBreakdown.nutrition}</span>
                    <span title="Injury">Injury {readinessBreakdown.injury}</span>
                    <span title="Sentiment">Sentiment {readinessBreakdown.sentiment}</span>
                  </div>
                )}
                <div className="programmeBox">
                  <span className="programmeBoxLabel">Your programme</span>
                  <span className="programmeBoxValue">{programmeLabel} · {phaseLabel}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 2) Active Injury Alert */}
          {activeInjuries.length > 0 && (
            <section className="dashboardSection dashboardSectionInjury">
              <div className="activeInjuryAlert">
                <span className="activeInjuryIcon" aria-hidden>⚠</span>
                <div className="activeInjuryText">
                  {activeInjuries[0].body_part.replace(/_/g, " ")} — Severity {activeInjuries[0].severity}
                  {activeInjuries[0].risk_level && ` (${activeInjuries[0].risk_level.replace(/^./, (c) => c.toUpperCase())} Risk)`}
                </div>
                <Link href="/settings" className="activeInjuryLink">Manage</Link>
              </div>
            </section>
          )}

          {/* 2b) Strategic insights from PerformanceEngine */}
          {strategicInsights.length > 0 && (
            <section className="dashboardSection" style={{ padding: "12px 16px", background: "rgba(39, 224, 166, 0.06)", border: "1px solid rgba(39, 224, 166, 0.15)", borderRadius: 12 }}>
              <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Strategic insights</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                {strategicInsights.map((s, i) => (
                  <li key={i} style={{ marginTop: 4 }}>{s}</li>
                ))}
              </ul>
              {performanceMetrics && (performanceMetrics.executionProbability != null || performanceMetrics.injuryRiskScore != null) && (
                <div style={{ marginTop: 10, fontSize: 11, opacity: 0.8 }}>
                  {performanceMetrics.executionProbability != null && <span>Execution probability: {performanceMetrics.executionProbability.score}%</span>}
                  {performanceMetrics.executionProbability != null && performanceMetrics.injuryRiskScore != null && " · "}
                  {performanceMetrics.injuryRiskScore != null && <span>Injury risk: {performanceMetrics.injuryRiskScore}%</span>}
                </div>
              )}
            </section>
          )}

          {/* 4) Engagement / Risk ribbon — only when there is content */}
          {(() => {
            const risk = getRiskSignals(p);
            const hasRibbonContent =
              behaviourDrift?.simplificationRecommended ||
              risk.overloadRisk !== "low" ||
              risk.neuralStrain !== "low" ||
              risk.recoveryCompression !== "stable";
            if (!hasRibbonContent) return null;
            return (
              <section className="dashboardSection dashboardSectionRibbon">
                <div className="engagementRibbon">
                  {behaviourDrift?.simplificationRecommended && (
                    <div className="engagementDriftCard">
                      Engagement trending ↓ — simplifying architecture.
                    </div>
                  )}
                  <RiskBadge
                    overloadRisk={risk.overloadRisk}
                    neuralStrain={risk.neuralStrain}
                    recoveryCompression={risk.recoveryCompression}
                  />
                </div>
              </section>
            );
          })()}

          {/* 5) Headline + meta + check-in — one clear box */}
          <section className="dashboardSection dashboardSectionHeadline">
            <div className="headlineCard">
              <div className="headlineCardLeft">
                <h1 className="headline">
                  {readinessScore > 65 ? "You're in a good place to train." : readinessScore > 45 ? "Recovery on track — train if you feel ready." : "Prioritise recovery. Light work or rest today."}
                </h1>
                <div className="metaRow">
                  <Meta label="What's holding you back" value={p.primary_limiter} />
                  <Meta label="How you're trending" value={`↑ ${p.momentum}`} highlight />
                  <Meta label="Sessions this week" value={sessionsThisWeek ? `${sessionsThisWeek.completed} of ${sessionsThisWeek.planned} done` : "—"} />
                </div>
              </div>
              <div className="checkinRow">
                <button type="button" className="dailyCheckinBtn" onClick={() => setCheckinOpen(true)} aria-label="Daily check-in — adapt today's programme">
                  <span className="dailyCheckinBtnOrb" aria-hidden />
                  <span className="dailyCheckinBtnText">
                    <span className="dailyCheckinBtnLabel">Daily check-in</span>
                    <span className="dailyCheckinBtnSub">Adapt today&apos;s programme</span>
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* 6) Today Session card */}
          <section className="dashboardSection">
            <a href="/programme" className="sessionCardWrap sessionCardLink sessionCardAnimate" aria-label="View programme" onClick={(e) => { e.preventDefault(); window.location.href = "/programme"; }}>
              <div className="sessionCardInner sessionCardBridge">
                <div className="sessionCardMeta">TODAY'S SESSION</div>
                <div className="sessionCardTitle">{todaySession?.sessionTitle ?? "Lower Body Strength"}</div>
                <div className="sessionCardDetail">{todaySession?.detail ?? "— min · 4 exercises · Moderate–High intensity"}</div>
                <div className="sessionCardCtaBlock"><span className="sessionCardCtaLink">View programme →</span></div>
                <div className="sessionCardHint">Targets what's holding you back: {p.primary_limiter}</div>
              </div>
            </a>
          </section>

          {/* 8) PPS chart */}
          <section className="dashboardSection">
            <SectionTitle text="PROGRESS OVERVIEW" />
            <RemakerProgressBlock
              readinessScore={profile.readiness_score ?? 70}
              strengthUpper={profile.strength_upper ?? 60}
              strengthLower={profile.strength_lower ?? 60}
              aerobicScore={profile.aerobic_score ?? 60}
              topBenchmarkLabel={getTop4Benchmarks(profile)[0]?.label}
              topBenchmarkValue={getTop4Benchmarks(profile)[0]?.value ?? null}
              sessionsThisWeek={sessionsThisWeek?.completed ?? 0}
              projectedPpsPercent={projectedPpsPercent}
            />
            <ForecastSummary forecast={performanceForecast} weeksForward={8} />
          </section>

          {/* 9) Identity + Bias */}
          <section className="dashboardSection">
            <SectionTitle text="PERFORMANCE IDENTITY" />
            <div className="identityCard identityCardLayered">
              <div className="identityRow">
                <Identity label="Identity" value={identityLabel(p)} />
                <Identity label="Training focus" value={trainingFocus} />
                <Identity label="Capacity" value={`~${capacityPts} pts`} />
                <Identity label="Phase" value={phaseLabel} />
                <Identity label="Recovery" value={weeklyBriefData.recoveryBandwidth} />
              </div>
              <div className="identityMetaRow">
                <span className="identityBias">Strength {identityProfile.strengthBiasPercent}% · Aerobic {identityProfile.aerobicBiasPercent}%</span>
                <span className="identityLoadTolerance">Load tolerance: {identityProfile.loadTolerance}</span>
                <span className="identityTrend" title="4-week trend">
                  {identityProfile.trend === "up" ? "↑" : identityProfile.trend === "down" ? "↓" : "→"} {identityProfile.delta !== 0 ? `${identityProfile.delta > 0 ? "+" : ""}${identityProfile.delta} (4w)` : "stable"}
                </span>
              </div>
            </div>
          </section>

          {/* 9b) Capacity card */}
          <section className="dashboardSection">
            <SectionTitle text="CAPACITY" />
            <div className="analysisCard analysisCardCapacity">
              <div className="analysisCardHead">
                <span className="analysisCardScore">{capacityBreakdown.score}<span className="analysisCardOutOf">/100</span></span>
                <span className="analysisCardPercentile">~{Math.min(99, Math.round((capacityBreakdown.score / 100) * 99))}th %ile</span>
                <span className="analysisCardTrend" title="Trend">{capacityBreakdown.trend === "up" ? "↑" : capacityBreakdown.trend === "down" ? "↓" : "→"}</span>
              </div>
              <button type="button" className="analysisCardExpand" onClick={() => setCapacityBreakdownExpanded((e) => !e)} aria-expanded={capacityBreakdownExpanded}>
                {capacityBreakdownExpanded ? "Hide breakdown" : "Show breakdown"}
              </button>
              {capacityBreakdownExpanded && (
                <div className="analysisCardBreakdown">
                  {capacityBreakdown.contributors.map((c, i) => (
                    <div key={i} className="analysisCardContributor">
                      <span className="contributorDot" style={{ background: c.value >= 70 ? "rgba(39,224,166,0.8)" : c.value >= 50 ? "rgba(47,128,237,0.8)" : "rgba(255,255,255,0.4)" }} />
                      <span>{c.name}</span>
                      <span>{c.value}</span>
                    </div>
                  ))}
                  {capacityBreakdown.limitingFactor && <div className="analysisCardLimiting">Limiting: {capacityBreakdown.limitingFactor}</div>}
                  {capacityBreakdown.programmeInfluence && <div className="analysisCardInfluence">{capacityBreakdown.programmeInfluence}</div>}
                </div>
              )}
            </div>
          </section>

          {/* 9c) Recovery card */}
          <section className="dashboardSection">
            <SectionTitle text="RECOVERY" />
            <div className="analysisCard analysisCardRecovery">
              <div className="analysisCardHead">
                <span className="analysisCardScore">{recoveryBreakdown.score}<span className="analysisCardOutOf">/100</span></span>
                <span className="analysisCardTrend">{recoveryBreakdown.trend === "up" ? "↑" : recoveryBreakdown.trend === "down" ? "↓" : "→"}</span>
              </div>
              <div className="recoveryWeights">
                {recoveryBreakdown.contributors.map((c, i) => (
                  <div key={i} className={`recoveryWeightItem ${recoveryBreakdown.limitingFactor === c.name ? "recoveryWeightLimiting" : ""}`}>
                    <span className="contributorDot" style={{ background: c.value >= 70 ? "rgba(39,224,166,0.8)" : c.value >= 50 ? "rgba(47,128,237,0.8)" : "rgba(239,68,68,0.6)" }} />
                    <span>{c.name}</span>
                    <span>{c.value}</span>
                  </div>
                ))}
              </div>
              {recoveryBreakdown.limitingFactor && <div className="analysisCardLimiting">Limiting factor: {recoveryBreakdown.limitingFactor}</div>}
              {recoveryBreakdown.programmeInfluence && <div className="analysisCardInfluence">{recoveryBreakdown.programmeInfluence}</div>}
            </div>
          </section>

          {/* 10) Benchmarks */}
          <section className="dashboardSection">
            <SectionTitle text="BENCHMARKS" />
            <Link href="/benchmarks" className="identityCard benchmarksCard benchmarksCardLink">
              <div className="benchmarksRow">
                {getTop4Benchmarks(profile).map(({ key, label, value }) => (
                  <BenchmarkPill key={key} label={label} value={value} />
                ))}
              </div>
            </Link>
          </section>

          {/* 11) Domain intelligence */}
          <section className="dashboardSection">
            <SectionTitle text="PERFORMANCE ANALYSIS" />
            <div className="grid">
              {domains.map((d, i) => (
                <DomainCard
                  key={i}
                  label={d.label}
                  value={Math.round(d.value)}
                  trend={trendDeltas[d.label] ? (trendDeltas[d.label][5] >= (trendDeltas[d.label][0] ?? 0) ? "up" : trendDeltas[d.label][5] < (trendDeltas[d.label][0] ?? 0) ? "down" : "stable") : "stable"}
                  sparklineData={trendDeltas[d.label] ?? []}
                  limitingFactor={d.label === "Work Capacity" ? capacityBreakdown.limitingFactor : d.label === "Sleep Quality" ? recoveryBreakdown.limitingFactor : null}
                  programmeInfluence={d.label === "Work Capacity" ? capacityBreakdown.programmeInfluence : d.label === "Sleep Quality" ? recoveryBreakdown.programmeInfluence : null}
                />
              ))}
            </div>
          </section>

          {/* 12) Decision transparency (collapsible) */}
          <section className="dashboardSection dashboardSectionDecision">
            <button type="button" className="decisionToggle" onClick={() => setDecisionCollapsed((c) => !c)} aria-expanded={!decisionCollapsed}>
              <span className="decisionToggleLabel">Decision transparency</span>
              <span className="decisionToggleChevron">{decisionCollapsed ? "▼" : "▲"}</span>
            </button>
            {!decisionCollapsed && (
              <div className="decisionTransparencyWrap">
                <div className="decisionTransparencyBlock">
                  <div className="decisionTransparencyLabel">Phase</div>
                  <div className="decisionTransparencyText">{decisionTransparency.phaseExplanation}</div>
                </div>
                <div className="decisionTransparencyBlock">
                  <div className="decisionTransparencyLabel">Focus</div>
                  <div className="decisionTransparencyText">{decisionTransparency.focusExplanation}</div>
                </div>
                <div className="decisionTransparencyBlock">
                  <div className="decisionTransparencyLabel">Capacity reasoning</div>
                  <div className="decisionTransparencyText">{decisionTransparency.capacityReasoning}</div>
                </div>
                {decisionTransparency.riskFlags.length > 0 && (
                  <div className="decisionTransparencyBlock decisionTransparencyRisks">
                    <div className="decisionTransparencyLabel">Risk flags</div>
                    <ul className="decisionTransparencyFlags">
                      {decisionTransparency.riskFlags.map((f, i) => (
                        <li key={i}><span className="contributorDot" style={{ background: "rgba(239,68,68,0.7)" }} />{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="decisionLogWrap">
                  <DecisionLog entries={decisionLogEntries} maxItems={10} />
                </div>
              </div>
            )}
          </section>

          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT — stacked briefing (separate hierarchy) */}
      <div className="block lg:hidden">
        <div className="containerMobile">
          <div className="mobileStack">
            {/* 1) Weekly Brief */}
            <section className="mobileSection">
              <WeeklyBrief
                phaseIntent={weeklyBriefData.phaseIntent}
                systemBias={weeklyBriefData.systemBias}
                primaryLimiter={weeklyBriefData.primaryLimiter}
                recoveryBandwidth={weeklyBriefData.recoveryBandwidth}
                whyThisWeek={weeklyBriefData.whyThisWeek}
                weekNumber={weekNum}
              />
            </section>

            {/* 2) Active Injury Alert */}
            {activeInjuries.length > 0 && (
              <section className="mobileSection">
                <div className="activeInjuryAlert">
                  <span className="activeInjuryIcon" aria-hidden>⚠</span>
                  <div className="activeInjuryText">
                    {activeInjuries[0].body_part.replace(/_/g, " ")} — Severity {activeInjuries[0].severity}
                    {activeInjuries[0].risk_level && ` (${activeInjuries[0].risk_level.replace(/^./, (c) => c.toUpperCase())} Risk)`}
                  </div>
                  <Link href="/settings" className="activeInjuryLink">Manage</Link>
                </div>
              </section>
            )}

            {/* 2b) Strategic insights (mobile) */}
            {strategicInsights.length > 0 && (
              <section className="mobileSection" style={{ padding: "12px 16px", background: "rgba(39, 224, 166, 0.06)", border: "1px solid rgba(39, 224, 166, 0.15)", borderRadius: 12 }}>
                <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Strategic insights</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                  {strategicInsights.map((s, i) => (
                    <li key={i} style={{ marginTop: 4 }}>{s}</li>
                  ))}
                </ul>
                {performanceMetrics && (performanceMetrics.executionProbability != null || performanceMetrics.injuryRiskScore != null) && (
                  <div style={{ marginTop: 10, fontSize: 11, opacity: 0.8 }}>
                    {performanceMetrics.executionProbability != null && <span>Execution: {performanceMetrics.executionProbability.score}%</span>}
                    {performanceMetrics.executionProbability != null && performanceMetrics.injuryRiskScore != null && " · "}
                    {performanceMetrics.injuryRiskScore != null && <span>Injury risk: {performanceMetrics.injuryRiskScore}%</span>}
                  </div>
                )}
              </section>
            )}

            {/* 3) Readiness Dial */}
            <section className="mobileSection mobileSectionReadiness">
              <div className="readinessBlock">
                <div className="readinessLabel">Performance Readiness</div>
                <svg width="200" height="200" viewBox="0 0 200 200" className="readinessGauge" aria-hidden>
                  <defs>
                    <linearGradient id="readinessGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2F80ED" />
                      <stop offset="50%" stopColor="#5b9cf2" />
                      <stop offset="100%" stopColor="#27E0A6" />
                    </linearGradient>
                    <filter id="readinessGlowMobile">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <circle cx="100" cy="100" r="80" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="transparent" />
                  <circle cx="100" cy="100" r="80" stroke="url(#readinessGradientMobile)" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)", filter: "drop-shadow(0 0 8px rgba(47,128,237,0.5))" }} />
                  <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="44" fill="#fff" fontWeight="700">{readinessScore}</text>
                </svg>
                <div className="readinessSub">out of 100 · composite</div>
                {readinessBreakdown && (
                  <div style={{ marginTop: 8, fontSize: 10, display: "flex", flexWrap: "wrap", gap: "6px 10px", justifyContent: "center", opacity: 0.85 }}>
                    <span>R{readinessBreakdown.recovery}</span>
                    <span>L{readinessBreakdown.loadBalance}</span>
                    <span>N{readinessBreakdown.nutrition}</span>
                    <span>I{readinessBreakdown.injury}</span>
                    <span>S{readinessBreakdown.sentiment}</span>
                  </div>
                )}
                <div className="programmeBox">
                  <span className="programmeBoxLabel">Your programme</span>
                  <span className="programmeBoxValue">{programmeLabel} · {phaseLabel}</span>
                </div>
              </div>
            </section>

            {/* 4) Today Session */}
            <section className="mobileSection">
              <a href="/programme" className="sessionCardWrap sessionCardLink" aria-label="View programme" onClick={(e) => { e.preventDefault(); window.location.href = "/programme"; }}>
                <div className="sessionCardInner sessionCardBridge">
                  <div className="sessionCardMeta">TODAY'S SESSION</div>
                  <div className="sessionCardTitle">{todaySession?.sessionTitle ?? "Lower Body Strength"}</div>
                  <div className="sessionCardDetail">{todaySession?.detail ?? "— min · 4 exercises · Moderate–High intensity"}</div>
                  <div className="sessionCardCtaBlock"><span className="sessionCardCtaLink">View programme →</span></div>
                  <div className="sessionCardHint">Targets what's holding you back: {p.primary_limiter}</div>
                </div>
              </a>
            </section>

            {/* 5) Fuel Strategy */}
            <section className="mobileSection">
              <div className="mobileFuelStrategy">
                <div className="mobileFuelStrategyLabel">Fuel strategy today</div>
                <div className="mobileFuelStrategyText">Targets on programme · Prioritise protein and carbs around session.</div>
              </div>
            </section>

            {/* 6) Risk Ribbon — only when there is content */}
            {(() => {
              const risk = getRiskSignals(p);
              const hasRibbonContent =
                behaviourDrift?.simplificationRecommended ||
                risk.overloadRisk !== "low" ||
                risk.neuralStrain !== "low" ||
                risk.recoveryCompression !== "stable";
              if (!hasRibbonContent) return null;
              return (
                <section className="mobileSection">
                  <div className="engagementRibbon">
                    {behaviourDrift?.simplificationRecommended && (
                      <div className="engagementDriftCard">
                        Engagement trending ↓ — simplifying architecture.
                      </div>
                    )}
                    <RiskBadge
                      overloadRisk={risk.overloadRisk}
                      neuralStrain={risk.neuralStrain}
                      recoveryCompression={risk.recoveryCompression}
                    />
                  </div>
                </section>
              );
            })()}

            {/* 7) PPS (7-day) */}
            <section className="mobileSection">
              <div className="mobileSectionTitle">Progress (7-day)</div>
              <RemakerProgressBlock
                readinessScore={profile.readiness_score ?? 70}
                strengthUpper={profile.strength_upper ?? 60}
                strengthLower={profile.strength_lower ?? 60}
                aerobicScore={profile.aerobic_score ?? 60}
                topBenchmarkLabel={getTop4Benchmarks(profile)[0]?.label}
                topBenchmarkValue={getTop4Benchmarks(profile)[0]?.value ?? null}
                sessionsThisWeek={sessionsThisWeek?.completed ?? 0}
                projectedPpsPercent={projectedPpsPercent}
              />
              <ForecastSummary forecast={performanceForecast} weeksForward={8} />
            </section>

            {/* 8) Identity */}
            <section className="mobileSection">
              <div className="mobileSectionTitle">Identity</div>
              <div className="identityCard identityCardLayered">
                <div className="identityRow identityRowMobile">
                  <Identity label="Identity" value={identityLabel(p)} />
                  <Identity label="Training focus" value={trainingFocus} />
                  <Identity label="Capacity" value={`~${capacityPts} pts`} />
                  <Identity label="Phase" value={phaseLabel} />
                  <Identity label="Recovery" value={weeklyBriefData.recoveryBandwidth} />
                </div>
                <div className="identityMetaRow">
                  <span className="identityBias">Strength {identityProfile.strengthBiasPercent}% · Aerobic {identityProfile.aerobicBiasPercent}%</span>
                  <span className="identityLoadTolerance">Load: {identityProfile.loadTolerance}</span>
                  <span className="identityTrend">{identityProfile.trend === "up" ? "↑" : identityProfile.trend === "down" ? "↓" : "→"} {identityProfile.delta !== 0 ? `${identityProfile.delta > 0 ? "+" : ""}${identityProfile.delta} (4w)` : ""}</span>
                </div>
              </div>
            </section>

            {/* 9) Domain Grid (collapsible) */}
            <section className="mobileSection">
              <button type="button" className="decisionToggle" onClick={() => setDomainCollapsed((c) => !c)} aria-expanded={!domainCollapsed}>
                <span className="decisionToggleLabel">Performance analysis</span>
                <span className="decisionToggleChevron">{domainCollapsed ? "▼" : "▲"}</span>
              </button>
              {!domainCollapsed && (
                <div className="domainGridMobile">
                  {domains.map((d, i) => (
                    <DomainCard
                      key={i}
                      label={d.label}
                      value={Math.round(d.value)}
                      trend={trendDeltas[d.label] ? (trendDeltas[d.label][5] >= (trendDeltas[d.label][0] ?? 0) ? "up" : trendDeltas[d.label][5] < (trendDeltas[d.label][0] ?? 0) ? "down" : "stable") : "stable"}
                      sparklineData={trendDeltas[d.label] ?? []}
                      limitingFactor={d.label === "Work Capacity" ? capacityBreakdown.limitingFactor : d.label === "Sleep Quality" ? recoveryBreakdown.limitingFactor : null}
                      programmeInfluence={d.label === "Work Capacity" ? capacityBreakdown.programmeInfluence : d.label === "Sleep Quality" ? recoveryBreakdown.programmeInfluence : null}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* 10) Decision Log (collapsed) */}
            <section className="mobileSection">
              <button type="button" className="decisionToggle" onClick={() => setDecisionCollapsed((c) => !c)} aria-expanded={!decisionCollapsed}>
                <span className="decisionToggleLabel">Decision transparency</span>
                <span className="decisionToggleChevron">{decisionCollapsed ? "▼" : "▲"}</span>
              </button>
              {!decisionCollapsed && (
                <div className="decisionTransparencyWrap">
                  <div className="decisionTransparencyBlock">
                    <div className="decisionTransparencyLabel">Phase</div>
                    <div className="decisionTransparencyText">{decisionTransparency.phaseExplanation}</div>
                  </div>
                  <div className="decisionTransparencyBlock">
                    <div className="decisionTransparencyLabel">Focus</div>
                    <div className="decisionTransparencyText">{decisionTransparency.focusExplanation}</div>
                  </div>
                  <div className="decisionTransparencyBlock">
                    <div className="decisionTransparencyLabel">Capacity</div>
                    <div className="decisionTransparencyText">{decisionTransparency.capacityReasoning}</div>
                  </div>
                  {decisionTransparency.riskFlags.length > 0 && (
                    <div className="decisionTransparencyBlock decisionTransparencyRisks">
                      <div className="decisionTransparencyLabel">Risk flags</div>
                      <ul className="decisionTransparencyFlags">
                        {decisionTransparency.riskFlags.map((f, i) => (
                          <li key={i}><span className="contributorDot" style={{ background: "rgba(239,68,68,0.7)" }} />{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="decisionLogWrap">
                    <DecisionLog entries={decisionLogEntries} maxItems={10} />
                  </div>
                </div>
              )}
            </section>

          </div>
        </div>
      </div>

        {/* Daily check-in modal — same style as programme page */}
        {checkinOpen && (
          <div
            className="checkinBackdrop"
            onClick={() => setCheckinOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Daily check-in"
          >
            <div className="checkinModal" onClick={(e) => e.stopPropagation()}>
              <div className="checkinModalHeader">
                <span>Daily check-in</span>
                <button
                  type="button"
                  className="checkinModalClose"
                  onClick={() => setCheckinOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="checkinIntro">
                Answer 5 quick questions. Your programme will adapt today's session (volume, intensity, or alternatives).
              </p>
              <div className="checkinForm">
                <label>
                  <span>1. Readiness (1–10)</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={checkinForm.readiness}
                    onChange={(e) =>
                      setCheckinForm((f) => ({ ...f, readiness: +e.target.value }))
                    }
                  />
                  <span className="rangeVal">{checkinForm.readiness}</span>
                </label>
                <label>
                  <span>2. How do you feel?</span>
                  <select
                    value={checkinForm.feel}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        feel: e.target.value as "good" | "okay" | "poor",
                      }))
                    }
                  >
                    <option value="good">Good</option>
                    <option value="okay">Okay</option>
                    <option value="poor">Poor</option>
                  </select>
                </label>
                <label>
                  <span>3. Any pain?</span>
                  <select
                    value={checkinForm.pain}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        pain: e.target.value as "none" | "yes",
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="yes">Yes</option>
                  </select>
                  {checkinForm.pain === "yes" && (
                    <input
                      type="text"
                      placeholder="Where? (e.g. lower back, knee)"
                      value={checkinForm.painAreas}
                      onChange={(e) =>
                        setCheckinForm((f) => ({ ...f, painAreas: e.target.value }))
                      }
                      className="checkinText"
                    />
                  )}
                </label>
                <label>
                  <span>4. Energy level?</span>
                  <select
                    value={checkinForm.energy}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        energy: e.target.value as "low" | "medium" | "high",
                      }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label>
                  <span>5. Sleep last night?</span>
                  <select
                    value={checkinForm.sleep}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        sleep: e.target.value as "poor" | "okay" | "good",
                      }))
                    }
                  >
                    <option value="poor">Poor</option>
                    <option value="okay">Okay</option>
                    <option value="good">Good</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="checkinSubmitBtn"
                  onClick={submitCheckin}
                  disabled={checkinSubmitting}
                >
                  {checkinSubmitting ? "Saving…" : "Save & adapt programme"}
                </button>
              </div>
            </div>
          </div>
        )}

      <style jsx>{`

        .outer {
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.15), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.12), transparent 40%),
            #0A1220;
          min-height:100vh;
          color:white;
          position:relative;
          overflow-x:hidden;
          overflow-y:auto;
        }

        .outer::before {
          content:"";
          position:absolute;
          inset:0;
          background:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size:40px 40px;
          opacity:0.4;
          animation:gridDrift 40s linear infinite;
        }

        @keyframes gridDrift {
          0% { background-position:0 0,0 0; }
          100% { background-position:200px 200px,200px 200px; }
        }

        .nav {
          display:flex;
          justify-content:space-between;
          padding:20px 40px;
          border-bottom:1px solid rgba(255,255,255,0.05);
        }

        .brand {
          font-size:12px;
          letter-spacing:2px;
          opacity:0.6;
        }

        .tabs { display:flex; gap:30px; }

        .container {
          width:100%;
          margin:0 auto;
          box-sizing:border-box;
        }

        .containerDesktop {
          max-width:1200px;
          padding:16px 40px 24px;
        }

        .containerMobile {
          width:100%;
          max-width:100%;
          margin:0 auto;
          padding:16px;
          box-sizing:border-box;
        }

        .mobileStack {
          display:flex;
          flex-direction:column;
          gap:24px;
        }

        .mobileSection {
          min-width:0;
        }

        .mobileSectionReadiness {
          display:flex;
          justify-content:center;
        }

        .mobileSectionTitle {
          font-size:11px;
          letter-spacing:0.08em;
          opacity:0.65;
          margin-bottom:12px;
        }

        .mobileFuelStrategy {
          padding:12px 16px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:12px;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .mobileFuelStrategy:hover {
          box-shadow:0 0 20px rgba(47,128,237,0.2),0 0 40px rgba(39,224,166,0.1);
          border-color:rgba(47,128,237,0.2);
        }

        .mobileFuelStrategyLabel {
          font-size:11px;
          letter-spacing:0.05em;
          opacity:0.7;
          margin-bottom:6px;
        }

        .mobileFuelStrategyText {
          font-size:13px;
          opacity:0.9;
          line-height:1.4;
        }

        .domainCard:hover {
          box-shadow:0 0 24px rgba(47,128,237,0.22),0 0 48px rgba(39,224,166,0.12);
        }
        .domainGridMobile {
          display:flex;
          flex-direction:column;
          gap:12px;
          margin-top:12px;
        }

        .identityRowMobile {
          display:flex;
          flex-direction:column;
          gap:12px;
        }

        .dashboardContent {
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .dashboardSection {
          min-width:0;
        }

        .dashboardTopRow {
          display:flex;
          align-items:stretch;
          gap:24px;
          flex-wrap:wrap;
        }
        .topRowBrief {
          flex:1;
          min-width:280px;
          display:flex;
        }
        .topRowBrief > * {
          flex:1;
          min-height:100%;
        }
        .topRowReadiness {
          flex-shrink:0;
          display:flex;
          align-items:stretch;
        }
        .topRowReadiness .readinessBlock {
          height:100%;
          min-height:100%;
        }
        .dashboardSectionInjury { }
        .dashboardSectionRibbon { }
        .dashboardSectionDecision { }

        .activeInjuryAlert {
          display:flex;
          align-items:center;
          gap:12px;
          padding:12px 16px;
          background:rgba(220,80,80,0.12);
          border:1px solid rgba(220,80,80,0.35);
          border-radius:12px;
          transition:box-shadow 0.3s ease;
        }
        .activeInjuryAlert:hover {
          box-shadow:0 0 20px rgba(220,80,80,0.25);
        }
        .activeInjuryIcon { font-size:18px; }
        .activeInjuryText { flex:1; font-size:14px; font-weight:500; }
        .activeInjuryLink { font-size:13px; color:#27E0A6; text-decoration:none; font-weight:600; }

        .readinessBlock {
          display:flex;
          flex-direction:column;
          align-items:center;
          padding:24px 16px;
          background:linear-gradient(135deg,rgba(17,24,39,0.95),rgba(30,41,59,0.95));
          border-radius:24px;
          border:1px solid rgba(255,255,255,0.08);
          box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 60px rgba(47,128,237,0.15);
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .readinessBlock:hover {
          box-shadow:0 0 28px rgba(47,128,237,0.25),0 0 56px rgba(39,224,166,0.12),0 20px 60px rgba(0,0,0,0.6);
          border-color:rgba(47,128,237,0.2);
        }

        .engagementRibbon {
          padding:16px;
          background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));
          border:1px solid rgba(255,255,255,0.08);
          border-radius:16px;
          display:flex;
          flex-direction:column;
          gap:12px;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .engagementRibbon:hover {
          box-shadow:0 0 24px rgba(47,128,237,0.18),0 0 48px rgba(39,224,166,0.08);
          border-color:rgba(47,128,237,0.18);
        }
        .engagementDriftCard {
          padding:8px 12px;
          border-radius:6px;
          background:rgba(255,255,255,0.06);
          font-size:13px;
          color:rgba(255,255,255,0.85);
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .engagementDriftCard:hover {
          box-shadow:0 0 16px rgba(47,128,237,0.2),0 0 28px rgba(39,224,166,0.1);
        }

        .decisionToggle {
          display:flex;
          align-items:center;
          justify-content:space-between;
          width:100%;
          padding:12px 16px;
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:12px;
          color:inherit;
          font:inherit;
          cursor:pointer;
          text-align:left;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .decisionToggle:hover {
          box-shadow:0 0 20px rgba(47,128,237,0.2),0 0 40px rgba(39,224,166,0.1);
          border-color:rgba(47,128,237,0.2);
        }
        .decisionToggleLabel { font-size:12px; letter-spacing:0.05em; opacity:0.85; }
        .decisionToggleChevron { font-size:10px; opacity:0.7; }
        .decisionLogWrap { margin-top:12px; }

        .dashboardSectionHeadline {
          padding:4px 0 8px;
        }

        .headlineCard {
          display:flex;
          flex-direction:row;
          align-items:center;
          justify-content:space-between;
          gap:24px;
          flex-wrap:wrap;
          padding:24px 28px;
          background:linear-gradient(135deg,rgba(17,24,39,0.95),rgba(30,41,59,0.9));
          border:1px solid rgba(255,255,255,0.1);
          border-radius:20px;
          box-shadow:0 8px 32px rgba(0,0,0,0.3);
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .headlineCard:hover {
          box-shadow:0 0 28px rgba(47,128,237,0.2),0 0 56px rgba(39,224,166,0.1),0 8px 32px rgba(0,0,0,0.3);
          border-color:rgba(47,128,237,0.25);
        }
        .headlineCardLeft {
          flex:1;
          min-width:0;
        }

        .readinessGauge {
          animation:gaugeFadeIn 1.2s cubic-bezier(0.4,0,0.2,1);
        }
        .readinessGaugeArc {
          animation:gaugeGlow 3s ease-in-out infinite;
        }
        @keyframes gaugeFadeIn {
          from { opacity:0; transform:scale(0.92); }
          to { opacity:1; transform:scale(1); }
        }
        @keyframes gaugeGlow {
          0%, 100% { filter:drop-shadow(0 0 8px rgba(47,128,237,0.5)); }
          50% { filter:drop-shadow(0 0 14px rgba(47,128,237,0.7)); }
        }

        .bridgeLeft {
          display:flex;
          flex-direction:column;
          align-items:center;
          flex-shrink:0;
        }

        .readinessLabel {
          font-size:11px;
          letter-spacing:2px;
          opacity:0.8;
          margin-bottom:8px;
        }

        .readinessSub {
          font-size:12px;
          opacity:0.6;
          margin-top:4px;
        }

        .programmeBox {
          margin-top:12px;
          padding:8px 12px;
          background:linear-gradient(135deg,rgba(47,128,237,0.12),rgba(39,224,166,0.06));
          border:1px solid rgba(47,128,237,0.2);
          border-radius:10px;
          text-align:center;
          min-width:0;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .programmeBox:hover {
          box-shadow:0 0 16px rgba(47,128,237,0.25),0 0 28px rgba(39,224,166,0.12);
          border-color:rgba(47,128,237,0.35);
        }
        .programmeBoxLabel {
          display:block;
          font-size:9px;
          letter-spacing:1.2px;
          opacity:0.7;
          margin-bottom:2px;
        }
        .programmeBoxValue {
          display:block;
          font-size:12px;
          font-weight:600;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .bridgeRight {
          flex:1;
          min-width:0;
        }

        .headline {
          font-size:20px;
          font-weight:600;
          margin:0 0 18px;
          line-height:1.35;
        }

        .metaRow {
          display:flex;
          gap:24px;
          margin-bottom:0;
        }

        .sessionCardAnimate {
          animation:sessionCardFadeIn 0.8s ease-out 0.15s both;
        }
        @keyframes sessionCardFadeIn {
          from { opacity:0; transform:translateY(12px); }
          to { opacity:1; transform:translateY(0); }
        }

        .checkinRow {
          display:flex;
          align-items:center;
          flex-shrink:0;
          margin-top:0;
        }

        .dailyCheckinBtn {
          display:inline-flex;
          align-items:center;
          gap:14px;
          padding:12px 22px 12px 14px;
          border-radius:9999px;
          border:1px solid rgba(255,255,255,0.25);
          background:rgba(255,255,255,0.12);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          color:#fff;
          cursor:pointer;
          box-shadow:0 2px 24px rgba(0,0,0,0.2),0 0 0 1px rgba(255,255,255,0.06) inset;
          transition:background 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
          text-align:left;
        }

        .dailyCheckinBtn:hover {
          background:rgba(255,255,255,0.18);
          box-shadow:0 0 20px rgba(47,128,237,0.35),0 0 36px rgba(39,224,166,0.2),0 4px 32px rgba(0,0,0,0.25),0 0 0 1px rgba(255,255,255,0.1) inset;
          transform:scale(1.01);
        }

        .dailyCheckinBtn:active {
          transform:scale(0.99);
        }

        .dailyCheckinBtnOrb {
          width:32px;
          height:32px;
          border-radius:50%;
          background:radial-gradient(circle at 30% 30%, #27E0A6, #2F80ED 60%, rgba(17,24,39,0.9));
          box-shadow:0 0 16px rgba(47,128,237,0.6),0 0 28px rgba(39,224,166,0.4),0 2px 8px rgba(0,0,0,0.2) inset;
          flex-shrink:0;
        }

        .dailyCheckinBtnText {
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:2px;
        }

        .dailyCheckinBtnLabel {
          font-weight:600;
          font-size:15px;
          letter-spacing:-0.02em;
        }

        .dailyCheckinBtnSub {
          font-size:12px;
          opacity:0.85;
          font-weight:400;
        }

        .sessionCardWrap {
          display:block;
        }
        .sessionCardLink {
          text-decoration:none;
          color:inherit;
          cursor:pointer;
        }
        .sessionCardLink:hover .sessionCardInner {
          box-shadow:0 0 24px rgba(47,128,237,0.22),0 0 48px rgba(39,224,166,0.12),0 12px 40px rgba(0,0,0,0.4);
        }

        .sessionCardCtaLink {
          display:inline-block;
          padding:0;
          border:none;
          background:none;
          font:inherit;
          color:#27E0A6;
          font-weight:600;
          text-decoration:none;
          cursor:pointer;
          transition:opacity 0.2s, color 0.2s;
        }
        .sessionCardCtaLink:hover {
          color:#3df5b8;
          text-decoration:underline;
        }

        .sessionCardInner {
          background:linear-gradient(135deg,rgba(17,24,39,0.95),rgba(30,41,59,0.95));
          padding:40px;
          border-radius:24px;
          border:1px solid rgba(255,255,255,0.08);
          box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 60px rgba(47,128,237,0.12);
          transition:box-shadow 0.3s ease;
        }

        .sessionCardBridge .sessionCardMeta {
          font-size:11px;
          letter-spacing:2px;
          opacity:0.65;
          margin-bottom:10px;
        }

        .sessionCardBridge .sessionCardTitle {
          font-size:22px;
          font-weight:600;
          margin-bottom:8px;
        }

        .sessionCardBridge .sessionCardDetail {
          font-size:15px;
          opacity:0.75;
          margin-bottom:16px;
        }

        .sessionCardCtaBlock {
          font-size:15px;
          font-weight:600;
          color:#27E0A6;
          margin-bottom:16px;
        }

        .sessionCardBridge .sessionCardHint {
          font-size:14px;
          opacity:0.75;
          margin-top:0;
        }

        .sectionBlock {
          animation:sectionFadeIn 0.7s ease-out both;
        }
        .sectionBlock.delay1 { animation-delay:0.08s; }
        .sectionBlock.delay2 { animation-delay:0.16s; }
        .sectionBlock.delay3 { animation-delay:0.24s; }
        .sectionBlock.delay4 { animation-delay:0.32s; }
        .sectionBlock.delay5 { animation-delay:0.4s; }
        .sectionBlock.delay6 { animation-delay:0.48s; }
        .sectionBlock.delay7 { animation-delay:0.56s; }
        .sectionBlock.delay8 { animation-delay:0.64s; }
        .sectionBlock.delay9 { animation-delay:0.72s; }
        @keyframes sectionFadeIn {
          from { opacity:0; transform:translateY(16px); }
          to { opacity:1; transform:translateY(0); }
        }

        .sessionCard { }

        .sessionCardHead {
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:24px;
        }

        .sessionCardMeta {
          font-size:11px;
          letter-spacing:2px;
          opacity:0.65;
          margin-bottom:10px;
        }

        .sessionCardTitle {
          font-size:22px;
          font-weight:600;
          margin-bottom:10px;
          letter-spacing:0.3px;
        }

        .sessionCardDetail {
          font-size:15px;
          opacity:0.75;
        }

        .sessionCardCta {
          font-size:15px;
          font-weight:600;
          color:#27E0A6;
          flex-shrink:0;
        }

        .sessionCardHint {
          margin-top:20px;
          font-size:14px;
          opacity:0.75;
        }

        .identityCard {
          background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));
          border:1px solid rgba(255,255,255,0.08);
          border-radius:20px;
          padding:24px;
          box-shadow:0 8px 32px rgba(0,0,0,0.3);
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .identityCard:hover {
          box-shadow:0 0 24px rgba(47,128,237,0.2),0 0 48px rgba(39,224,166,0.1),0 8px 32px rgba(0,0,0,0.3);
          border-color:rgba(47,128,237,0.2);
        }
        .identityCardLayered .identityMetaRow {
          display:flex;
          flex-wrap:wrap;
          gap:12px 20px;
          margin-top:14px;
          padding-top:14px;
          border-top:1px solid rgba(255,255,255,0.06);
          font-size:11px;
          letter-spacing:0.03em;
          opacity:0.85;
        }
        .identityBias { }
        .identityLoadTolerance { }
        .identityTrend { opacity:0.9; }

        .identityCard .identityRow {
          margin-bottom:0;
        }

        .contributorDot {
          display:inline-block;
          width:6px;
          height:6px;
          border-radius:50%;
          margin-right:6px;
          vertical-align:middle;
        }
        .analysisCard {
          background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));
          border:1px solid rgba(255,255,255,0.08);
          border-radius:18px;
          padding:20px 22px;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .analysisCard:hover {
          box-shadow:0 0 20px rgba(47,128,237,0.15),0 0 40px rgba(39,224,166,0.08);
          border-color:rgba(47,128,237,0.15);
        }
        .analysisCardHead {
          display:flex;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:12px;
        }
        .analysisCardScore { font-weight:700; font-size:28px; color:rgba(255,255,255,0.95); }
        .analysisCardOutOf { font-size:14px; font-weight:500; opacity:0.6; }
        .analysisCardPercentile { font-size:12px; opacity:0.7; }
        .analysisCardTrend { font-size:14px; opacity:0.9; }
        .analysisCardExpand {
          background:none;
          border:none;
          color:inherit;
          font-size:11px;
          letter-spacing:0.04em;
          opacity:0.8;
          cursor:pointer;
          padding:4px 0;
          margin-bottom:8px;
        }
        .analysisCardExpand:hover { opacity:1; }
        .analysisCardBreakdown { margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06); }
        .analysisCardContributor {
          display:flex;
          align-items:center;
          gap:8px;
          font-size:12px;
          margin-bottom:6px;
        }
        .analysisCardContributor span:last-child { margin-left:auto; font-weight:600; }
        .analysisCardLimiting { font-size:11px; opacity:0.85; margin-top:10px; }
        .analysisCardInfluence { font-size:11px; opacity:0.65; margin-top:4px; }
        .recoveryWeights {
          display:flex;
          flex-wrap:wrap;
          gap:8px 16px;
          margin-top:10px;
        }
        .recoveryWeightItem { display:flex; align-items:center; gap:6px; font-size:12px; }
        .recoveryWeightLimiting { font-weight:600; }
        .decisionTransparencyWrap { margin-top:12px; }
        .decisionTransparencyBlock {
          padding:14px 18px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.06);
          border-radius:12px;
          margin-bottom:12px;
        }
        .decisionTransparencyLabel { font-size:10px; letter-spacing:0.08em; opacity:0.65; margin-bottom:6px; }
        .decisionTransparencyText { font-size:13px; line-height:1.45; opacity:0.9; }
        .decisionTransparencyRisks { }
        .decisionTransparencyFlags { list-style:none; margin:8px 0 0; padding:0; font-size:12px; }
        .decisionTransparencyFlags li { display:flex; align-items:center; margin-bottom:4px; }

        .benchmarksCard {
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          justify-content:space-between;
          gap:16px;
        }

        .benchmarksRow {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:20px;
          flex:1;
          min-width:0;
        }

        .benchmarksCardLink {
          text-decoration:none;
          color:inherit;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .benchmarksCardLink:hover {
          border-color:rgba(255,255,255,0.12);
          box-shadow:0 0 24px rgba(47,128,237,0.2),0 0 48px rgba(39,224,166,0.1),0 8px 32px rgba(0,0,0,0.3);
        }

        .grid {
          display:grid;
          grid-template-columns:1fr;
          gap:20px;
        }

        .identityRow {
          display:grid;
          grid-template-columns:1fr;
          gap:20px;
        }

        .checkinBackdrop {
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.75);
          display:flex;
          align-items:flex-start;
          justify-content:center;
          padding-top:48px;
          z-index:10002;
        }

        .checkinModal {
          background:#0A1220;
          border-radius:16px;
          overflow:hidden;
          max-width:420px;
          width:100%;
          border:1px solid rgba(255,255,255,0.1);
        }

        .checkinModalHeader {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:14px 18px;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }

        .checkinModalClose {
          background:none;
          border:none;
          color:white;
          font-size:24px;
          cursor:pointer;
          opacity:0.8;
          line-height:1;
        }

        .checkinModalClose:hover { opacity:1; }

        .checkinIntro {
          padding:0 18px 16px;
          font-size:13px;
          opacity:0.85;
          line-height:1.45;
        }

        .checkinForm {
          padding:0 18px 20px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .checkinForm label {
          display:flex;
          flex-direction:column;
          gap:6px;
          font-size:13px;
        }

        .checkinForm label span:first-of-type { opacity:0.9; }

        .checkinForm input[type="range"] {
          width:100%;
          accent-color:#2F80ED;
        }

        .checkinForm select {
          padding:8px 12px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:white;
          font-size:14px;
        }

        .checkinText {
          padding:8px 12px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:white;
          font-size:14px;
        }

        .rangeVal { font-weight:600; opacity:1; }

        .checkinSubmitBtn {
          margin-top:8px;
          padding:12px 20px;
          background:#2F80ED;
          border:none;
          border-radius:10px;
          color:white;
          font-weight:600;
          cursor:pointer;
        }

        .checkinSubmitBtn:hover:not(:disabled) {
          background:#2563eb;
        }

        .checkinSubmitBtn:disabled {
          opacity:0.7;
          cursor:not-allowed;
        }

        @media (min-width: 769px) {
          .container {
            max-width: 1200px;
            margin: 20px auto;
          }
          .readinessBlock {
            max-width: 320px;
          }
          .grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .identityRow {
            grid-template-columns: repeat(5, 1fr);
          }
          .benchmarksRow {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 768px) {
          .nav {
            flex-wrap: wrap;
            padding: 14px 16px;
            gap: 12px;
          }
          .brand {
            font-size: 10px;
            letter-spacing: 1.5px;
          }
          .tabs {
            gap: 16px;
            flex-wrap: wrap;
          }
          .container {
            padding: 16px;
            margin: 0 auto;
          }
          .headline {
            font-size: 18px;
          }
          .metaRow {
            flex-direction: column;
            gap: 12px;
            margin-bottom: 14px;
          }
          .sessionCardInner {
            padding: 24px 20px;
          }
          .sessionCardBridge .sessionCardTitle {
            font-size: 18px;
          }
          .grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .identityRow {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .identityCard {
            padding: 20px;
          }
          .benchmarksRow {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }

      `}</style>
      </div>
  );
}

/* ================= COMPONENTS ================= */

function NavTab({ href, label, pathname }: any) {
  const active = pathname === href;
  return (
    <Link href={href}>
      <span style={{
        fontSize:14,
        opacity:active?1:0.6,
        borderBottom:active?"2px solid #2F80ED":"2px solid transparent",
        paddingBottom:4,
        cursor:"pointer"
      }}>
        {label}
      </span>
    </Link>
  );
}

function Meta({ label, value, highlight }: any) {
  return (
    <div>
      <div style={{ fontSize:10, opacity:0.6 }}>{label}</div>
      <div style={highlight?{color:"#27E0A6"}:{}}>{value}</div>
    </div>
  );
}

function getScoreBand(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Elite", color: "#27E0A6" };
  if (score >= 60) return { label: "Strong", color: "#2F80ED" };
  if (score >= 40) return { label: "Good", color: "#93c5fd" };
  return { label: "Building", color: "rgba(255,255,255,0.5)" };
}

function getMetricInterpretation(label: string, score: number): string {
  const band = getScoreBand(score).label;
  if (label === "Aerobic Capacity")
    return band === "Elite" ? "Supports high training load" : band === "Strong" ? "Good base for endurance work" : band === "Good" ? "Room to build aerobic base" : "Focus on steady-state work";
  if (label === "Sleep Quality")
    return band === "Elite" ? "Optimal recovery" : band === "Strong" ? "Supports adaptation" : band === "Good" ? "Aim for consistency" : "Prioritise sleep to recover";
  if (label === "Hip Mobility")
    return band === "Elite" ? "Full range for lifts" : band === "Strong" ? "Good movement quality" : band === "Good" ? "Keep mobility work in" : "Add mobility each session";
  if (label === "Strength (Upper)")
    return band === "Elite" ? "Peak pushing/pulling" : band === "Strong" ? "Solid upper-body base" : band === "Good" ? "Building strength" : "Progressive loading";
  if (label === "Strength (Lower)")
    return band === "Elite" ? "Peak squat/hinge" : band === "Strong" ? "Solid lower-body base" : band === "Good" ? "Building strength" : "Progressive loading";
  if (label === "Work Capacity")
    return band === "Elite" ? "High volume tolerance" : band === "Strong" ? "Good mix of strength & cardio" : band === "Good" ? "Balancing both" : "Build base in both";
  return "";
}

function DomainCard({
  label,
  value,
  trend,
  sparklineData,
  limitingFactor,
  programmeInfluence,
}: {
  label: string;
  value: number;
  trend?: "up" | "down" | "stable";
  sparklineData?: number[];
  limitingFactor?: string | null;
  programmeInfluence?: string | null;
}) {
  const band = getScoreBand(value);
  const interpretation = getMetricInterpretation(label, value);
  const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const points = sparklineData?.length ? sparklineData : [value];
  const maxP = Math.max(...points);
  const minP = Math.min(...points);
  const range = maxP - minP || 1;

  return (
    <div className="domainCard domainCardLayered" style={{
      background:"linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
      borderRadius:18,
      padding:22,
      transition:"box-shadow 0.3s ease, border-color 0.3s ease"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <span style={{fontSize:13,opacity:0.9}}>{label}</span>
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontWeight:700,fontSize:20,color:band.color}}>{value}</span>
          {trend && <span className="domainCardTrend" style={{fontSize:12,opacity:0.8}} title="Trend">{trendArrow}</span>}
        </span>
      </div>
      {points.length >= 2 && (
        <div className="domainCardSparkline" style={{height:24,marginBottom:10,display:"flex",alignItems:"flex-end",gap:2}}>
          {points.map((p, i) => (
            <div
              key={i}
              style={{
                flex:1,
                height: `${Math.max(4, ((p - minP) / range) * 100)}%`,
                minHeight:4,
                background: "linear-gradient(180deg, rgba(47,128,237,0.5), rgba(39,224,166,0.3))",
                borderRadius:2,
                transition: "height 0.25s ease",
              }}
              title={`${p}`}
            />
          ))}
        </div>
      )}
      <div style={{fontSize:11,opacity:0.7,marginBottom:8}}>
        {band.label} · out of 100
      </div>
      {interpretation && (
        <div style={{fontSize:12,opacity:0.75,lineHeight:1.4,marginBottom:8}}>
          {interpretation}
        </div>
      )}
      {limitingFactor && <div className="domainCardLimiting" style={{fontSize:11,opacity:0.8,marginTop:6}}>Limiting: {limitingFactor}</div>}
      {programmeInfluence && <div className="domainCardInfluence" style={{fontSize:11,opacity:0.65,marginTop:4}}>{programmeInfluence}</div>}
    </div>
  );
}

function Identity({ label, value }: any) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.05)",
      padding:18,
      borderRadius:16
    }}>
      <div style={{fontSize:10,opacity:0.6,marginBottom:4}}>
        {label}
      </div>
      <div style={{fontWeight:600}}>
        {value}
      </div>
    </div>
  );
}

function getBenchmarkKg(profile: Profile | null, key: string): number | null {
  if (!profile?.performance_benchmarks?.exerciseBenchmarks) return null;
  const b = profile.performance_benchmarks.exerciseBenchmarks[key as keyof typeof profile.performance_benchmarks.exerciseBenchmarks];
  if (!b) return null;
  const v = b.oneRM ?? b.estimatedOneRM;
  return v != null && v > 0 ? v : null;
}

function getTop4Benchmarks(profile: Profile | null): { key: string; label: string; value: number | null }[] {
  const bench = profile?.performance_benchmarks?.exerciseBenchmarks ?? {};
  const entries = Object.entries(bench)
    .map(([key, b]) => {
      const v = (b as { oneRM?: number; estimatedOneRM?: number })?.oneRM ?? (b as { estimatedOneRM?: number })?.estimatedOneRM ?? null;
      const label = ALL_BENCHMARK_DISPLAY_NAMES[key] ?? ALL_OPTION_DISPLAY_NAMES[key] ?? key.replace(/_/g, " ");
      return { key, label, value: v != null && v > 0 ? v : null };
    })
    .filter((e): e is { key: string; label: string; value: number } => e.value != null);
  entries.sort((a, b) => b.value - a.value);
  const top4: { key: string; label: string; value: number | null }[] = entries.slice(0, 4).map((e) => ({ key: e.key, label: e.label, value: e.value }));
  const placeholders = ["Back Squat", "Bench Press", "Deadlift", "Overhead Press"];
  while (top4.length < 4) {
    top4.push({ key: `p${top4.length}`, label: placeholders[top4.length], value: null });
  }
  return top4;
}

function BenchmarkPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.05)",
      padding:18,
      borderRadius:16
    }}>
      <div style={{fontSize:10,opacity:0.6,marginBottom:4}}>
        {label}
      </div>
      <div style={{fontWeight:600}}>
        {value != null ? `${value} kg` : "—"}
      </div>
    </div>
  );
}

function Signal({ title, subtitle }: any) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.05)",
      padding:18,
      borderRadius:16,
      marginBottom:12
    }}>
      <div style={{fontWeight:600}}>
        {title}
      </div>
      <div style={{opacity:0.6,fontSize:13}}>
        {subtitle}
      </div>
    </div>
  );
}

function SessionCard() {
  return (
    <div className="sessionCard">
      <div className="sessionCardHead">
        <div>
          <div className="sessionCardMeta">TODAY'S SESSION · VIEW PROGRAMME</div>
          <div className="sessionCardTitle">Lower Body Aerobic</div>
          <div className="sessionCardDetail">60 min · 4 exercises · Low–Mod intensity</div>
        </div>
        <Link href="/programme" className="sessionCardCtaLink">View programme →</Link>
      </div>
      <div className="sessionCardHint">
        Targets what's holding you back: Aerobic Capacity
      </div>
    </div>
  );
}

function SectionTitle({ text }: any) {
  return (
    <div style={{
      fontSize:11,
      letterSpacing:2,
      opacity:0.6,
      marginBottom:12
    }}>
      {text}
    </div>
  );
}