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
  } = body;

  const { error } = await supabase
    .from("profiles")
    .update({
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
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}