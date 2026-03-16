import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { syncWhoopForUser } from "@/lib/whoopSync";

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

export async function GET(req: NextRequest) {
  const stateFromQuery = req.nextUrl.searchParams.get("state") ?? "";
  const stateCookie = req.cookies.get("whoop_oauth_state")?.value ?? "";

  if (!stateFromQuery || !stateCookie || stateFromQuery !== stateCookie) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !clientSecret || !appUrl) {
    return NextResponse.json(
      { error: "WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET / NEXT_PUBLIC_APP_URL not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${appUrl}/api/whoop/callback`;

  const tokenResp = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    return NextResponse.json(
      { error: "Failed to exchange code for token", detail: text },
      { status: 502 }
    );
  }

  const tokenJson = (await tokenResp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  const accessToken = tokenJson.access_token;
  const refreshToken = tokenJson.refresh_token ?? "";
  const expiresIn = tokenJson.expires_in ?? 0;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Whoop token response missing access_token" },
      { status: 502 }
    );
  }

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
    whoop_access_token: accessToken,
    whoop_refresh_token: refreshToken,
    whoop_token_expires_at: Date.now() + expiresIn * 1000,
    whoop_connected: true,
  };

  await supabase
    .from("profiles")
    .update({ user_preferences: nextPrefs })
    .eq("id", user.id);

  // run initial sync (non-blocking errors)
  try {
    await syncWhoopForUser(user.id);
  } catch {
    // ignore sync failure
  }

  const redirectUrl = new URL("/settings?connected=whoop", appUrl);
  const res = NextResponse.redirect(redirectUrl.toString());
  res.cookies.set("whoop_oauth_state", "", { maxAge: 0, path: "/" });
  return res;
}
