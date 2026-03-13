import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { logDecision } from "@/engine/decisionLog";

/**
 * GET /api/decision-log — last N decision log entries for current user.
 * POST /api/decision-log — insert a decision (e.g. when guardrails applied).
 */
export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

  const { data, error } = await supabase
    .from("decision_logs")
    .select("id, created_at, decision_type, trigger_variables, threshold_breached, adjustment_made, explanation")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    decisionType: row.decision_type,
    adjustmentMade: row.adjustment_made,
    explanation: row.explanation ?? "",
    triggerVariables: row.trigger_variables ?? undefined,
    thresholdBreached: row.threshold_breached ?? undefined,
  }));

  return NextResponse.json({ entries });
}

/** POST — log a programme adjustment (trigger, threshold, modification). Used when guardrails or injury modifiers apply. */
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    decisionType?: string;
    triggerVariables?: Record<string, unknown>;
    thresholdBreached?: string;
    adjustmentMade?: string;
    explanation?: string;
  };

  const decisionType = body.decisionType ?? "guardrail_applied";
  const adjustmentMade = body.adjustmentMade ?? body.explanation ?? "Programme adjusted.";
  const payload = {
    decisionType,
    triggerVariables: body.triggerVariables ?? {},
    thresholdBreached: body.thresholdBreached ?? undefined,
    adjustmentMade,
    explanation: body.explanation ?? body.adjustmentMade ?? undefined,
  };

  const { error } = await logDecision(supabase, user.id, payload);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
