import OAuth from "oauth-1.0a";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const GARMIN_ACCESS_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/access_token";

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const oauthToken = url.searchParams.get("oauth_token");
  const oauthVerifier = url.searchParams.get("oauth_verifier");

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.json(
      { error: "Missing oauth_token or oauth_verifier" },
      { status: 400 }
    );
  }

  const consumerKey = process.env.GARMIN_CONSUMER_KEY;
  const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return NextResponse.json(
      { error: "Garmin consumer key/secret not configured" },
      { status: 500 }
    );
  }

  // Load stored request token secret from profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError }, { status: 500 });
  }

  const prefs = (profile?.user_preferences as Record<string, unknown>) ?? {};
  const requestToken = prefs.garmin_request_token as string | undefined;
  const requestTokenSecret = prefs.garmin_request_token_secret as string | undefined;

  if (!requestToken || !requestTokenSecret || requestToken !== oauthToken) {
    return NextResponse.json(
      { error: "Stored Garmin request token not found or mismatch" },
      { status: 400 }
    );
  }

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });

  const token = {
    key: requestToken,
    secret: requestTokenSecret,
  };

  const requestData = {
    url: GARMIN_ACCESS_TOKEN_URL,
    method: "POST" as const,
    data: { oauth_verifier: oauthVerifier },
  };

  const headers = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(GARMIN_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ oauth_verifier: oauthVerifier }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: "Failed to obtain Garmin access token", detail: text },
      { status: 502 }
    );
  }

  const body = await response.text();
  const params = new URLSearchParams(body);
  const accessToken = params.get("oauth_token");
  const accessSecret = params.get("oauth_token_secret");
  const garminUserId = params.get("userid");

  if (!accessToken || !accessSecret) {
    return NextResponse.json(
      { error: "Invalid Garmin access token response" },
      { status: 502 }
    );
  }

  const nextPrefs = {
    ...prefs,
    garmin_request_token: null,
    garmin_request_token_secret: null,
    garmin_access_token: accessToken,
    garmin_access_secret: accessSecret,
    garmin_connected: true,
    ...(garminUserId ? { garmin_user_id: garminUserId } : {}),
  };

  await supabase
    .from("profiles")
    .update({ user_preferences: nextPrefs })
    .eq("id", user.id);

  const redirectUrl = new URL("/settings", url.origin);
  return NextResponse.redirect(redirectUrl);
}

