/**
 * Training targets: goal/sport/course options for intake.
 * programmeType drives the programme builder (load, conditioning, exercise choice).
 */

export type ProgrammeType =
  | "load_carriage_endurance"  // P Company, All Arms, load-heavy selection
  | "pure_endurance"           // marathon, ultra, long-distance
  | "strength"                 // powerlifting, strongman, max strength
  | "hybrid"                    // general fitness, tactical, cross-training
  | "power_speed"              // sprinting, jumping, RFD
  | "team_sport"               // rugby, football, field sports
  | "combat"                   // boxing, BJJ, MMA
  | "aerobic_first";           // triathlon, cycling, swimming focus

export type TrainingOption = {
  label: string;
  programmeType: ProgrammeType;
  /** Optional short tag for display in programme header */
  tag?: string;
};

/** Grouped training targets for intake. Order and programmeType shape the programme. */
export const TRAINING_TARGET_GROUPS: { group: string; options: TrainingOption[] }[] = [
  {
    group: "Military & Selection",
    options: [
      { label: "P Company (Paras)", programmeType: "load_carriage_endurance", tag: "Load carriage · Endurance" },
      { label: "All Arms Commando Course", programmeType: "load_carriage_endurance", tag: "Load carriage · Endurance" },
      { label: "Royal Marines Commando", programmeType: "load_carriage_endurance", tag: "Load carriage · Endurance" },
      { label: "UKSF Selection", programmeType: "load_carriage_endurance", tag: "Load carriage · Endurance" },
      { label: "Infantry Phase 1/2", programmeType: "load_carriage_endurance", tag: "Load carriage · Hybrid" },
      { label: "Officer Selection (e.g. AOSB)", programmeType: "hybrid", tag: "Hybrid · Fitness standards" },
      { label: "Other military / tactical course", programmeType: "load_carriage_endurance", tag: "Tactical" },
    ],
  },
  {
    group: "Endurance & Running",
    options: [
      { label: "Marathon", programmeType: "pure_endurance", tag: "Aerobic · Threshold" },
      { label: "Half marathon", programmeType: "pure_endurance", tag: "Aerobic · Threshold" },
      { label: "10K / 5K", programmeType: "pure_endurance", tag: "Aerobic · Speed" },
      { label: "Ultra / trail", programmeType: "pure_endurance", tag: "Aerobic · Durability" },
      { label: "Triathlon (sprint / standard)", programmeType: "aerobic_first", tag: "Multi-discipline" },
      { label: "Ironman / long-course tri", programmeType: "aerobic_first", tag: "Aerobic first" },
      { label: "Cycling (road / sportive)", programmeType: "aerobic_first", tag: "Aerobic" },
      { label: "Swimming (distance / open water)", programmeType: "aerobic_first", tag: "Aerobic" },
      { label: "Rowing (2K / 5K)", programmeType: "hybrid", tag: "Hybrid · Power-endurance" },
    ],
  },
  {
    group: "Strength & Power",
    options: [
      { label: "Powerlifting", programmeType: "strength", tag: "Max strength" },
      { label: "Strongman", programmeType: "strength", tag: "Strength · Conditioning" },
      { label: "Weightlifting (Olympic)", programmeType: "power_speed", tag: "Power · RFD" },
      { label: "CrossFit / functional fitness", programmeType: "hybrid", tag: "Hybrid" },
      { label: "Bodybuilding / hypertrophy", programmeType: "strength", tag: "Hypertrophy" },
      { label: "Sprinting (track / field)", programmeType: "power_speed", tag: "Power · Speed" },
      { label: "Jumping / plyometrics", programmeType: "power_speed", tag: "RFD · Power" },
    ],
  },
  {
    group: "Team & Field Sports",
    options: [
      { label: "Rugby (union / league)", programmeType: "team_sport", tag: "Power · Endurance" },
      { label: "Football / soccer", programmeType: "team_sport", tag: "Repeat sprint · Aerobic" },
      { label: "Hockey (field)", programmeType: "team_sport", tag: "Hybrid" },
      { label: "Basketball", programmeType: "team_sport", tag: "Power · Agility" },
      { label: "American football", programmeType: "team_sport", tag: "Power · Speed" },
      { label: "Netball", programmeType: "team_sport", tag: "Agility · Endurance" },
      { label: "Lacrosse", programmeType: "team_sport", tag: "Hybrid" },
    ],
  },
  {
    group: "Combat & Martial Arts",
    options: [
      { label: "Boxing", programmeType: "combat", tag: "Power · Conditioning" },
      { label: "BJJ / grappling", programmeType: "combat", tag: "Strength-endurance" },
      { label: "MMA", programmeType: "combat", tag: "Hybrid · Conditioning" },
      { label: "Judo", programmeType: "combat", tag: "Power · Grips" },
      { label: "Muay Thai / kickboxing", programmeType: "combat", tag: "Power · Conditioning" },
      { label: "Wrestling", programmeType: "combat", tag: "Strength · Power" },
    ],
  },
  {
    group: "General & Lifestyle",
    options: [
      { label: "General fitness", programmeType: "hybrid", tag: "Hybrid" },
      { label: "Fat loss", programmeType: "hybrid", tag: "Hybrid · Conditioning" },
      { label: "Hybrid performance (strength + cardio)", programmeType: "hybrid", tag: "Hybrid" },
      { label: "Long-term health & resilience", programmeType: "hybrid", tag: "Human-first" },
      { label: "Return from injury / rebuild", programmeType: "hybrid", tag: "Durability first" },
      { label: "Other (describe in next steps)", programmeType: "hybrid", tag: "Custom" },
    ],
  },
];

/** Flat list of all options for a single select if needed */
export const ALL_TRAINING_OPTIONS: TrainingOption[] = TRAINING_TARGET_GROUPS.flatMap(
  (g) => g.options
);

export function getProgrammeTypeForGoal(goalLabel: string | null | undefined): ProgrammeType {
  if (!goalLabel) return "hybrid";
  const found = ALL_TRAINING_OPTIONS.find(
    (o) => o.label.toLowerCase() === goalLabel.toLowerCase()
  );
  return found?.programmeType ?? "hybrid";
}
