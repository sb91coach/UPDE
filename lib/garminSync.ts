import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { signGarminRequest } from "@/lib/garminOAuth";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function syncGarminData(
  userId: string,
  accessToken: string,
  accessSecret: string
): Promise<void> {
  if (!userId || !accessToken || !accessSecret) return;

  const supabase = await createServerSupabaseClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_preferences, readiness_score, sleep_score, fatigue_score")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    console.error("Garmin sync: failed to load profile", error);
    return;
  }

  const prefs = (profile.user_preferences as Record<string, unknown>) ?? {};
  const updates: Record<string, unknown> = {};
  const nextPrefs: Record<string, unknown> = { ...prefs };

  const now = new Date();
  const nowUtcSec = Math.floor(now.getTime() / 1000);
  const todayMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayMidnightSec = Math.floor(todayMidnightUtc.getTime() / 1000);
  const yesterdayMidnightUtc = new Date(todayMidnightUtc.getTime() - 24 * 3600 * 1000);
  const yesterdayMidnightSec = Math.floor(yesterdayMidnightUtc.getTime() / 1000);

  const dailyUrl = `https://apis.garmin.com/wellness-api/rest/dailies?uploadStartTimeInSeconds=${todayMidnightSec}&uploadEndTimeInSeconds=${nowUtcSec}`;
  const dailyHeaders = signGarminRequest(dailyUrl, "GET", accessToken, accessSecret);

  try {
    const dailyResp = await fetch(dailyUrl, { method: "GET", headers: dailyHeaders });
    if (dailyResp.ok) {
      const dailies = (await dailyResp.json()) as any[];
      const latest = dailies[dailies.length - 1];
      if (latest) {
        if (typeof latest.averageStressLevel === "number") {
          updates.fatigue_score = clamp(100 - latest.averageStressLevel, 0, 100);
        }
        if (typeof latest.restingHeartRateInBeatsPerMinute === "number") {
          nextPrefs.resting_hr = latest.restingHeartRateInBeatsPerMinute;
        }
        if (typeof latest.totalKilocalories === "number") {
          nextPrefs.daily_kilocalories = latest.totalKilocalories;
        }
        if (typeof latest.averageSecondsAsleep === "number") {
          nextPrefs.sleep_hours = latest.averageSecondsAsleep / 3600;
        }
      }
    }
  } catch (err) {
    console.error("Garmin daily sync error", err);
  }

  const sleepUrl = `https://apis.garmin.com/wellness-api/rest/sleeps?uploadStartTimeInSeconds=${yesterdayMidnightSec}&uploadEndTimeInSeconds=${nowUtcSec}`;
  const sleepHeaders = signGarminRequest(sleepUrl, "GET", accessToken, accessSecret);

  try {
    const sleepResp = await fetch(sleepUrl, { method: "GET", headers: sleepHeaders });
    if (sleepResp.ok) {
      const sleeps = (await sleepResp.json()) as any[];
      const latest = sleeps[sleeps.length - 1];
      if (latest) {
        const scoreVal = latest.overallSleepScore?.value;
        if (typeof scoreVal === "number") {
          updates.sleep_score = clamp(Math.round(scoreVal), 0, 100);
        }
        if (latest.sleepLevels) {
          nextPrefs.sleep_stages = latest.sleepLevels;
        }
      }
    }
  } catch (err) {
    console.error("Garmin sleep sync error", err);
  }

  nextPrefs.garmin_last_sync = new Date().toISOString();
  updates.user_preferences = nextPrefs;

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (updateError) {
    console.error("Garmin sync: failed to update profile", updateError);
  }
}

