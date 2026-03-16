import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: "WHOOP_CLIENT_ID or NEXT_PUBLIC_APP_URL not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${appUrl}/api/whoop/callback`;

  const state = crypto.randomBytes(8).toString("hex");

  const authUrl = new URL(WHOOP_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    "read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement"
  );
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("whoop_oauth_state", state, {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return res;
}

