/**
 * Decision log — write programme adjustment events for transparency.
 * Frontend or API calls logDecision; DecisionLog component reads via API.
 */

export type DecisionLogPayload = {
  decisionType: string;
  triggerVariables?: Record<string, unknown>;
  thresholdBreached?: string;
  adjustmentMade: string;
  explanation?: string;
};

/**
 * Insert a decision log entry. Call from API route or server action with Supabase client.
 * Example:
 *   await logDecision(supabase, userId, {
 *     decisionType: "volume_reduction",
 *     triggerVariables: { sleep_trend_pct: -18, rpe_density: "high" },
 *     thresholdBreached: "sleep_trend_below_0.85",
 *     adjustmentMade: "Lower-body volume reduced",
 *     explanation: "Lower-body volume reduced due to sleep trend -18% and rising RPE density.",
 *   });
 */
/** Minimal type for Supabase client used only for insert (avoids strict PostgrestFilterBuilder mismatch). */
type SupabaseInsertClient = {
  from: (table: string) => { insert: (row: unknown) => PromiseLike<{ error: unknown }> };
};

export async function logDecision(
  supabase: SupabaseInsertClient,
  profileId: string,
  payload: DecisionLogPayload
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from("decision_logs")
    .insert({
      profile_id: profileId,
      decision_type: payload.decisionType,
      trigger_variables: payload.triggerVariables ?? {},
      threshold_breached: payload.thresholdBreached ?? null,
      adjustment_made: payload.adjustmentMade,
      explanation: payload.explanation ?? null,
    });
  return { error };
}
