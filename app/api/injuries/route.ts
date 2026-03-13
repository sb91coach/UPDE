import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import {
  logInjury,
  updateInjury,
  type InjuryEntry,
  type InjuryPayload,
} from "@/engine/injuryMemoryEngine";

/** GET /api/injuries — active (unresolved) injuries for current user. */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_injury_log")
    .select("id, profile_id, body_part, severity, context, first_reported, last_reported, resolved, resolved_at, classification, risk_level")
    .eq("profile_id", user.id)
    .order("last_reported", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []).map((row) => ({
    id: row.id,
    profile_id: row.profile_id,
    body_part: row.body_part,
    severity: row.severity,
    context: row.context,
    first_reported: row.first_reported,
    last_reported: row.last_reported,
    resolved: row.resolved,
    resolved_at: row.resolved_at,
    classification: row.classification,
    risk_level: row.risk_level,
  })) as InjuryEntry[];

  return NextResponse.json({ entries });
}

/** POST /api/injuries — log new injury or re-report (upsert by body_part if recent). */
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as InjuryPayload & { id?: string };
  const { body_part, severity, context, classification } = body;
  if (!body_part || severity == null) {
    return NextResponse.json({ error: "body_part and severity required" }, { status: 400 });
  }

  const payload: InjuryPayload = { body_part, severity, context: context ?? null, classification: classification ?? null };

  const { data: existing } = await supabase
    .from("user_injury_log")
    .select("id, body_part, severity, context, first_reported, last_reported, resolved, resolved_at, classification, risk_level")
    .eq("profile_id", user.id)
    .eq("body_part", body_part)
    .eq("resolved", false)
    .order("last_reported", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const reportCount = 2;
    const { updateInjury: updateFn } = await import("@/engine/injuryMemoryEngine");
    const entry: InjuryEntry = {
      id: existing.id,
      profile_id: user.id,
      body_part: existing.body_part,
      severity: existing.severity,
      context: existing.context,
      first_reported: existing.first_reported,
      last_reported: existing.last_reported,
      resolved: existing.resolved,
      resolved_at: existing.resolved_at,
      classification: existing.classification,
      risk_level: existing.risk_level as InjuryEntry["risk_level"],
    };
    const updates = updateFn(entry, { severity, context: context ?? undefined }, reportCount);
    const { error: updateError } = await supabase
      .from("user_injury_log")
      .update({
        last_reported: updates.last_reported,
        severity: updates.severity,
        context: updates.context,
        classification: updates.classification,
        risk_level: updates.risk_level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ updated: true, id: existing.id });
  }

  const existingCount = 0;
  const row = logInjury(payload, existingCount);
  const { data: inserted, error: insertError } = await supabase
    .from("user_injury_log")
    .insert({
      profile_id: user.id,
      body_part: row.body_part,
      severity: row.severity,
      context: row.context,
      first_reported: row.first_reported,
      last_reported: row.last_reported,
      resolved: row.resolved,
      resolved_at: row.resolved_at,
      classification: row.classification,
      risk_level: row.risk_level,
    })
    .select("id")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ created: true, id: inserted.id });
}
