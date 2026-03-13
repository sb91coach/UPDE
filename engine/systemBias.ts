/**
 * System bias — classify user's dominant system (strength / aerobic / hybrid)
 * for narrative (Weekly Brief) and programme emphasis.
 * Phase 2: identity model can refine further.
 */

export type SystemBiasInputs = {
  aerobic_score?: number | null;
  strength_upper?: number | null;
  strength_lower?: number | null;
  focus?: string | null;
  programme_type?: string | null; // e.g. "hybrid" | "strength" | "load_carriage_endurance"
};

export type SystemBiasLabel =
  | "Strength-dominant"
  | "Aerobic-dominant"
  | "Hybrid balanced"
  | "Load carriage / endurance"
  | "Neural / power";

/**
 * Classify current system bias for "System bias" line in Weekly Brief
 * and for programme emphasis (e.g. more Zone 2 if aerobic-deficit).
 */
export function classifySystemBias(profile: SystemBiasInputs): SystemBiasLabel {
  const focus = (profile.focus ?? profile.programme_type ?? "").toLowerCase();
  if (focus.includes("load") || focus.includes("endurance")) return "Load carriage / endurance";
  if (focus.includes("power") || focus.includes("neural")) return "Neural / power";
  if (focus.includes("strength")) return "Strength-dominant";
  if (focus.includes("aerobic") || focus.includes("cardio")) return "Aerobic-dominant";

  const a = profile.aerobic_score ?? 60;
  const s = (Number(profile.strength_upper ?? 60) + Number(profile.strength_lower ?? 60)) / 2;
  const diff = s - a;
  if (diff > 15) return "Strength-dominant";
  if (diff < -15) return "Aerobic-dominant";
  return "Hybrid balanced";
}

/**
 * Short narrative phrase for Weekly Brief (e.g. "Strength-dominant; aerobic floor building").
 */
export function systemBiasPhrase(profile: SystemBiasInputs): string {
  const bias = classifySystemBias(profile);
  const a = profile.aerobic_score ?? 60;
  if (bias === "Strength-dominant" && a < 65) return "Strength-dominant; aerobic floor building";
  if (bias === "Aerobic-dominant") return "Aerobic-dominant; strength maintenance";
  if (bias === "Hybrid balanced") return "Hybrid balanced; concurrent development";
  return bias;
}
