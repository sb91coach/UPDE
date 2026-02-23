import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("performance_profiles")
    .insert([
      {
        mechanical_score: 5,
        metabolic_score: 6,
        neurological_score: 4,
        recovery_score: 7,
        structural_score: 6,
        behavioural_score: 8,
        identity_score: 5,
        archetype: "Test Archetype",
        raw_intake: { test: true }
      }
    ])
    .select();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}