/**
 * Equipment detection — environments and adaptation.
 * Determined by training history and manual user selection.
 */

export const EQUIPMENT_ENVIRONMENTS = [
  "full_gym",
  "minimal_equipment",
  "home_setup",
  "outdoor_field",
  "strength_facility",
] as const;

export type EquipmentEnvironment = (typeof EQUIPMENT_ENVIRONMENTS)[number];

export const EQUIPMENT_LABELS: Record<EquipmentEnvironment, string> = {
  full_gym: "Full Gym",
  minimal_equipment: "Minimal Equipment",
  home_setup: "Home Setup",
  outdoor_field: "Outdoor / Field",
  strength_facility: "Strength Facility",
};
