/**
 * Structured programme data: Phase → Week → Day → Session blocks.
 * Each phase has N weeks; each week has distinct days with unique sessions.
 */

export type ProgrammeBlockType =
  | "performanceNotes"
  | "prep"
  | "main"
  | "accessory"
  | "conditioning"
  | "recovery";

export type ProgrammeSessionBlock =
  | { type: "performanceNotes"; text: string }
  | {
      type: "prep" | "main" | "accessory" | "conditioning" | "recovery";
      exercises: string[];
    };

export type ProgrammeDayType = "Red" | "Green" | "Recovery" | "Off";

export type ProgrammeDay = {
  day: string;
  type: ProgrammeDayType;
  title: string;
  duration: number;
  blocks: ProgrammeSessionBlock[];
};

export type ProgrammeWeek = {
  week: number;
  days: ProgrammeDay[];
};

export type ProgrammePhase = {
  name: string;
  duration: number;
  weeks: ProgrammeWeek[];
};

export type Programme = {
  phases: ProgrammePhase[];
};

const programme: Programme = {
  phases: [
    {
      name: "GPP – Strength Foundation",
      duration: 6,
      weeks: [
        {
          week: 1,
          days: [
            {
              day: "Monday",
              type: "Red",
              title: "Hinge + Press",
              duration: 75,
              blocks: [
                { type: "performanceNotes", text: "Focus on neural output" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "3x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 5x3 @ 85%",
                    "Strict Press 4x5 @ RPE 8",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 3x8 ea",
                    "DB Press 3x10",
                    "RDL 3x8 · Rest 60–90s",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 20–30 min · nasal breathing"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Squat + Pull",
              duration: 70,
              blocks: [
                { type: "performanceNotes", text: "Control tempo, full ROM" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "3x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 4x4 @ 80%",
                    "Weighted Pull-Up 4x5 @ RPE 7",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 2x10",
                    "Face Pull 2x12",
                    "Plank 2x30s",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["15–20 min Zone 2 or skip"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                    "HR < 120 bpm",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Red",
              title: "Press + Hinge",
              duration: 72,
              blocks: [
                { type: "performanceNotes", text: "Lock in bracing on main lift" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band pull-aparts", "3x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 5x3 @ 85%",
                    "Trap Bar Deadlift 4x4 @ 80%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 3x8 ea",
                    "Push-up 2x10",
                    "Dead Bug 2x12",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["4×6 min @ 85–90% HRmax · 2 min recovery"],
                },
              ],
            },
          ],
        },
        {
          week: 2,
          days: [
            {
              day: "Monday",
              type: "Red",
              title: "Hinge + Press (W2)",
              duration: 78,
              blocks: [
                { type: "performanceNotes", text: "Week 2: slight volume bump" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "4x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 5x4 @ 82%",
                    "Strict Press 4x6 @ RPE 7.5",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 3x8 ea",
                    "DB Press 3x10",
                    "RDL 3x8 · Rest 60s",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 25–35 min"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Squat + Pull (W2)",
              duration: 72,
              blocks: [
                { type: "performanceNotes", text: "Add 1 set on main if fresh" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "3x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 5x4 @ 78%",
                    "Weighted Pull-Up 4x6 @ RPE 7",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 3x10",
                    "Face Pull 3x12",
                    "Side Plank 2x25s ea",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["20 min Zone 2"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Red",
              title: "Press + Hinge (W2)",
              duration: 75,
              blocks: [
                { type: "performanceNotes", text: "Maintain bar speed on press" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band work", "3x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 5x4 @ 82%",
                    "Trap Bar Deadlift 4x5 @ 78%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 3x8 ea",
                    "Push-up 3x10",
                    "Dead Bug 3x10",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["4×6 min threshold · 2 min recovery"],
                },
              ],
            },
          ],
        },
        {
          week: 3,
          days: [
            {
              day: "Monday",
              type: "Red",
              title: "Hinge + Press (W3)",
              duration: 80,
              blocks: [
                { type: "performanceNotes", text: "Week 3 accumulation" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "4x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 6x4 @ 80%",
                    "Strict Press 5x5 @ RPE 8",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 3x8 ea",
                    "DB Press 3x10",
                    "RDL 3x8",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 30–40 min"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Squat + Pull (W3)",
              duration: 75,
              blocks: [
                { type: "performanceNotes", text: "Quality over load" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "3x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 5x5 @ 75%",
                    "Weighted Pull-Up 5x5 @ RPE 7",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 3x10",
                    "Face Pull 3x12",
                    "Plank 3x30s",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["20 min Zone 2"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Red",
              title: "Press + Hinge (W3)",
              duration: 78,
              blocks: [
                { type: "performanceNotes", text: "Peak volume week" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band work", "3x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 5x5 @ 80%",
                    "Trap Bar Deadlift 5x4 @ 78%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 3x8 ea",
                    "Push-up 3x10",
                    "Dead Bug 3x12",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["4×6 min @ 85–90% HRmax · 2 min recovery"],
                },
              ],
            },
          ],
        },
        {
          week: 4,
          days: [
            {
              day: "Monday",
              type: "Red",
              title: "Hinge + Press (W4 Intensification)",
              duration: 72,
              blocks: [
                { type: "performanceNotes", text: "Intensification: higher intensity, lower volume" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "3x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 4x3 @ 88%",
                    "Strict Press 4x4 @ RPE 8.5",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 2x8 ea",
                    "DB Press 2x10",
                    "RDL 2x8",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 20–25 min"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Squat + Pull (W4)",
              duration: 68,
              blocks: [
                { type: "performanceNotes", text: "Heavier singles optional" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "3x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 4x3 @ 85%",
                    "Weighted Pull-Up 4x4 @ RPE 8",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 2x10",
                    "Face Pull 2x12",
                    "Side Plank 2x20s ea",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["15 min Zone 2"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Red",
              title: "Press + Hinge (W4)",
              duration: 70,
              blocks: [
                { type: "performanceNotes", text: "Focus on bar speed" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band work", "3x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 4x3 @ 87%",
                    "Trap Bar Deadlift 4x3 @ 86%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 2x8 ea",
                    "Push-up 2x10",
                    "Dead Bug 2x10",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["4×5 min threshold · 2 min recovery"],
                },
              ],
            },
          ],
        },
        {
          week: 5,
          days: [
            {
              day: "Monday",
              type: "Red",
              title: "Hinge + Press (W5 Overreach)",
              duration: 78,
              blocks: [
                { type: "performanceNotes", text: "Overreach: accumulate fatigue deliberately" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "4x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 5x4 @ 85%",
                    "Strict Press 5x4 @ RPE 8",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 3x8 ea",
                    "DB Press 3x10",
                    "RDL 3x8",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 25 min"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Squat + Pull (W5)",
              duration: 72,
              blocks: [
                { type: "performanceNotes", text: "Sustain quality through week" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "3x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 5x4 @ 82%",
                    "Weighted Pull-Up 5x5 @ RPE 7.5",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 3x10",
                    "Face Pull 3x12",
                    "Plank 2x30s",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["20 min Zone 2"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Red",
              title: "Press + Hinge (W5)",
              duration: 75,
              blocks: [
                { type: "performanceNotes", text: "Final overreach before deload" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band work", "3x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 5x4 @ 82%",
                    "Trap Bar Deadlift 5x3 @ 84%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 3x8 ea",
                    "Push-up 3x10",
                    "Dead Bug 3x10",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["4×6 min threshold · 2 min recovery"],
                },
              ],
            },
          ],
        },
        {
          week: 6,
          days: [
            {
              day: "Monday",
              type: "Green",
              title: "Hinge + Press (Deload)",
              duration: 55,
              blocks: [
                { type: "performanceNotes", text: "Deload: 60–70% load, move well" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "2x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 3x3 @ 65%",
                    "Strict Press 3x4 @ RPE 6",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 2x6 ea",
                    "DB Press 2x8",
                    "RDL 2x6",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 15–20 min optional"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Squat + Pull (Deload)",
              duration: 50,
              blocks: [
                { type: "performanceNotes", text: "Light session, focus on technique" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "2x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 3x3 @ 65%",
                    "Weighted Pull-Up 3x4 @ RPE 6",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 2x8",
                    "Face Pull 2x10",
                    "Plank 2x20s",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Skip or 15 min Zone 2"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Green",
              title: "Press + Hinge (Deload)",
              duration: 52,
              blocks: [
                { type: "performanceNotes", text: "Easy session to close week" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band work", "2x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 3x4 @ 65%",
                    "Trap Bar Deadlift 3x3 @ 65%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 2x8 ea",
                    "Push-up 2x8",
                    "Dead Bug 2x8",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Optional 15 min Zone 2"],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "SPP – Strength Intensification",
      duration: 4,
      weeks: [
        {
          week: 1,
          days: [
            {
              day: "Monday",
              type: "Red",
              title: "Heavy Hinge",
              duration: 70,
              blocks: [
                { type: "performanceNotes", text: "SPP Week 1: neural focus" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "3x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 6x2 @ 90%",
                    "Strict Press 4x3 @ 88%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 2x6 ea",
                    "DB Press 2x8",
                    "RDL 2x6",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 20 min"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Heavy Squat + Pull",
              duration: 68,
              blocks: [
                { type: "performanceNotes", text: "Quality singles optional" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "3x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 5x2 @ 88%",
                    "Weighted Pull-Up 4x3 @ RPE 8",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 2x8",
                    "Face Pull 2x12",
                    "Plank 2x25s",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["15 min Zone 2"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Red",
              title: "Heavy Press + Hinge",
              duration: 68,
              blocks: [
                { type: "performanceNotes", text: "Peak intensity day" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band work", "3x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 5x2 @ 90%",
                    "Trap Bar Deadlift 4x2 @ 90%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 2x8 ea",
                    "Push-up 2x10",
                    "Dead Bug 2x10",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["4×4 min threshold · 2 min recovery"],
                },
              ],
            },
          ],
        },
        {
          week: 2,
          days: [
            {
              day: "Monday",
              type: "Red",
              title: "Heavy Hinge (SPP W2)",
              duration: 72,
              blocks: [
                { type: "performanceNotes", text: "Week 2: sustain intensity" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "3x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 5x3 @ 88%",
                    "Strict Press 4x4 @ 85%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 2x6 ea",
                    "DB Press 2x8",
                    "RDL 2x6",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 20 min"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Heavy Squat + Pull (SPP W2)",
              duration: 70,
              blocks: [
                { type: "performanceNotes", text: "Controlled RPE" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "3x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 5x3 @ 86%",
                    "Weighted Pull-Up 4x4 @ RPE 7.5",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 2x8",
                    "Face Pull 2x12",
                    "Side Plank 2x20s ea",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["15 min Zone 2"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Red",
              title: "Heavy Press + Hinge (SPP W2)",
              duration: 70,
              blocks: [
                { type: "performanceNotes", text: "Bar speed priority" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band work", "3x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 4x3 @ 87%",
                    "Trap Bar Deadlift 5x2 @ 88%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 2x8 ea",
                    "Push-up 2x10",
                    "Dead Bug 2x10",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["4×4 min threshold · 2 min recovery"],
                },
              ],
            },
          ],
        },
        {
          week: 3,
          days: [
            {
              day: "Monday",
              type: "Red",
              title: "Heavy Hinge (SPP W3)",
              duration: 72,
              blocks: [
                { type: "performanceNotes", text: "Week 3: peak intensity" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "3x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 4x2 @ 92%",
                    "Strict Press 4x3 @ 88%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 2x6 ea",
                    "DB Press 2x8",
                    "RDL 2x6",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 18 min"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Heavy Squat + Pull (SPP W3)",
              duration: 68,
              blocks: [
                { type: "performanceNotes", text: "Heavy doubles" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "3x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 4x2 @ 90%",
                    "Weighted Pull-Up 4x3 @ RPE 8",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 2x8",
                    "Face Pull 2x12",
                    "Plank 2x25s",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["15 min Zone 2"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Red",
              title: "Heavy Press + Hinge (SPP W3)",
              duration: 68,
              blocks: [
                { type: "performanceNotes", text: "Final heavy week" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band work", "3x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 4x2 @ 90%",
                    "Trap Bar Deadlift 4x2 @ 90%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 2x8 ea",
                    "Push-up 2x10",
                    "Dead Bug 2x10",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["4×4 min threshold · 2 min recovery"],
                },
              ],
            },
          ],
        },
        {
          week: 4,
          days: [
            {
              day: "Monday",
              type: "Green",
              title: "Taper Hinge",
              duration: 55,
              blocks: [
                { type: "performanceNotes", text: "Taper: light technique work" },
                {
                  type: "prep",
                  exercises: ["Breathing reset", "Hip activation", "2x CMJ"],
                },
                {
                  type: "main",
                  exercises: [
                    "Trap Bar Deadlift 3x2 @ 75%",
                    "Strict Press 3x3 @ 75%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Split Squat 2x6 ea",
                    "DB Press 2x8",
                    "RDL 2x6",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Zone 2 15 min optional"],
                },
              ],
            },
            {
              day: "Tuesday",
              type: "Green",
              title: "Taper Squat + Pull",
              duration: 52,
              blocks: [
                { type: "performanceNotes", text: "Move well, stay fresh" },
                {
                  type: "prep",
                  exercises: ["6 min bike", "Dynamic mobility", "2x5 pogos"],
                },
                {
                  type: "main",
                  exercises: [
                    "Back Squat 3x2 @ 75%",
                    "Weighted Pull-Up 3x3 @ RPE 6",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "Goblet Squat 2x8",
                    "Face Pull 2x10",
                    "Plank 2x20s",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Skip or 15 min Zone 2"],
                },
              ],
            },
            {
              day: "Wednesday",
              type: "Recovery",
              title: "Regeneration",
              duration: 25,
              blocks: [
                {
                  type: "recovery",
                  exercises: [
                    "Zone 1 20–30 min",
                    "Mobility circuits",
                    "Parasympathetic breathing",
                  ],
                },
              ],
            },
            {
              day: "Thursday",
              type: "Green",
              title: "Taper Press + Hinge",
              duration: 50,
              blocks: [
                { type: "performanceNotes", text: "Easy session before performance" },
                {
                  type: "prep",
                  exercises: ["Jump rope 5 min", "Band work", "2x3 broad jump"],
                },
                {
                  type: "main",
                  exercises: [
                    "Strict Press 3x2 @ 75%",
                    "Trap Bar Deadlift 3x2 @ 75%",
                  ],
                },
                {
                  type: "accessory",
                  exercises: [
                    "DB Row 2x8 ea",
                    "Push-up 2x8",
                    "Dead Bug 2x8",
                  ],
                },
                {
                  type: "conditioning",
                  exercises: ["Optional 15 min Zone 2"],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export default programme;
export { programme };
