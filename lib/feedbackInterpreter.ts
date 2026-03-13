/**
 * Free-text feedback interpreter for injury and readiness detection.
 * Used by PerformanceEngine.interpretSessionFeedback().
 */

export type FeedbackInterpretation = {
  kneePain: boolean;
  shoulderPain: boolean;
  backPain: boolean;
  fatigue: boolean;
  positiveReadiness: boolean;
  rawAreas: string[];
  sentiment: "positive" | "neutral" | "negative";
};

const KNEE_PATTERNS = [
  /\bknee\b/i,
  /\bknees\b/i,
  /\bpatella\b/i,
  /\bacl\b/i,
  /\bmcl\b/i,
  /\bit band\b/i,
  /\bquad\s*above\s*knee\b/i,
];

const SHOULDER_PATTERNS = [
  /\bshoulder\b/i,
  /\bshoulders\b/i,
  /\brotator\b/i,
  /\bimpingement\b/i,
  /\bdeltoid\b/i,
  /\bac joint\b/i,
  /\bglenohumeral\b/i,
];

const BACK_PATTERNS = [
  /\bback\b/i,
  /\blower\s*back\b/i,
  /\bupper\s*back\b/i,
  /\bspine\b/i,
  /\blumbar\b/i,
  /\bthoracic\b/i,
  /\bsi\s*joint\b/i,
  /\bsacro\b/i,
];

const FATIGUE_PATTERNS = [
  /\bfatigue[d]?\b/i,
  /\btired\b/i,
  /\bexhausted\b/i,
  /\bheavy\s*legs\b/i,
  /\bno\s*energy\b/i,
  /\bworn\s*out\b/i,
  /\bdeload\b/i,
];

const POSITIVE_READINESS_PATTERNS = [
  /\bfelt\s*good\b/i,
  /\bstrong\b/i,
  /\bready\b/i,
  /\bgreat\s*session\b/i,
  /\bsolid\b/i,
  /\bno\s*pain\b/i,
  /\bcleaned\s*up\b/i,
  /\bgood\s*recovery\b/i,
  /\bprimed\b/i,
];

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

export function interpretFeedback(freeText: string): FeedbackInterpretation {
  const t = (freeText ?? "").trim();
  const kneePain = matchAny(t, KNEE_PATTERNS) && !/no\s+knee\s+pain|knee\s+fine|knees\s+good/i.test(t);
  const shoulderPain = matchAny(t, SHOULDER_PATTERNS) && !/no\s+shoulder|shoulder\s+fine|shoulders\s+good/i.test(t);
  const backPain = matchAny(t, BACK_PATTERNS) && !/back\s+fine|no\s+back\s+pain|back\s+good/i.test(t);
  const fatigue = matchAny(t, FATIGUE_PATTERNS);
  const positiveReadiness = matchAny(t, POSITIVE_READINESS_PATTERNS);

  const rawAreas: string[] = [];
  if (kneePain) rawAreas.push("knee");
  if (shoulderPain) rawAreas.push("shoulder");
  if (backPain) rawAreas.push("back");

  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  if (positiveReadiness && !kneePain && !shoulderPain && !backPain && !fatigue) sentiment = "positive";
  else if (kneePain || shoulderPain || backPain || fatigue) sentiment = "negative";

  return {
    kneePain,
    shoulderPain,
    backPain,
    fatigue,
    positiveReadiness,
    rawAreas,
    sentiment,
  };
}
