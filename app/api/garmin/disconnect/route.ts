import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  const current = (profile?.user_preferences as Record<string, unknown>) ?? {};
  const next: Record<string, unknown> = { ...current };
  delete next.garmin_access_token;
  delete next.garmin_access_secret;
  delete next.garmin_user_id;
  next.garmin_connected = false;

  const { error } = await supabase
    .from("profiles")
    .update({ user_preferences: next })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ disconnected: true }, { status: 200 });
}
