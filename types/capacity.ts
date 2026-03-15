/**
 * Performance Pathfinder Coaching System — Capacity Model.
 * Six performance domains with score (0–100), tier classification, and confidence.
 */

export const CAPACITY_DOMAINS = [
  "force_production",
  "force_expression",
  "energy_system_efficiency",
  "movement_integrity",
  "durability",
  "recovery_capacity",
] as const;

export type CapacityDomain = (typeof CAPACITY_DOMAINS)[number];

export const CAPACITY_TIERS = [
  "Low",
  "Developing",
  "Advanced",
  "High Performance",
  "Elite",
] as const;

export type CapacityTier = (typeof CAPACITY_TIERS)[number];

/** Tier bands: 0–39 Low, 40–59 Developing, 60–74 Advanced, 75–89 High Performance, 90–100 Elite */
export const TIER_BANDS: { min: number; max: number; tier: CapacityTier }[] = [
  { min: 0, max: 39, tier: "Low" },
  { min: 40, max: 59, tier: "Developing" },
  { min: 60, max: 74, tier: "Advanced" },
  { min: 75, max: 89, tier: "High Performance" },
  { min: 90, max: 100, tier: "Elite" },
];

export type ConfidenceLevel = "low" | "medium" | "high";

export type CapacityScore = {
  domain: CapacityDomain;
  score: number;
  tier: CapacityTier;
  confidence: ConfidenceLevel;
};

export type CapacityProfile = {
  scores: Record<CapacityDomain, CapacityScore>;
  lastUpdated: string; // ISO date
};

export const CAPACITY_DOMAIN_LABELS: Record<CapacityDomain, string> = {
  force_production: "Force Production",
  force_expression: "Force Expression",
  energy_system_efficiency: "Energy System Efficiency",
  movement_integrity: "Movement Integrity",
  durability: "Durability",
  recovery_capacity: "Recovery Capacity",
};
