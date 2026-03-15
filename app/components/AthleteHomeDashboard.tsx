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
        <p className="text-gray-500 text-sm">Loading…</p>
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
      <h1 className="text-xl font-semibold text-gray-900">Today</h1>

      {/* Readiness card */}
      <section className="polish-card space-y-3">
        <p className="text-sm text-gray-500">Readiness Score</p>
        <p className="text-2xl font-bold text-gray-900">{Math.round(score)}%</p>
        <p className="text-sm text-gray-600">{readinessLabel(score)}</p>
      </section>

      {/* Today's session card */}
      <section className="polish-card space-y-3">
        <p className="text-sm text-gray-500">Today&apos;s Session</p>
        <p className="text-lg font-semibold text-gray-900">{session.sessionTitle}</p>
        <div className="space-y-1 text-sm text-gray-600">
          <p><span className="text-gray-500">Focus:</span> {trainingFocus}</p>
          <p><span className="text-gray-500">Duration:</span> {session.duration}</p>
        </div>
      </section>

      {/* Quick actions */}
      <div className="flex flex-col space-y-3 pt-2">
        <Link
          href="/programme"
          className="h-12 w-full flex items-center justify-center rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors active:scale-[0.98]"
        >
          Start Workout
        </Link>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <Link href="/coach" className="underline hover:text-gray-700">Coach</Link>
          <Link href="/tactical/input" className="underline hover:text-gray-700">Log readiness</Link>
        </div>
      </div>
    </div>
  );
}
