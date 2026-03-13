/**
 * Session Feedback Parser — analyses athlete written feedback.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

export type SessionFeedbackParseResult = {
  joint: string | null;
  severity: "low" | "moderate" | "high" | null;
  relatedExercise: string | null;
  /** Raw phrases detected */
  rawPhrases: string[];
};

const JOINT_PATTERNS: Record<string, RegExp[]> = {
  knee: [/\bknee\b/i, /\bknees\b/i, /\bpatella\b/i],
  shoulder: [/\bshoulder\b/i, /\bshoulders\b/i, /\brotator\b/i],
  back: [/\bback\b/i, /\blower\s*back\b/i, /\blumbar\b/i, /\bspine\b/i],
  hip: [/\bhip\b/i, /\bhips\b/i, /\bgroin\b/i],
  ankle: [/\bankle\b/i, /\bankles\b/i],
  elbow: [/\belbow\b/i, /\belbows\b/i],
  wrist: [/\bwrist\b/i, /\bwrists\b/i],
  neck: [/\bneck\b/i, /\bcervical\b/i],
};

const SEVERITY_PATTERNS = {
  high: [/\bsevere\b/i, /\bsharp\b/i, /\bbad\b/i, /\breally\s*hurt\b/i, /\bcan't\b/i],
  moderate: [/\bmoderate\b/i, /\bsome\s*pain\b/i, /\bniggling\b/i, /\bache\b/i],
  low: [/\bslight\b/i, /\bminor\b/i, /\ba\s*bit\b/i],
};

const EXERCISE_PATTERNS = [
  /\bsplit\s*squat\b/i,
  /\bback\s*squat\b/i,
  /\bfront\s*squat\b/i,
  /\bdeadlift\b/i,
  /\brdl\b/i,
  /\bpress\b/i,
  /\bbench\b/i,
  /\blunge\b/i,
  /\bclean\b/i,
  /\bsnatch\b/i,
  /\bcarry\b/i,
  /\bplank\b/i,
  /\bsquat\b/i,
  /\bhinge\b/i,
];

function detectJoint(text: string): string | null {
  for (const [joint, patterns] of Object.entries(JOINT_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) return joint;
  }
  return null;
}

function detectSeverity(text: string): "low" | "moderate" | "high" | null {
  if (SEVERITY_PATTERNS.high.some((p) => p.test(text))) return "high";
  if (SEVERITY_PATTERNS.moderate.some((p) => p.test(text))) return "moderate";
  if (SEVERITY_PATTERNS.low.some((p) => p.test(text))) return "low";
  if (/\bpain\b/i.test(text) || /\bhurt\b/i.test(text)) return "moderate";
  return null;
}

function detectExercise(text: string): string | null {
  for (const pattern of EXERCISE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

/**
 * Parse free-text feedback e.g. "Knee pain after split squats"
 */
export function parseSessionFeedback(freeText: string): SessionFeedbackParseResult {
  const t = (freeText ?? "").trim();
  const rawPhrases: string[] = [];

  const joint = detectJoint(t);
  if (joint) rawPhrases.push(joint);

  const severity = detectSeverity(t);
  const relatedExercise = detectExercise(t);
  if (relatedExercise) rawPhrases.push(relatedExercise);

  return {
    joint,
    severity,
    relatedExercise,
    rawPhrases,
  };
}
