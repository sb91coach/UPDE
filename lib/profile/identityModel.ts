/**
 * Identity model — classify user into a performance identity type
 * for narrative (Weekly Brief) and programme bias.
 * Phase 2: wire to dashboard and programme builder.
 */

import type { SystemBiasLabel } from "@/engine/systemBias";
import { classifySystemBias } from "@/engine/systemBias";
import type { RecoveryBandwidth } from "@/engine/fatigueModel";
import { recoveryBandwidth } from "@/engine/fatigueModel";
import type { FatigueInputs } from "@/engine/fatigueModel";
import type { MomentumInputs } from "@/engine/momentumEngine";
import { frictionIndex } from "@/engine/momentumEngine";

export type IdentityType =
  | "Neural Dominant Responder"
  | "Aerobic Deficit Profile"
  | "Recovery-Limited Performer"
  | "Hybrid Balanced Responder"
  | "Load Carriage Focus";

export type IdentityInputs = FatigueInputs & MomentumInputs & {
  primary_limiter?: string | null;
  aerobic_score?: number | null;
  strength_upper?: number | null;
  strength_lower?: number | null;
  focus?: string | null;
  programme_type?: string | null;
};

/**
 * Classify identity from system bias, recovery bandwidth, primary limiter, friction.
 * Programming bias can then emphasise recovery, aerobic base, or neural work accordingly.
 */
export function classifyIdentity(profile: IdentityInputs): IdentityType {
  const bias: SystemBiasLabel = classifySystemBias(profile);
  const band: RecoveryBandwidth = recoveryBandwidth(profile);
  const friction = frictionIndex(profile);
  const limiter = (profile.primary_limiter ?? "").toLowerCase();

  if (band === "critical" || band === "compressed") return "Recovery-Limited Performer";
  if (friction > 0.4) return "Recovery-Limited Performer"; // Compliance drop-off

  if (bias === "Load carriage / endurance") return "Load Carriage Focus";
  if (bias === "Neural / power") return "Neural Dominant Responder";
  if (bias === "Aerobic-dominant") return "Hybrid Balanced Responder";

  const a = profile.aerobic_score ?? 60;
  if (bias === "Strength-dominant" && a < 55) return "Aerobic Deficit Profile";
  if (bias === "Strength-dominant") return "Neural Dominant Responder";

  return "Hybrid Balanced Responder";
}

/**
 * Short label for UI (e.g. Performance Identity card on dashboard).
 */
export function identityLabel(profile: IdentityInputs): string {
  return classifyIdentity(profile);
}
