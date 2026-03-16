import { createServerSupabaseClient } from "@/lib/supabaseServer";

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_BASE_V2 = "https://api.prod.whoop.com/developer/v2";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function syncWhoopData(
  userId: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiresAt: number
): Promise<void> {
  if (!userId || !accessToken) return;

  const supabase = await createServerSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_preferences, readiness_score, sleep_score, fatigue_score")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("Whoop sync: failed to load profile", profileError);
    return;
  }

  let currentAccessToken = accessToken;
  let currentRefreshToken = refreshToken;
  let currentExpiresAt = tokenExpiresAt;
  let prefs = (profile.user_preferences as Record<string, unknown>) ?? {};

  async function maybeRefreshToken(): Promise<void> {
    try {
      const now = Date.now();
      if (!currentRefreshToken) return;
      if (currentExpiresAt && currentExpiresAt > now + 60_000) return;

      const clientId = process.env.WHOOP_CLIENT_ID;
      const clientSecret = process.env.WHOOP_CLIENT_SECRET;
      if (!clientId || !clientSecret) return;

      const resp = await fetch(WHOOP_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: currentRefreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      if (!resp.ok) {
        console.error("Whoop token refresh failed", await resp.text());
        return;
      }
      const json = (await resp.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      if (!json.access_token) return;

      currentAccessToken = json.access_token;
      if (json.refresh_token) currentRefreshToken = json.refresh_token;
      if (typeof json.expires_in === "number") {
        currentExpiresAt = Date.now() + json.expires_in * 1000;
      }

      prefs = {
        ...prefs,
        whoop_access_token: currentAccessToken,
        whoop_refresh_token: currentRefreshToken,
        whoop_token_expires_at: currentExpiresAt,
      };

      await supabase
        .from("profiles")
        .update({ user_preferences: prefs })
        .eq("id", userId);
    } catch (err) {
      console.error("Whoop token refresh error", err);
    }
  }

  async function fetchWithAuth(path: string): Promise<any | null> {
    const doFetch = async (token: string) =>
      fetch(`${WHOOP_BASE_V2}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

    let resp = await doFetch(currentAccessToken);
    if (resp.status === 401) {
      await maybeRefreshToken();
      if (!currentAccessToken) return null;
      resp = await doFetch(currentAccessToken);
    }
    if (!resp.ok) {
      console.error(`Whoop API ${path} error`, resp.status, await resp.text());
      return null;
    }
    return resp.json();
  }

  // STEP 1: proactive refresh if needed
  await maybeRefreshToken();

  // STEP 2: latest recovery
  const recoveryJson = await fetchWithAuth("/recovery?limit=1");
  const recoveryRecord =
    recoveryJson?.records && Array.isArray(recoveryJson.records) && recoveryJson.records.length
      ? recoveryJson.records[0]
      : undefined;

  const updates: Record<string, unknown> = {};
  const nextPrefs: Record<string, unknown> = { ...prefs };

  if (recoveryRecord?.score) {
    const recScore = recoveryRecord.score.recovery_score;
    if (typeof recScore === "number") {
      updates.readiness_score = clamp(Math.round(recScore), 0, 100);
    }
    const hrv = recoveryRecord.score.hrv_rmssd_milli;
    if (typeof hrv === "number") {
      const normalized = clamp(((hrv - 20) / (120 - 20)) * 100, 0, 100);
      nextPrefs.hrv_rmssd = Math.round(normalized);
    }
    const rhr = recoveryRecord.score.resting_heart_rate;
    if (typeof rhr === "number") {
      nextPrefs.resting_hr = rhr;
    }
  }

  // STEP 3: latest sleep
  const sleepJson = await fetchWithAuth("/activity/sleep?limit=1");
  const sleepRecord =
    sleepJson?.records && Array.isArray(sleepJson.records) && sleepJson.records.length
      ? sleepJson.records[0]
      : undefined;

  if (sleepRecord && sleepRecord.score && sleepRecord.nap !== true) {
    const sleepPerf = sleepRecord.score.sleep_performance_percentage;
    if (typeof sleepPerf === "number") {
      updates.sleep_score = clamp(Math.round(sleepPerf), 0, 100);
    }
    const eff = sleepRecord.score.sleep_efficiency_percentage;
    if (typeof eff === "number") {
      nextPrefs.sleep_efficiency = clamp(Math.round(eff), 0, 100);
    }
    const stage = sleepRecord.score.stage_summary;
    if (
      stage &&
      typeof stage.total_rem_sleep_time_milli === "number" &&
      typeof stage.total_in_bed_time_milli === "number" &&
      stage.total_in_bed_time_milli > 0
    ) {
      const remPct =
        (stage.total_rem_sleep_time_milli / stage.total_in_bed_time_milli) * 100;
      nextPrefs.rem_percentage = clamp(Math.round(remPct), 0, 100);
    }
  }

  // STEP 4: latest cycle
  const cycleJson = await fetchWithAuth("/cycle?limit=1");
  const cycleRecord =
    cycleJson?.records && Array.isArray(cycleJson.records) && cycleJson.records.length
      ? cycleJson.records[0]
      : undefined;

  if (cycleRecord?.score) {
    const strain = cycleRecord.score.strain;
    if (typeof strain === "number") {
      const fatigue = Math.round(clamp(strain, 0, 21) / 21 * 100);
      updates.fatigue_score = fatigue;
    }
    const kj = cycleRecord.score.kilojoule;
    if (typeof kj === "number") {
      nextPrefs.daily_kilojoule = kj;
    }
  }

  nextPrefs.whoop_last_sync = new Date().toISOString();

  if (Object.keys(updates).length === 0 && nextPrefs === prefs) {
    return;
  }

  updates.user_preferences = nextPrefs;

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (updateError) {
    console.error("Whoop sync: failed to update profile", updateError);
  }
}


