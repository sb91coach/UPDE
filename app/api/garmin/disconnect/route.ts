import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST() {
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
  const rest = { ...current };
  delete (rest as Record<string, unknown>).garmin_user_id;
  const next = { ...rest, garmin_connected: false };

  const { error } = await supabase
    .from("profiles")
    .update({ user_preferences: next })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ connected: false });
}
