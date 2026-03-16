import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${url.origin}/api/whoop/callback`;

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

  if (!accessToken) {
    return NextResponse.json(
      { error: "Whoop token response missing access_token" },
      { status: 502 }
    );
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
    whoop_connected: true,
  };

  await supabase
    .from("profiles")
    .update({ user_preferences: nextPrefs })
    .eq("id", user.id);

  // Optionally trigger an initial sync here by calling the sync endpoint server-side.
  try {
    await fetch(`${url.origin}/api/whoop/sync`, {
      method: "GET",
      headers: {
        Cookie: (req.headers as Headers).get("cookie") ?? "",
      },
    });
  } catch {
    // ignore sync failure; user can sync later
  }

  const redirectUrl = new URL("/settings", url.origin);
  return NextResponse.redirect(redirectUrl);
}

