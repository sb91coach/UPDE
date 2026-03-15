/**
 * Identity schema — types and labels for performance identity classification.
 * Used by dashboard identity row and lib/profile/identityModel.
 */

export type IdentityLabel =
  | "Neural Dominant"
  | "Aerobic Deficit"
  | "Recovery Limited"
  | "Hybrid Balanced";

export type IdentityType =
  | "Neural Dominant Responder"
  | "Aerobic Deficit Profile"
  | "Recovery-Limited Performer"
  | "Hybrid Balanced Responder"
  | "Load Carriage Focus";

export const IDENTITY_LABELS: IdentityLabel[] = [
  "Neural Dominant",
  "Aerobic Deficit",
  "Recovery Limited",
  "Hybrid Balanced",
];
