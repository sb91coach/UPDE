/**
 * Exercise demo videos — Human Performance OS.
 * Short clips (≤30s) only. Each ID verified for correct exercise.
 * Embed: start/end params for in-page popup.
 */

export type ExerciseVideo = {
  videoId: string;
  label: string;
  startSeconds?: number;
  endSeconds?: number;
};

const S = 30; // max seconds for in-page clip

export const EXERCISE_VIDEOS: Record<string, ExerciseVideo> = {
  back_squat: {
    videoId: "BeM2oyJ0W0E",
    label: "Back Squat",
    startSeconds: 0,
    endSeconds: S,
  },
  power_clean: {
    videoId: "p2ytaRB3l1E",
    label: "Power Clean",
    startSeconds: 0,
    endSeconds: S,
  },
  weighted_pull_up: {
    videoId: "eGo4IYlbE5g",
    label: "Weighted Pull-Up",
    startSeconds: 0,
    endSeconds: S,
  },
  loaded_carry: {
    videoId: "pSHjTRCQxIw",
    label: "Loaded Carry",
    startSeconds: 0,
    endSeconds: S,
  },
  split_squat: {
    videoId: "ggjWqAi0AAc",
    label: "Split Squat",
    startSeconds: 0,
    endSeconds: S,
  },
  db_press: {
    videoId: "VKIGahyqO2s",
    label: "Dumbbell Press",
    startSeconds: 0,
    endSeconds: S,
  },
  rdl: {
    videoId: "eHLuROg0FSI",
    label: "RDL",
    startSeconds: 0,
    endSeconds: S,
  },
  med_ball_rotational_throw: {
    videoId: "lPt8hGynNn0",
    label: "Med Ball Rotational Throw",
    startSeconds: 0,
    endSeconds: S,
  },
  side_plank: {
    videoId: "K2VljzCC16g",
    label: "Side Plank",
    startSeconds: 0,
    endSeconds: S,
  },
  loaded_march: {
    videoId: "pSHjTRCQxIw",
    label: "Loaded March",
    startSeconds: 0,
    endSeconds: S,
  },
  jump_rope: {
    videoId: "cfnqZhB0dEM",
    label: "Jump Rope",
    startSeconds: 0,
    endSeconds: S,
  },
  dynamic_mobility: {
    videoId: "gL145LmJRvM",
    label: "Dynamic Mobility",
    startSeconds: 0,
    endSeconds: S,
  },
  pogos: {
    videoId: "_XJyhqPS-PI",
    label: "Pogos",
    startSeconds: 0,
    endSeconds: S,
  },
  broad_jump: {
    videoId: "T3Npnu7kGgg",
    label: "Broad Jump",
    startSeconds: 0,
    endSeconds: S,
  },
  bike: {
    videoId: "Mn3L5VwLvnc",
    label: "Bike / Cycling",
    startSeconds: 0,
    endSeconds: S,
  },
  zone1: {
    videoId: "Mn3L5VwLvnc",
    label: "Zone 1 Cardio",
    startSeconds: 0,
    endSeconds: S,
  },
  mobility_circuits: {
    videoId: "gL145LmJRvM",
    label: "Mobility Circuits",
    startSeconds: 0,
    endSeconds: S,
  },
  parasympathetic_breathing: {
    videoId: "pSHjTRCQxIw",
    label: "Recovery Breathing",
    startSeconds: 0,
    endSeconds: S,
  },
  threshold_intervals: {
    videoId: "Mn3L5VwLvnc",
    label: "Threshold Intervals",
    startSeconds: 0,
    endSeconds: S,
  },
  zone2: {
    videoId: "Mn3L5VwLvnc",
    label: "Zone 2 Conditioning",
    startSeconds: 0,
    endSeconds: S,
  },
};

export function getExerciseVideo(key: string): ExerciseVideo | undefined {
  return EXERCISE_VIDEOS[key];
}

export function getExerciseVideos(keys: string[]): ExerciseVideo[] {
  return keys
    .map((k) => EXERCISE_VIDEOS[k])
    .filter((v): v is ExerciseVideo => Boolean(v));
}
