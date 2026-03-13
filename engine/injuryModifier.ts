/**
 * Injury-based programme modification (guardrail logic).
 * If knee pain: reduce knee-dominant loading, remove plyometrics, limit depth, hip-dominant emphasis.
 * If shoulder: remove overhead loading, modify pressing volume, scapular stability.
 * If tendon: reduce eccentric velocity, increase isometric exposure.
 * All changes should be logged via DecisionLog.
 */

import type { InjuryEntry } from "./injuryMemoryEngine";
import { getActiveInjuries } from "./injuryMemoryEngine";

export type InjuryModifierFlags = {
  reduceKneeDominant: boolean;
  removePlyometrics: boolean;
  limitDepth: boolean;
  hipDominantEmphasis: boolean;
  removeOverheadLoading: boolean;
  modifyPressingVolume: boolean;
  scapularStabilityFocus: boolean;
  reduceEccentricVelocity: boolean;
  increaseIsometricExposure: boolean;
  /** Human-readable summary for decision log */
  summary: string[];
};

const BODY_KNEE = ["knee", "knees", "patella", "patellar", "quad", "quads"];
const BODY_SHOULDER = ["shoulder", "shoulders", "rotator", "ac", "glenohumeral"];
const BODY_LOWER = ["hip", "back", "lower back", "lumbar", "hamstring", "calf", "ankle"];

function bodyPartMatches(bodyPart: string, list: string[]): boolean {
  const b = bodyPart.toLowerCase();
  return list.some((k) => b.includes(k));
}

function hasTendonClassification(entries: InjuryEntry[]): boolean {
  return entries.some((e) => (e.classification ?? "").toLowerCase().includes("tendon"));
}

/**
 * Compute programme modification flags from active injuries.
 * Caller applies these when building sessions and logs via logDecision.
 */
export function getInjuryModifiers(entries: InjuryEntry[]): InjuryModifierFlags {
  const active = getActiveInjuries(entries);
  const summary: string[] = [];
  const flags: InjuryModifierFlags = {
    reduceKneeDominant: false,
    removePlyometrics: false,
    limitDepth: false,
    hipDominantEmphasis: false,
    removeOverheadLoading: false,
    modifyPressingVolume: false,
    scapularStabilityFocus: false,
    reduceEccentricVelocity: false,
    increaseIsometricExposure: false,
    summary: [],
  };

  if (active.length === 0) {
    flags.summary = [];
    return flags;
  }

  const kneeInjuries = active.filter((e) => bodyPartMatches(e.body_part, BODY_KNEE));
  const shoulderInjuries = active.filter((e) => bodyPartMatches(e.body_part, BODY_SHOULDER));
  const tendon = hasTendonClassification(active);

  if (kneeInjuries.length > 0) {
    flags.reduceKneeDominant = true;
    flags.removePlyometrics = true;
    flags.limitDepth = true;
    flags.hipDominantEmphasis = true;
    summary.push("Knee load reduced: less knee-dominant work, no plyometrics, depth limited, hip-dominant emphasis.");
  }

  if (shoulderInjuries.length > 0) {
    flags.removeOverheadLoading = true;
    flags.modifyPressingVolume = true;
    flags.scapularStabilityFocus = true;
    summary.push("Shoulder protection: overhead loading removed, pressing volume modified, scapular stability emphasised.");
  }

  if (tendon) {
    flags.reduceEccentricVelocity = true;
    flags.increaseIsometricExposure = true;
    summary.push("Tendon-friendly: reduced eccentric velocity, increased isometric exposure.");
  }

  flags.summary = summary;
  return flags;
}
