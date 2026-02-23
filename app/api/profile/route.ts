import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { goal, sport, sessionId } = body;

    if (!goal || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("performance_profiles")
      .insert([
        {
          session_id: sessionId,
          mechanical_score: 0,
          metabolic_score: 0,
          neurological_score: 0,
          recovery_score: 0,
          structural_score: 0,
          behavioural_score: 0,
          identity_score: 0,
          archetype: "Pending Analysis",
          raw_intake: { goal, sport },
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}