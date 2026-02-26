/**
 * Performance benchmarks schema for coaching-grade prescription.
 * Stored as profiles.performance_benchmarks (jsonb).
 */

export type ExerciseBenchmark = {
  oneRM: number | null;
  estimatedOneRM: number | null;
  lastUpdated: string | null; // ISO date
};

export type ExerciseBenchmarkKey =
  | "back_squat"
  | "bench_press"
  | "deadlift"
  | "overhead_press"
  | "weighted_pullup"
  | "trap_bar_deadlift"
  | "hip_thrust"
  | "split_squat";

export type AerobicBenchmarks = {
  vo2max: number | null;
  vt1: number | null;
  vt2: number | null;
  MAS: number | null; // m/s
  two_mile_time: number | null; // seconds
};

export type PowerBenchmarks = {
  CMJ: number | null; // cm
  RSI: number | null;
  sprint_10m: number | null;
  sprint_30m: number | null;
};

export type ExerciseBenchmarks = Partial<Record<ExerciseBenchmarkKey, ExerciseBenchmark>> & Record<string, ExerciseBenchmark | undefined>;

export type PerformanceBenchmarks = {
  exerciseBenchmarks?: Record<string, ExerciseBenchmark>;
  aerobicBenchmarks?: Partial<AerobicBenchmarks>;
  powerBenchmarks?: Partial<PowerBenchmarks>;
};

export const EXERCISE_BENCHMARK_KEYS: ExerciseBenchmarkKey[] = [
  "back_squat",
  "bench_press",
  "deadlift",
  "overhead_press",
  "weighted_pullup",
  "trap_bar_deadlift",
  "hip_thrust",
  "split_squat",
];

/** Map programme exercise keys to benchmark keys where they differ */
export const EXERCISE_KEY_TO_BENCHMARK: Record<string, ExerciseBenchmarkKey> = {
  back_squat: "back_squat",
  weighted_pull_up: "weighted_pullup",
  rdl: "deadlift", // RDL often prescribed from deadlift 1RM or separate
  split_squat: "split_squat",
  bench_press: "bench_press",
  overhead_press: "overhead_press",
  deadlift: "deadlift",
  trap_bar_deadlift: "trap_bar_deadlift",
  hip_thrust: "hip_thrust",
};

export const EXERCISE_DISPLAY_NAMES: Record<string, string> = {
  back_squat: "Back Squat",
  bench_press: "Bench Press",
  deadlift: "Deadlift",
  overhead_press: "Overhead Press",
  weighted_pullup: "Weighted Pull-Up",
  weighted_pull_up: "Weighted Pull-Up",
  trap_bar_deadlift: "Trap Bar Deadlift",
  hip_thrust: "Hip Thrust",
  split_squat: "Rear-Foot Elevated Split Squat",
  rdl: "Romanian Deadlift",
  power_clean: "Power Clean",
  db_press: "Dumbbell Press",
};

/** Sections for benchmarks page: Strength, Cardiovascular, Power. Keys can be any string for storage. */
export const BENCHMARK_SECTIONS: { id: string; title: string; exercises: { key: string; label: string; unit?: string }[] }[] = [
  {
    id: "strength",
    title: "Strength (1RM kg)",
    exercises: [
      { key: "back_squat", label: "Back Squat" },
      { key: "front_squat", label: "Front Squat" },
      { key: "bench_press", label: "Bench Press" },
      { key: "incline_bench_press", label: "Incline Bench Press" },
      { key: "overhead_press", label: "Overhead Press" },
      { key: "push_press", label: "Push Press" },
      { key: "deadlift", label: "Deadlift" },
      { key: "trap_bar_deadlift", label: "Trap Bar Deadlift" },
      { key: "rdl", label: "Romanian Deadlift" },
      { key: "power_clean", label: "Power Clean" },
      { key: "clean_and_jerk", label: "Clean & Jerk" },
      { key: "snatch", label: "Snatch" },
      { key: "weighted_pullup", label: "Weighted Pull-Up" },
      { key: "barbell_row", label: "Barbell Row" },
      { key: "hip_thrust", label: "Hip Thrust" },
      { key: "split_squat", label: "Rear-Foot Elevated Split Squat" },
      { key: "lunge", label: "Walking Lunge" },
      { key: "leg_press", label: "Leg Press" },
      { key: "leg_curl", label: "Leg Curl" },
      { key: "lat_pulldown", label: "Lat Pulldown" },
      { key: "dip", label: "Weighted Dip" },
      { key: "goblet_squat", label: "Goblet Squat" },
      { key: "db_press", label: "Dumbbell Press" },
      { key: "db_row", label: "Dumbbell Row" },
      { key: "db_rdl", label: "Dumbbell RDL" },
      { key: "kettlebell_swing", label: "Kettlebell Swing" },
      { key: "strict_press", label: "Strict Press" },
    ],
  },
  {
    id: "cardiovascular",
    title: "Cardiovascular",
    exercises: [
      { key: "MAS", label: "MAS (m/s)", unit: "m/s" },
      { key: "vo2max", label: "VO₂ max (ml/kg/min)", unit: "ml/kg/min" },
      { key: "vt1", label: "VT1 (bpm or pace)", unit: "" },
      { key: "vt2", label: "VT2 (bpm or pace)", unit: "" },
      { key: "two_mile_time", label: "2 Mile Time (sec)", unit: "sec" },
      { key: "five_k_time", label: "5K Time (sec)", unit: "sec" },
      { key: "ten_k_time", label: "10K Time (sec)", unit: "sec" },
      { key: "half_marathon_time", label: "Half Marathon (sec)", unit: "sec" },
      { key: "marathon_time", label: "Marathon (sec)", unit: "sec" },
      { key: "row_2k", label: "2K Row (sec)", unit: "sec" },
      { key: "row_5k", label: "5K Row (sec)", unit: "sec" },
      { key: "bike_ftp", label: "FTP (watts)", unit: "W" },
      { key: "swim_400", label: "400 m Swim (sec)", unit: "sec" },
    ],
  },
  {
    id: "power",
    title: "Power & Speed",
    exercises: [
      { key: "CMJ", label: "Countermovement Jump (cm)", unit: "cm" },
      { key: "SJ", label: "Squat Jump (cm)", unit: "cm" },
      { key: "RSI", label: "RSI (reactive strength)", unit: "" },
      { key: "sprint_10m", label: "10 m Sprint (sec)", unit: "sec" },
      { key: "sprint_20m", label: "20 m Sprint (sec)", unit: "sec" },
      { key: "sprint_30m", label: "30 m Sprint (sec)", unit: "sec" },
      { key: "broad_jump", label: "Broad Jump (cm)", unit: "cm" },
      { key: "med_ball_throw", label: "Med Ball Throw (m)", unit: "m" },
    ],
  },
];

/** All benchmark keys to display name (for dashboard top 5 etc.) */
export const ALL_BENCHMARK_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  BENCHMARK_SECTIONS.flatMap((s) => s.exercises.map((e) => [e.key, e.label]))
);
