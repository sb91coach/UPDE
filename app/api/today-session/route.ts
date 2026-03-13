import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { getTodaySessionSummary } from "@/lib/todaySessionSummary";

/**
 * GET /api/today-session — today's session summary + sessions this week count.
 * Used by dashboard for Today's session card and "Sessions this week".
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("current_week, days_per_week, minutes_per_session, checkin_date, checkin_readiness, checkin_feel, checkin_pain, checkin_energy, checkin_sleep, focus, goal")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: profileError?.message ?? "Profile not found" },
      { status: profileError?.code === "PGRST116" ? 404 : 500 }
    );
  }

  const todaySession = getTodaySessionSummary(profile);

  const week = profile.current_week ?? 1;
  const planned = Math.min(5, Math.max(2, profile.days_per_week ?? 3));

  const { count, error: countError } = await supabase
    .from("session_logs")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("week", week);

  const completed = countError ? 0 : (count ?? 0);

  return NextResponse.json({
    todaySession,
    sessionsThisWeek: { completed, planned },
  });
}
