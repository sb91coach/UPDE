import OAuth from "oauth-1.0a";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const GARMIN_REQUEST_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/request_token";

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const consumerKey = process.env.GARMIN_CONSUMER_KEY;
  const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return NextResponse.json(
      { error: "Garmin consumer key/secret not configured" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const callbackUrl = `${url.origin}/api/garmin/callback`;

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });

  const requestData = {
    url: GARMIN_REQUEST_TOKEN_URL,
    method: "POST" as const,
    data: { oauth_callback: callbackUrl },
  };

  const headers = oauth.toHeader(oauth.authorize(requestData));

  const response = await fetch(GARMIN_REQUEST_TOKEN_URL, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ oauth_callback: callbackUrl }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: "Failed to obtain Garmin request token", detail: text },
      { status: 502 }
    );
  }

  const body = await response.text();
  const params = new URLSearchParams(body);
  const oauthToken = params.get("oauth_token");
  const oauthTokenSecret = params.get("oauth_token_secret");

  if (!oauthToken || !oauthTokenSecret) {
    return NextResponse.json(
      { error: "Invalid Garmin request token response" },
      { status: 502 }
    );
  }

  // Persist request token + secret in user_preferences for later use in callback
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  const currentPrefs = (profile?.user_preferences as Record<string, unknown>) ?? {};
  const nextPrefs = {
    ...currentPrefs,
    garmin_request_token: oauthToken,
    garmin_request_token_secret: oauthTokenSecret,
  };

  await supabase
    .from("profiles")
    .update({ user_preferences: nextPrefs })
    .eq("id", user.id);

  const redirectUrl = `https://connect.garmin.com/oauthConfirm?oauth_token=${encodeURIComponent(
    oauthToken
  )}`;

  return NextResponse.redirect(redirectUrl);
}

