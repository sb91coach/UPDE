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
  if (!clientId) {
    return NextResponse.json({ error: "WHOOP_CLIENT_ID not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/whoop/callback`;

  const authUrl = new URL(WHOOP_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    "read:recovery read:sleep read:body_measurement read:cycles"
  );
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}

