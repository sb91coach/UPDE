import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createGarminOAuth } from "@/lib/garminOAuth";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Handle Ping: callbackURL present, fetch with consumer-only OAuth1
  if (payload.callbackURL) {
    try {
      const oauth = createGarminOAuth();
      const url = String(payload.callbackURL);
      const requestData = { url, method: "GET" as const };
      const headers = oauth.toHeader(oauth.authorize(requestData));
      const resp = await fetch(url, { method: "GET", headers });
      if (resp.ok) {
        payload = await resp.json();
      }
    } catch {
      // swallow errors; still return 200
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  }

  const garminUserId: string | undefined =
    payload.userId ?? payload.user_id ?? payload.garminUserId ?? payload.garmin_user_id;

  if (!garminUserId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,user_preferences,fatigue_score,sleep_score,readiness_score")
    .eq("user_preferences->>garmin_user_id", String(garminUserId))
    .maybeSingle();

  if (error || !profile) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const prefs = (profile.user_preferences as Record<string, unknown>) ?? {};

  const dailiesArr = Array.isArray(payload.dailies) ? payload.dailies : [];
  const sleepsArr = Array.isArray(payload.sleeps) ? payload.sleeps : [];
  const epochsArr = Array.isArray(payload.epochs) ? payload.epochs : [];
  const hrvArr = Array.isArray(payload.hrv) ? payload.hrv : [];

  const latestDaily = dailiesArr[dailiesArr.length - 1];
  const latestSleep = sleepsArr[sleepsArr.length - 1];
  const latestHrv = hrvArr[hrvArr.length - 1];

  const updates: Record<string, unknown> = {};
  const nextPrefs: Record<string, unknown> = { ...prefs };

  // Dailies: stress -> fatigue_score, resting HR, kcals, sleep hours
  if (latestDaily) {
    if (typeof latestDaily.averageStressLevel === "number") {
      updates.fatigue_score = Math.max(
        0,
        Math.min(100, 100 - latestDaily.averageStressLevel)
      );
    }
    if (typeof latestDaily.restingHeartRateInBeatsPerMinute === "number") {
      nextPrefs.resting_hr = latestDaily.restingHeartRateInBeatsPerMinute;
    }
    if (typeof latestDaily.totalKilocalories === "number") {
      nextPrefs.daily_kilocalories = latestDaily.totalKilocalories;
    }
    if (typeof latestDaily.averageSecondsAsleep === "number") {
      nextPrefs.sleep_hours = latestDaily.averageSecondsAsleep / 3600;
    }
  }

  // Sleeps: overallSleepScore -> sleep_score, stages -> sleep_stages
  if (latestSleep) {
    const scoreVal = latestSleep.overallSleepScore?.value;
    if (typeof scoreVal === "number") {
      updates.sleep_score = Math.max(0, Math.min(100, Math.round(scoreVal)));
    }
    if (latestSleep.sleepLevels) {
      nextPrefs.sleep_stages = latestSleep.sleepLevels;
    }
  }

  // Epochs: sum activeKilocalories
  if (epochsArr.length) {
    const totalActive = epochsArr.reduce(
      (sum: number, e: any) => sum + (e.activeKilocalories ?? 0),
      0
    );
    nextPrefs.activity_load = totalActive;
  }

  // HRV: weeklyAverage -> readiness, lastNight5MinHigh -> hrv_rmssd
  if (latestHrv) {
    if (typeof latestHrv.weeklyAverage === "number") {
      const hrvMs = latestHrv.weeklyAverage;
      const norm = Math.max(0, Math.min(100, ((hrvMs - 20) / (120 - 20)) * 100));
      const existing =
        typeof profile.readiness_score === "number" ? profile.readiness_score : undefined;
      const blended =
        typeof existing === "number"
          ? Math.round((existing + norm) / 2)
          : Math.round(norm);
      updates.readiness_score = blended;
    }
    if (typeof latestHrv.lastNight5MinHigh === "number") {
      nextPrefs.hrv_rmssd = latestHrv.lastNight5MinHigh;
    }
  }

  nextPrefs.garmin_last_sync = new Date().toISOString();
  updates.user_preferences = nextPrefs;

  await supabase.from("profiles").update(updates).eq("id", profile.id);

  return NextResponse.json({ ok: true }, { status: 200 });
}

