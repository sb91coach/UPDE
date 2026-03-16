import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const {
    meal_name,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    portion_multiplier,
    notes,
    raw_ai_response,
  } = body;

  if (!meal_name || calories == null) {
    return NextResponse.json({ error: "Meal name and calories required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("meal_logs")
    .insert({
      profile_id: user.id,
      meal_name,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      portion_multiplier,
      notes,
      raw_ai_response,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

