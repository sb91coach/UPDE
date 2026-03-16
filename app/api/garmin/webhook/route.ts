import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();

  const payload = await req.json();

  const garminUserId: string | undefined =
    payload.userId ?? payload.user_id ?? payload.garminUserId ?? payload.garmin_user_id;

  if (!garminUserId) {
    return NextResponse.json({ ok: true, ignored: "missing user id" }, { status: 200 });
  }

  // Find profile row whose user_preferences.garmin_user_id matches this Garmin user id
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,user_preferences,fatigue_score,sleep_score,readiness_score")
    .eq("user_preferences->>garmin_user_id", String(garminUserId))
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!profile) {
    // Webhook for a user we don't know about yet – acknowledge anyway.
    return NextResponse.json({ ok: true, ignored: "unknown user" }, { status: 200 });
  }

  const prefs = (profile.user_preferences as Record<string, unknown>) ?? {};

  const dailies = Array.isArray(payload.dailies) && payload.dailies.length > 0 ? payload.dailies[0] : undefined;
  const sleeps = Array.isArray(payload.sleeps) && payload.sleeps.length > 0 ? payload.sleeps[0] : undefined;
  const hrv = Array.isArray(payload.hrv) && payload.hrv.length > 0 ? payload.hrv[0] : undefined;
  const stressDetails =
    Array.isArray(payload.stressDetails) && payload.stressDetails.length > 0 ? payload.stressDetails[0] : undefined;
  const bodyBattery =
    Array.isArray(payload.bodyBattery) && payload.bodyBattery.length > 0 ? payload.bodyBattery[0] : undefined;

  const updates: Record<string, unknown> = {};
  const nextPrefs: Record<string, unknown> = { ...prefs };

  // Fatigue score from average stress (invert: higher stress = lower score)
  const avgStress =
    typeof dailies?.averageStressLevel === "number"
      ? dailies.averageStressLevel
      : typeof stressDetails?.avgStressLevel === "number"
      ? stressDetails.avgStressLevel
      : undefined;
  if (typeof avgStress === "number") {
    const fatigueScore = Math.max(0, Math.min(100, 100 - avgStress));
    updates.fatigue_score = fatigueScore;
  }

  // Sleep score from sleep duration and any provided score
  let sleepScore: number | undefined;
  const sleepSeconds: number | undefined =
    typeof sleeps?.sleepTimeSeconds === "number" ? sleeps.sleepTimeSeconds : undefined;
  const apiSleepScore: number | undefined =
    typeof sleeps?.sleepScores?.overall === "number" ? sleeps.sleepScores.overall : undefined;

  if (typeof apiSleepScore === "number") {
    sleepScore = apiSleepScore;
  } else if (typeof sleepSeconds === "number") {
    const hours = sleepSeconds / 3600;
    // Simple mapping: 8h => 100, 4h => 50, clamp 0–100
    const normalized = Math.max(0, Math.min(10, hours));
    sleepScore = Math.round((normalized / 8) * 100);
  }

  if (typeof sleepScore === "number") {
    updates.sleep_score = Math.max(0, Math.min(100, sleepScore));
  }

  // Readiness score contribution from nightly HRV and body battery
  const lastNightHrv: number | undefined =
    typeof hrv?.lastNight5MinHighHrv === "number" ? hrv.lastNight5MinHighHrv : undefined;
  const bbCharge: number | undefined =
    typeof bodyBattery?.bodyBatteryChargedValue === "number" ? bodyBattery.bodyBatteryChargedValue : undefined;

  if (typeof lastNightHrv === "number" || typeof bbCharge === "number") {
    let readinessFromHrv: number | undefined;
    if (typeof lastNightHrv === "number") {
      // Rough normalization: treat 100 ms as excellent, clamp 0–100
      readinessFromHrv = Math.max(0, Math.min(100, (lastNightHrv / 100) * 100));
    }
    const readinessFromBattery =
      typeof bbCharge === "number" ? Math.max(0, Math.min(100, bbCharge)) : undefined;

    const parts = [readinessFromHrv, readinessFromBattery].filter(
      (v): v is number => typeof v === "number"
    );
    if (parts.length > 0) {
      const existing = typeof profile.readiness_score === "number" ? profile.readiness_score : undefined;
      const combined = parts.reduce((sum, v) => sum + v, 0) / parts.length;
      // Light blend with existing readiness if present
      const readinessScore =
        typeof existing === "number" ? Math.round((existing + combined) / 2) : Math.round(combined);
      updates.readiness_score = Math.max(0, Math.min(100, readinessScore));
    }
  }

  // Activity load from active kilocalories
  const activeKcals: number | undefined =
    typeof dailies?.activeKilocalories === "number" ? dailies.activeKilocalories : undefined;
  if (typeof activeKcals === "number") {
    nextPrefs.activity_load = activeKcals;
  }

  if (Object.keys(updates).length === 0 && Object.keys(nextPrefs).length === Object.keys(prefs).length) {
    return NextResponse.json({ ok: true, updated: false }, { status: 200 });
  }

  updates.user_preferences = nextPrefs;

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profile.id);

  if (updateError) {
    return NextResponse.json({ error: updateError }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: true }, { status: 200 });
}

