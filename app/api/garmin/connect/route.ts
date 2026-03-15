import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

/**
 * Start Garmin Connect OAuth or mark integration as connected.
 * If GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET are set, redirect to Garmin OAuth.
 * Otherwise, for demo/development, we can set garmin_connected in user_preferences (optional).
 */
export async function POST(_req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const consumerKey = process.env.GARMIN_CONSUMER_KEY;
  const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

  if (consumerKey && consumerSecret) {
    // TODO: Build Garmin OAuth 1.0a flow: request token, redirect to Garmin, then callback to save tokens.
    // For now return a placeholder so the button doesn't 404.
    return NextResponse.json(
      { error: "Garmin OAuth is not yet implemented. Use the Disconnect flow to toggle connection state for testing." },
      { status: 501 }
    );
  }

  // No Garmin keys: allow "soft connect" for demo (store flag only).
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  const current = (profile?.user_preferences as Record<string, unknown>) ?? {};
  const next = { ...current, garmin_connected: true };

  const { error } = await supabase
    .from("profiles")
    .update({ user_preferences: next })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ connected: true });
}
