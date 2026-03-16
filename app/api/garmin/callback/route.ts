import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getGarminAccessToken } from "@/lib/garminOAuth";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const oauthToken = url.searchParams.get("oauth_token");
  const oauthVerifier = url.searchParams.get("oauth_verifier");

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.json(
      { error: "Missing oauth_token or oauth_verifier" },
      { status: 400 }
    );
  }

  const requestSecret = req.cookies.get("garmin_request_secret")?.value;
  if (!requestSecret) {
    return NextResponse.json(
      { error: "Missing Garmin request secret" },
      { status: 400 }
    );
  }

  const { token: accessToken, secret: accessSecret } = await getGarminAccessToken(
    oauthToken,
    requestSecret,
    oauthVerifier
  );

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

  const prefs = (profile?.user_preferences as Record<string, unknown>) ?? {};
  const nextPrefs = {
    ...prefs,
    garmin_access_token: accessToken,
    garmin_access_secret: accessSecret,
    garmin_connected: true,
    garmin_last_sync: null,
  };

  await supabase
    .from("profiles")
    .update({ user_preferences: nextPrefs })
    .eq("id", user.id);

  const res = NextResponse.redirect(new URL("/settings?connected=garmin", url.origin));
  res.cookies.set("garmin_request_secret", "", { maxAge: 0, path: "/" });
  return res;
}

