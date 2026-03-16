import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { syncGarminData } from "@/lib/garminSync";

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
  const accessToken = prefs.garmin_access_token as string | undefined;
  const accessSecret = prefs.garmin_access_secret as string | undefined;
  const connected = prefs.garmin_connected === true;

  if (!connected || !accessToken || !accessSecret) {
    return NextResponse.json({ error: "Garmin not connected" }, { status: 400 });
  }

  await syncGarminData(user.id, accessToken, accessSecret);

  return NextResponse.json({ synced: true, timestamp: new Date().toISOString() });
}

