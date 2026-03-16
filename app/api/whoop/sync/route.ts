import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_BASE = "https://api.prod.whoop.com/developer/v1";

async function fetchWhoopWithRefresh(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  path: string
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const prefs = (profile?.user_preferences as Record<string, unknown>) ?? {};
  let accessToken = prefs.whoop_access_token as string | undefined;
  const refreshToken = prefs.whoop_refresh_token as string | undefined;

  if (!accessToken) {
    throw new Error("Missing Whoop access token");
  }

  const doFetch = async (token: string) => {
    const resp = await fetch(`${WHOOP_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp;
  };

  let resp = await doFetch(accessToken);
  if (resp.status === 401 && refreshToken) {
    // try refresh
    const clientId = process.env.WHOOP_CLIENT_ID;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET;
    if (clientId && clientSecret) {
      const tokenResp = await fetch(WHOOP_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      if (tokenResp.ok) {
        const tokenJson = (await tokenResp.json()) as {
          access_token: string;
          refresh_token?: string;
        };
        accessToken = tokenJson.access_token;
        const nextPrefs = {
          ...prefs,
          whoop_access_token: tokenJson.access_token,
          ...(tokenJson.refresh_token ? { whoop_refresh_token: tokenJson.refresh_token } : {}),
        };
        await supabase
          .from("profiles")
          .update({ user_preferences: nextPrefs })
          .eq("id", userId);
        resp = await doFetch(accessToken);
      }
    }
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Whoop API error (${resp.status}): ${text}`);
  }

  return (await resp.json()) as unknown;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Load preferences to ensure whoop_connected and tokens exist
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_preferences,readiness_score,fatigue_score,sleep_score")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const prefs = (profile?.user_preferences as Record<string, unknown>) ?? {};
  if (!prefs.whoop_access_token) {
    return NextResponse.json({ error: "Whoop not connected" }, { status: 400 });
  }

  try {
    const [recoveryJson, sleepJson, cycleJson] = await Promise.all([
      fetchWhoopWithRefresh(supabase, user.id, "/recovery?limit=1"),
      fetchWhoopWithRefresh(supabase, user.id, "/sleep?limit=1"),
      fetchWhoopWithRefresh(supabase, user.id, "/cycle?limit=1"),
    ]);

    // Shape may be { records: [...] } or just an array; handle both.
    const latestRecovery =
      Array.isArray(recoveryJson) && recoveryJson.length
        ? recoveryJson[0]
        : (recoveryJson as any)?.records?.[0];
    const latestSleep =
      Array.isArray(sleepJson) && sleepJson.length ? sleepJson[0] : (sleepJson as any)?.records?.[0];
    const latestCycle =
      Array.isArray(cycleJson) && cycleJson.length ? cycleJson[0] : (cycleJson as any)?.records?.[0];

    const updates: Record<string, unknown> = {};
    const nextPrefs: Record<string, unknown> = { ...prefs };

    // readiness_score from recovery.score.recovery_score
    const recoveryScore =
      latestRecovery?.score?.recovery_score ??
      latestRecovery?.score?.recoveryScore ??
      latestRecovery?.score?.overall;
    if (typeof recoveryScore === "number") {
      updates.readiness_score = Math.max(0, Math.min(100, Math.round(recoveryScore)));
    }

    // HRV (rmssd) normalized 20–120 ms -> 0–100
    const hrvRmssd =
      latestRecovery?.score?.hrv_rmssd_milli ?? latestRecovery?.score?.hrvRmssdMilli ?? undefined;
    if (typeof hrvRmssd === "number") {
      const clamped = Math.max(20, Math.min(120, hrvRmssd));
      const normalized = ((clamped - 20) / 100) * 100;
      nextPrefs.hrv_rmssd = Math.round(normalized);
    }

    // sleep_score from sleep.score.sleep_performance_percentage
    const sleepPerf =
      latestSleep?.score?.sleep_performance_percentage ??
      latestSleep?.score?.sleepPerformancePercentage ??
      latestSleep?.score?.overall;
    if (typeof sleepPerf === "number") {
      updates.sleep_score = Math.max(0, Math.min(100, Math.round(sleepPerf)));
    }

    // fatigue_score from cycle.score.strain (0–21 -> 0–100)
    const strain = latestCycle?.score?.strain ?? latestCycle?.score?.strain_score;
    if (typeof strain === "number") {
      const normalized = Math.max(0, Math.min(21, strain));
      updates.fatigue_score = Math.round((normalized / 21) * 100);
    }

    if (Object.keys(updates).length > 0 || nextPrefs !== prefs) {
      updates.user_preferences = nextPrefs;
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (updateError) {
        return NextResponse.json({ error: updateError }, { status: 500 });
      }
    }

    return NextResponse.json({
      readiness_score: updates.readiness_score ?? profile?.readiness_score ?? null,
      sleep_score: updates.sleep_score ?? profile?.sleep_score ?? null,
      fatigue_score: updates.fatigue_score ?? profile?.fatigue_score ?? null,
      hrv_rmssd: nextPrefs.hrv_rmssd ?? null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown Whoop sync error" },
      { status: 502 }
    );
  }
}

