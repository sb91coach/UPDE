/**
 * Identity classifier — Neural Dominant, Aerobic Deficit, Recovery Limited, Hybrid Balanced.
 * Classification logic based on strength vs aerobic gap, recovery bandwidth, trend velocity.
 * Re-exports from identityModel for modular engine surface; spec labels aligned.
 */

import type { IdentityType } from "@/lib/profile/identityModel";
import { classifyIdentity } from "@/lib/profile/identityModel";

export type IdentityLabel =
  | "Neural Dominant"
  | "Aerobic Deficit"
  | "Recovery Limited"
  | "Hybrid Balanced";

/** Map full identity type to short spec label for UI. */
export function identityToSpecLabel(type: IdentityType): IdentityLabel {
  if (type === "Neural Dominant Responder") return "Neural Dominant";
  if (type === "Aerobic Deficit Profile") return "Aerobic Deficit";
  if (type === "Recovery-Limited Performer") return "Recovery Limited";
  if (type === "Hybrid Balanced Responder" || type === "Load Carriage Focus") return "Hybrid Balanced";
  return "Hybrid Balanced";
}

export type IdentityClassifierInputs = Parameters<typeof classifyIdentity>[0];

/**
 * Classify identity and return spec-aligned label.
 * Uses strength vs aerobic gap, recovery bandwidth, friction/trend velocity.
 */
export function classifyIdentitySpec(profile: IdentityClassifierInputs): IdentityLabel {
  const full = classifyIdentity(profile);
  return identityToSpecLabel(full);
}

export { classifyIdentity };
export type { IdentityType };
