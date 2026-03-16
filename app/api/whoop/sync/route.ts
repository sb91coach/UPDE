import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { syncWhoopData } from "@/lib/whoopSync";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const prefs = (profile?.user_preferences as Record<string, unknown>) ?? {};
  const accessToken = prefs.whoop_access_token as string | undefined;
  const refreshToken = prefs.whoop_refresh_token as string | undefined;
  const expiresAt = prefs.whoop_token_expires_at as number | undefined;
  const connected = prefs.whoop_connected === true;

  if (!connected || !accessToken || !refreshToken || !expiresAt) {
    return NextResponse.json({ error: "Whoop not connected" }, { status: 400 });
  }

  await syncWhoopData(user.id, accessToken, refreshToken, expiresAt);

  return NextResponse.json({
    synced: true,
    timestamp: new Date().toISOString(),
  });
}

