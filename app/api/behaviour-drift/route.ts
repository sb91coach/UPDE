import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { getBehaviourDrift } from "@/engine/behaviourDriftModel";
import type { ComplianceWeek, DebriefSummary } from "@/engine/behaviourDriftModel";

/**
 * GET /api/behaviour-drift — friction index, compliance velocity, engagement, simplification recommendation.
 * Uses session_logs (by week) and session_debriefs.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_week, days_per_week")
    .eq("id", user.id)
    .maybeSingle();

  const currentWeek = profile?.current_week ?? 1;
  const plannedPerWeek = Math.min(5, Math.max(2, profile?.days_per_week ?? 3));

  const { data: sessions } = await supabase
    .from("session_logs")
    .select("week")
    .eq("profile_id", user.id)
    .eq("completed", true)
    .in("week", [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek].filter((w) => w >= 1));

  const weekCounts: Record<number, number> = {};
  for (let w = currentWeek - 3; w <= currentWeek; w++) {
    if (w >= 1) weekCounts[w] = 0;
  }
  sessions?.forEach((r) => {
    if (r.week != null) weekCounts[r.week] = (weekCounts[r.week] ?? 0) + 1;
  });

  const compliance_weeks: ComplianceWeek[] = [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek]
    .filter((w) => w >= 1)
    .map((week) => ({
      week,
      done: weekCounts[week] ?? 0,
      planned: plannedPerWeek,
    }))
    .reverse();

  const { data: debriefs } = await supabase
    .from("session_debriefs")
    .select("how_felt, niggles, ready_next")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const recent_debriefs: DebriefSummary[] = (debriefs ?? []).map((d) => ({
    how_felt: d.how_felt ?? 3,
    niggles: d.niggles ?? null,
    ready_next: d.ready_next ?? 3,
  }));

  const output = getBehaviourDrift({
    compliance_weeks,
    recent_debriefs,
  });

  return NextResponse.json(output);
}
