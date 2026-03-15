"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type TodaySession = {
  sessionTitle: string;
  duration: string;
  intensity: string;
  exercisesCount: number;
  detail: string;
};

function readinessLabel(score: number): string {
  if (score >= 75) return "Good to train";
  if (score >= 55) return "Moderate – consider reducing load";
  return "Recovery recommended";
}

function readinessDotColor(score: number): string {
  if (score >= 75) return "#00c9a0";
  if (score >= 55) return "#f59e0b";
  return "#f04e37";
}

export default function AthleteHomeDashboard() {
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [todaySession, setTodaySession] = useState<TodaySession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("readiness_score, checkin_readiness, checkin_date")
        .eq("id", session.user.id)
        .maybeSingle();

      const rs = profile?.checkin_date === new Date().toISOString().slice(0, 10)
        ? profile?.checkin_readiness ?? profile?.readiness_score ?? 70
        : profile?.readiness_score ?? 70;
      if (mounted) setReadinessScore(typeof rs === "number" ? rs : 70);

      const res = await fetch("/api/today-session");
      const json = res.ok ? await res.json() : null;
      if (mounted && json?.todaySession) setTodaySession(json.todaySession);

      if (mounted) setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="mobile-polish min-h-[60vh] flex items-center justify-center">
        <p className="text-white/40 text-sm">Loading…</p>
      </div>
    );
  }

  const score = readinessScore ?? 70;
  const session = todaySession ?? {
    sessionTitle: "Lower Body Strength",
    duration: "55 min",
    intensity: "Moderate–High",
    exercisesCount: 4,
    detail: "Force production focus",
  };

  const trainingFocus = session.intensity === "Low" ? "Recovery" : session.detail || "Force Production";

  return (
    <div className="mobile-polish flex flex-col space-y-6">
      <h1 className="text-white font-bold text-2xl tracking-tight">Today</h1>

      {/* Readiness card */}
      <section className="polish-card space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: readinessDotColor(score) }}
            aria-hidden
          />
          <p className="text-sm text-white/40">Readiness Score</p>
        </div>
        <p className="text-5xl font-bold text-white tracking-tight">{Math.round(score)}%</p>
        <p className="text-sm text-white/60">{readinessLabel(score)}</p>
      </section>

      {/* Today's session card */}
      <section className="polish-card space-y-3">
        <p className="text-sm text-white/40">Today&apos;s Session</p>
        <p className="text-lg font-semibold text-white">{session.sessionTitle}</p>
        <div className="space-y-1 text-sm text-white/60">
          <p><span className="text-white/40">Focus:</span> {trainingFocus}</p>
          <p><span className="text-white/40">Duration:</span> {session.duration}</p>
        </div>
      </section>

      {/* Quick actions */}
      <div className="flex flex-col space-y-3 pt-2">
        <Link
          href="/programme"
          className="w-full flex items-center justify-center rounded-[14px] font-bold tracking-wide h-[52px] text-white transition-opacity active:scale-[0.98] hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0A84FF, #7B61FF)", letterSpacing: "0.02em" }}
        >
          Start Workout
        </Link>
        <div className="flex items-center justify-center gap-4 text-xs text-white/40">
          <Link href="/coach" className="no-underline tracking-[0.06em] uppercase hover:text-white/60">Coach</Link>
          <Link href="/tactical/input" className="no-underline tracking-[0.06em] uppercase hover:text-white/60">Log readiness</Link>
        </div>
      </div>
    </div>
  );
}
