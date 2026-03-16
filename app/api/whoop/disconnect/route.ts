import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const WHOOP_REVOKE_URL = "https://api.prod.whoop.com/developer/v2/user/access";

export async function DELETE() {
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

  if (accessToken) {
    try {
      await fetch(WHOOP_REVOKE_URL, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      console.error("Whoop disconnect error", err);
    }
  }

  const nextPrefs: Record<string, unknown> = { ...prefs };
  delete nextPrefs.whoop_access_token;
  delete nextPrefs.whoop_refresh_token;
  delete nextPrefs.whoop_token_expires_at;
  nextPrefs.whoop_connected = false;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ user_preferences: nextPrefs })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError }, { status: 500 });
  }

  return NextResponse.json({ disconnected: true }, { status: 200 });
}

