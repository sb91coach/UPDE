"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ALL_BENCHMARK_DISPLAY_NAMES } from "@/lib/profile/benchmarkSchema";
import { ALL_OPTION_DISPLAY_NAMES } from "@/lib/profile/benchmarkExerciseOptions";

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
  checkin_date?: string;
  checkin_readiness?: number;
  checkin_feel?: string;
  checkin_pain?: string;
  checkin_pain_areas?: string;
  checkin_energy?: string;
  checkin_sleep?: string;
  performance_benchmarks?: import("@/lib/profile/benchmarkSchema").PerformanceBenchmarks | null;
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
  const pathname = usePathname();

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
    const { data: updated } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id)
      .select()
      .single();
    setCheckinSubmitting(false);
    if (updated) setProfile(updated as Profile);
    setCheckinOpen(false);
  }

  if (!profile) return null;

  /* =========================
     DERIVED METRICS
  ========================= */

  const avgStrength =
    (profile.strength_upper + profile.strength_lower) / 2;

  const workCapacity = Math.round(
    profile.aerobic_score * 0.5 +
      avgStrength * 0.5
  );

  const load =
    (profile.aerobic_score +
      profile.strength_upper +
      profile.strength_lower) /
    3;

  const recovery =
    (profile.sleep_score +
      profile.mobility_score) /
    2;

  const circumference = 2 * Math.PI * 48;
  const offset =
    circumference -
    (profile.readiness_score / 100) *
      circumference;

  const domains = [
    { label: "Aerobic Capacity", value: profile.aerobic_score },
    { label: "Sleep Quality", value: profile.sleep_score },
    { label: "Hip Mobility", value: profile.mobility_score },
    { label: "Strength (Upper)", value: profile.strength_upper },
    { label: "Strength (Lower)", value: profile.strength_lower },
    { label: "Work Capacity", value: workCapacity },
  ];

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
          <NavTab href="/checkin" label="Check-in" pathname={pathname} />
          <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
        </div>
      </nav>

      <div className="container">

        {/* TOP: Readiness + Identity + Status + Daily check-in */}

        <div className="bridge">
          <div className="bridgeLeft">
            <div className="readinessLabel">Performance Readiness</div>
            <svg width="120" height="120" className="readinessGauge">
              <circle
                cx="60"
                cy="60"
                r="48"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                stroke="#2F80ED"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 1s ease",
                  filter: "drop-shadow(0 0 6px rgba(47,128,237,0.6))",
                }}
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dy=".3em"
                fontSize="26"
                fill="#fff"
                fontWeight="700"
              >
                {profile.readiness_score}
              </text>
            </svg>
            <div className="readinessSub">out of 100</div>
          </div>

          <div className="bridgeRight">
            <div className="identityBlock">
              <div className="identityBlockLabel">Your programme</div>
              <div className="identityBlockValue">Strength–Endurance Hybrid · Phase 2</div>
            </div>

            <h1 className="headline">
              {profile.readiness_score > 65
                ? "You're in a good place to train."
                : profile.readiness_score > 45
                  ? "Recovery on track — train if you feel ready."
                  : "Prioritise recovery. Light work or rest today."}
            </h1>

            <div className="metaRow">
              <Meta label="What's holding you back" value={profile.primary_limiter} />
              <Meta label="How you're trending" value={`↑ ${profile.momentum}`} highlight />
              <Meta label="Sessions this week" value="3 of 4 done" />
            </div>

            <div className="loadRecoveryBlock">
              <div className="loadRecoveryItem">
                <span className="loadRecoveryLabel">Training load</span>
                <span className="loadRecoveryValue">{Math.round(load)}</span>
              </div>
              <div className="loadRecoveryItem">
                <span className="loadRecoveryLabel">Recovery</span>
                <span className="loadRecoveryValue">{Math.round(recovery)}</span>
              </div>
            </div>
            <div className="loadTrack">
              <div className="loadFill" style={{ width: `${load}%` }} />
              <div className="recoveryFill" style={{ width: `${recovery}%` }} />
            </div>

            <div className="checkinRow" style={{ position: "relative", zIndex: 10 }}>
              <button
                type="button"
                className="dailyCheckinBtn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCheckinOpen(true);
                }}
                aria-label="Daily check-in — adapt today's programme"
              >
                <span className="dailyCheckinBtnOrb" aria-hidden />
                <span className="dailyCheckinBtnText">
                  <span className="dailyCheckinBtnLabel">Daily check-in</span>
                  <span className="dailyCheckinBtnSub">Adapt today&apos;s programme</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* TODAY'S SESSION — premium card, links to programme */}

        <Link href="/programme" className="sessionCardWrap" aria-label="View programme">
          <div className="sessionCardInner sessionCardBridge">
            <div className="sessionCardMeta">TODAY'S SESSION</div>
            <div className="sessionCardTitle">Lower Body Aerobic</div>
            <div className="sessionCardDetail">60 min · 4 exercises · Low–Mod intensity</div>
            <div className="sessionCardCtaBlock">
              View programme →
            </div>
            <div className="sessionCardHint">
              Targets what's holding you back: Aerobic Capacity
            </div>
          </div>
        </Link>

        {/* PERFORMANCE ANALYSIS */}

        <SectionTitle text="PERFORMANCE ANALYSIS" />

        <div className="grid">
          {domains.map((d, i) => (
            <DomainCard key={i} label={d.label} value={Math.round(d.value)} />
          ))}
        </div>

        {/* BENCHMARKS — top 4, card links to benchmarks page */}

        <SectionTitle text="BENCHMARKS" />

        <Link href="/benchmarks" className="identityCard benchmarksCard benchmarksCardLink">
          <div className="benchmarksRow">
            {getTop4Benchmarks(profile).map(({ key, label, value }) => (
              <BenchmarkPill key={key} label={label} value={value} />
            ))}
          </div>
        </Link>

        {/* PERFORMANCE IDENTITY — ultra card */}

        <SectionTitle text="PERFORMANCE IDENTITY" />

        <div className="identityCard">
          <div className="identityRow">
            <Identity label="Training focus" value="Strength & cardio" />
            <Identity label="Capacity" value="~82 pts" />
            <Identity label="Phase" value="Base build" />
            <Identity label="Recovery style" value="Moderate" />
          </div>
        </div>

        {/* INSIGHTS — plain language */}

        <SectionTitle text="WHAT THIS MEANS FOR YOU" />

        <Signal title="Your cardio base could use more steady work" subtitle="Adding Zone 2 sessions will help build endurance." />
        <Signal title="You're in a good window to train hard" subtitle="Readiness supports a quality session today." />
        <Signal title="Strength block complete" subtitle="Next week we advance to hypertrophy focus." />

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
      </div>

      <style jsx>{`

        .outer {
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.15), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.12), transparent 40%),
            #0A1220;
          min-height:100vh;
          color:white;
          position:relative;
          overflow:hidden;
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
          max-width:1200px;
          margin:40px auto;
          padding:0 40px;
        }

        .bridge {
          display:flex;
          gap:50px;
          background:linear-gradient(135deg,rgba(17,24,39,0.95),rgba(30,41,59,0.95));
          padding:40px;
          border-radius:24px;
          margin-bottom:50px;
          box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 60px rgba(47,128,237,0.15);
          position:relative;
          overflow:hidden;
        }

        .bridge::after {
          content:"";
          position:absolute;
          top:0;
          left:-100%;
          width:200%;
          height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent);
          animation:scan 6s linear infinite;
        }

        @keyframes scan {
          0% { transform:translateX(0); }
          100% { transform:translateX(50%); }
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

        .bridgeRight {
          flex:1;
          min-width:0;
        }

        .identityBlock {
          padding:12px 16px;
          background:linear-gradient(135deg,rgba(47,128,237,0.12),rgba(39,224,166,0.06));
          border:1px solid rgba(47,128,237,0.25);
          border-radius:14px;
          margin-bottom:16px;
        }

        .identityBlockLabel {
          font-size:10px;
          letter-spacing:1.5px;
          opacity:0.7;
          margin-bottom:4px;
        }

        .identityBlockValue {
          font-size:15px;
          font-weight:600;
          letter-spacing:0.5px;
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
          margin-bottom:16px;
        }

        .loadRecoveryBlock {
          display:flex;
          gap:24px;
          margin-bottom:8px;
        }

        .loadRecoveryItem {
          display:flex;
          flex-direction:column;
          gap:2px;
        }

        .loadRecoveryLabel {
          font-size:11px;
          opacity:0.6;
        }

        .loadRecoveryValue {
          font-size:16px;
          font-weight:600;
        }

        .loadTrack {
          height:6px;
          background:rgba(255,255,255,0.1);
          border-radius:6px;
          margin-bottom:20px;
          display:flex;
          overflow:hidden;
        }

        .loadFill {
          height:100%;
          background:linear-gradient(90deg,#2F80ED,rgba(47,128,237,0.6));
          border-radius:6px 0 0 6px;
        }

        .recoveryFill {
          height:100%;
          background:linear-gradient(90deg,#27E0A6,rgba(39,224,166,0.5));
          border-radius:0 6px 6px 0;
        }

        .checkinRow {
          display:flex;
          align-items:center;
          margin-top:20px;
          padding:20px 24px;
          background:linear-gradient(135deg,rgba(47,128,237,0.12),rgba(39,224,166,0.08));
          border:1px solid rgba(47,128,237,0.35);
          border-radius:16px;
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
          box-shadow:0 4px 32px rgba(0,0,0,0.25),0 0 0 1px rgba(255,255,255,0.1) inset;
          transform:scale(1.01);
        }

        .dailyCheckinBtn:active {
          transform:scale(0.99);
        }

        .dailyCheckinBtnOrb {
          width:32px;
          height:32px;
          border-radius:50%;
          background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(200,220,255,0.5));
          box-shadow:0 0 20px rgba(255,255,255,0.35),0 2px 8px rgba(0,0,0,0.15) inset;
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
          margin-bottom:40px;
          text-decoration:none;
          color:inherit;
          cursor:pointer;
        }

        .sessionCardWrap:hover .sessionCardInner {
          box-shadow:0 12px 40px rgba(0,0,0,0.4),0 0 40px rgba(47,128,237,0.12);
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
          margin-bottom:50px;
          box-shadow:0 8px 32px rgba(0,0,0,0.3);
        }

        .identityCard .identityRow {
          margin-bottom:0;
        }

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
        }

        .benchmarksCardLink:hover {
          border-color:rgba(255,255,255,0.12);
        }

        .grid {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:20px;
          margin-bottom:50px;
        }

        .identityRow {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:20px;
          margin-bottom:50px;
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
            padding: 0 16px;
            margin: 24px auto;
          }
          .bridge {
            flex-direction: column;
            gap: 24px;
            padding: 24px 20px;
            margin-bottom: 32px;
          }
          .bridgeLeft {
            width: 100%;
            align-items: center;
          }
          .bridgeRight {
            min-width: 0;
          }
          .headline {
            font-size: 18px;
          }
          .metaRow {
            flex-direction: column;
            gap: 12px;
            margin-bottom: 14px;
          }
          .loadRecoveryBlock {
            flex-direction: column;
            gap: 12px;
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
            margin-bottom: 32px;
          }
          .identityRow {
            grid-template-columns: 1fr;
            gap: 14px;
            margin-bottom: 32px;
          }
          .identityCard {
            padding: 20px;
            margin-bottom: 32px;
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

function DomainCard({ label, value }: { label: string; value: number }) {
  const band = getScoreBand(value);
  const interpretation = getMetricInterpretation(label, value);

  const color =
    label === "Work Capacity"
      ? "linear-gradient(90deg,#27E0A6,#00FFA3)"
      : "linear-gradient(90deg,#2F80ED,#6C5CE7)";

  return (
    <div style={{
      background:"linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
      borderRadius:18,
      padding:22,
      transition:"all 0.3s ease"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <span style={{fontSize:13,opacity:0.9}}>{label}</span>
        <span style={{fontWeight:700,fontSize:20,color:band.color}}>{value}</span>
      </div>
      <div style={{fontSize:11,opacity:0.7,marginBottom:12}}>
        {band.label} · out of 100
      </div>

      <div style={{
        height:6,
        background:"rgba(255,255,255,0.1)",
        borderRadius:6,
        marginBottom:14
      }}>
        <div style={{
          height:"100%",
          width:`${Math.min(value, 100)}%`,
          background: color,
          borderRadius:6
        }} />
      </div>

      {interpretation && (
        <div style={{fontSize:12,opacity:0.75,lineHeight:1.4}}>
          {interpretation}
        </div>
      )}
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
        <span className="sessionCardCta">View programme →</span>
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
      marginBottom:14
    }}>
      {text}
    </div>
  );
}