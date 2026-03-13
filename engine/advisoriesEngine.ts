/**
 * Daily advisories: training, nutrition, psych, soft tissue (and more).
 * Driven by check-in answers and adaptation level so programme and dashboard can show "today's advisories".
 */

export type AdvisoryCategory = "training" | "nutrition" | "psych" | "soft_tissue" | "recovery";

export type Advisory = {
  category: AdvisoryCategory;
  label: string;
  message: string;
  priority: "high" | "medium" | "low";
};

export type AdvisoryInputs = {
  readiness?: number | null;
  feel?: "good" | "okay" | "poor" | null;
  pain?: "none" | "yes" | null;
  painAreas?: string | null;
  energy?: "low" | "medium" | "high" | null;
  sleep?: "poor" | "okay" | "good" | null;
  /** "reduce" | "normal" | "increase" from adaptation */
  adaptation?: string | null;
  /** Optional: today's session focus for targeted advice */
  sessionFocus?: string | null;
};

function trainingAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const adapt = inputs.adaptation ?? "normal";
  if (adapt === "reduce") {
    return {
      category: "training",
      label: "Training",
      message: "Keep volume moderate today. Session is adapted for recovery — focus on quality over quantity.",
      priority: "high",
    };
  }
  if (adapt === "increase") {
    return {
      category: "training",
      label: "Training",
      message: "You're clear for optional progressions. Add a set or slight load increase if it feels right.",
      priority: "low",
    };
  }
  if ((inputs.readiness ?? 7) < 5) {
    return {
      category: "training",
      label: "Training",
      message: "Consider shortening the session or swapping to lower intensity. Readiness suggests prioritising recovery.",
      priority: "high",
    };
  }
  return {
    category: "training",
    label: "Training",
    message: "Stick to the planned session. Warm up well and respect RPE.",
    priority: "low",
  };
}

function nutritionAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const energy = inputs.energy ?? "medium";
  const sleep = inputs.sleep ?? "good";
  if (energy === "low" || sleep === "poor") {
    return {
      category: "nutrition",
      label: "Nutrition",
      message: "Prioritise protein and hydration today. Consider a balanced meal 1–2 hours before training.",
      priority: "high",
    };
  }
  return {
    category: "nutrition",
    label: "Nutrition",
    message: "Stay on top of hydration and protein spread across the day to support recovery.",
    priority: "low",
  };
}

function psychAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const feel = inputs.feel ?? "okay";
  const adapt = inputs.adaptation ?? "normal";
  if (feel === "poor" || adapt === "reduce") {
    return {
      category: "psych",
      label: "Psych",
      message: "Keep the session under 60 min if possible. No need to push — consistency over intensity today.",
      priority: "high",
    };
  }
  return {
    category: "psych",
    label: "Psych",
    message: "Session is within your capacity. Focus on execution and breathing under load.",
    priority: "low",
  };
}

function softTissueAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const pain = inputs.pain ?? "none";
  const areas = (inputs.painAreas ?? "").toLowerCase();
  const sessionFocus = (inputs.sessionFocus ?? "").toLowerCase();
  if (pain === "yes" && areas) {
    return {
      category: "soft_tissue",
      label: "Soft tissue",
      message: `Consider foam rolling or mobility work for ${areas} before and after the session. Avoid aggravating load.`,
      priority: "high",
    };
  }
  if (sessionFocus.includes("lower") || sessionFocus.includes("leg")) {
    return {
      category: "soft_tissue",
      label: "Soft tissue",
      message: "Pre-session: quads, glutes and hamstrings. Post-session: calves and hip flexors if time.",
      priority: "medium",
    };
  }
  if (sessionFocus.includes("upper") || sessionFocus.includes("push")) {
    return {
      category: "soft_tissue",
      label: "Soft tissue",
      message: "Pre-session: pecs, lats and shoulders. Post-session: triceps and upper back if needed.",
      priority: "medium",
    };
  }
  return {
    category: "soft_tissue",
    label: "Soft tissue",
    message: "5–10 min mobility or foam rolling pre-session will prime the system.",
    priority: "low",
  };
}

function recoveryAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const sleep = inputs.sleep ?? "good";
  if (sleep === "poor") {
    return {
      category: "recovery",
      label: "Recovery",
      message: "Sleep was suboptimal. Prioritise tonight: wind-down, limit screens, consistent bedtime.",
      priority: "high",
    };
  }
  return null;
}

/**
 * Return today's advisories for the given check-in / adaptation inputs.
 */
export function getAdvisories(inputs: AdvisoryInputs): Advisory[] {
  const out: Advisory[] = [];
  const t = trainingAdvisory(inputs);
  if (t) out.push(t);
  const n = nutritionAdvisory(inputs);
  if (n) out.push(n);
  const p = psychAdvisory(inputs);
  if (p) out.push(p);
  const s = softTissueAdvisory(inputs);
  if (s) out.push(s);
  const r = recoveryAdvisory(inputs);
  if (r) out.push(r);
  return out.sort((a, b) => (a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0));
}
