import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  const {
    name,
    email,
    goal,
    sport,
    experience,
    days_per_week,
    minutes_per_session,
    equipment,
    sleep_hours,
    stress_level,
    injury_notes,
    archetype,
    readiness_score,
    momentum,
    primary_limiter,
    focus,
    signals,
    plan,
    checkin_date,
    checkin_readiness,
    checkin_feel,
    checkin_pain,
    checkin_pain_areas,
    checkin_energy,
    checkin_sleep,
  } = body;

  const updatePayload: Record<string, unknown> = {
    name,
    email,
    goal,
    sport,
    experience,
    days_per_week,
    minutes_per_session,
    equipment,
    sleep_hours,
    stress_level,
    injury_notes,
    archetype,
    readiness_score,
    momentum,
    primary_limiter,
    focus,
    signals,
    plan,
  };
  if (checkin_date !== undefined) updatePayload.checkin_date = checkin_date;
  if (checkin_readiness !== undefined) updatePayload.checkin_readiness = checkin_readiness;
  if (checkin_feel !== undefined) updatePayload.checkin_feel = checkin_feel;
  if (checkin_pain !== undefined) updatePayload.checkin_pain = checkin_pain;
  if (checkin_pain_areas !== undefined) updatePayload.checkin_pain_areas = checkin_pain_areas;
  if (checkin_energy !== undefined) updatePayload.checkin_energy = checkin_energy;
  if (checkin_sleep !== undefined) updatePayload.checkin_sleep = checkin_sleep;

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}