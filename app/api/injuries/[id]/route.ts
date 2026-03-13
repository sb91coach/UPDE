import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { resolveInjury } from "@/engine/injuryMemoryEngine";

/** PATCH /api/injuries/[id] — update or resolve an injury. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { resolved?: boolean; severity?: number; context?: string };

  if (body.resolved === true) {
    const resolved = resolveInjury();
    const { error } = await supabase
      .from("user_injury_log")
      .update({
        resolved: resolved.resolved,
        resolved_at: resolved.resolved_at,
      })
      .eq("id", id)
      .eq("profile_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ resolved: true });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.severity != null) updates.severity = body.severity;
  if (body.context !== undefined) updates.context = body.context;
  const { error } = await supabase
    .from("user_injury_log")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
