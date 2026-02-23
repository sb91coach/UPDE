import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  const { data, error } = await supabaseServer
    .from("profiles")
    .insert({
      goal: "General performance",
      sport: "General",
      experience: "Beginner",
      days_per_week: 3,
      minutes_per_session: 45,
      equipment: "Basic",
      sleep_hours: 7,
      stress_level: 3,
      injury_notes: "",
      archetype: "Hybrid Generalist",
      readiness_score: 70,
      momentum: "Stable",
      primary_limiter: "Aerobic Base",
      focus: [{ name: "Aerobic Base", gap: 32, note: "Build base capacity." }],
      signals: [{ type: "info", text: "Profile created successfully." }],
      plan: { phase: "Base", today: { title: "Day 1 — Build Capacity" } },
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
