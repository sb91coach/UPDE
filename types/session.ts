/**
 * Performance Pathfinder — Session structure and session types.
 * Each session follows: Performance Notes, Prep/Warm-up, Primary Focus, Secondary, Accessory, Conditioning, Recovery.
 */

export const SESSION_STRUCTURE_SECTIONS = [
  "performance_notes",
  "prep_warmup",
  "primary_focus",
  "secondary_work",
  "accessory_work",
  "conditioning",
  "recovery",
] as const;

export type SessionSectionKey = (typeof SESSION_STRUCTURE_SECTIONS)[number];

export const SESSION_TYPES = [
  "strength",
  "power",
  "conditioning",
  "durability",
  "recovery",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export type SessionSectionContent = {
  title: string;
  content: string;
  durationMinutes?: number;
};

export type SessionStructure = {
  performance_notes?: SessionSectionContent;
  prep_warmup?: SessionSectionContent;
  primary_focus?: SessionSectionContent;
  secondary_work?: SessionSectionContent;
  accessory_work?: SessionSectionContent;
  conditioning?: SessionSectionContent;
  recovery?: SessionSectionContent;
};

export const SESSION_SECTION_LABELS: Record<SessionSectionKey, string> = {
  performance_notes: "Performance Notes",
  prep_warmup: "Prep / Warm-up",
  primary_focus: "Primary Focus",
  secondary_work: "Secondary Work",
  accessory_work: "Accessory Work",
  conditioning: "Conditioning",
  recovery: "Recovery",
};

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  strength: "Strength",
  power: "Power",
  conditioning: "Conditioning",
  durability: "Durability",
  recovery: "Recovery",
};
