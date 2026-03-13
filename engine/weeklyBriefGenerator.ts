/**
 * Weekly Strategic Brief generator — coach-voice summary before each training week.
 * Pulls from risk index, momentum, fatigue, system bias, identity.
 * Feels like a coach speaking.
 */

import type { FatigueInputs } from "./fatigueModel";
import { recoveryBandwidthLabel } from "./fatigueModel";
import { getRiskSignals } from "./riskIndex";
import { systemBiasPhrase } from "./systemBias";
import type { SystemBiasInputs } from "./systemBias";

export type WeeklyBriefData = {
  phaseIntent: string;
  systemBias: string;
  primaryLimiter: string;
  recoveryBandwidth: string;
  whyThisWeek: string;
  weekNumber?: number;
};

export type WeeklyBriefInputs = FatigueInputs & SystemBiasInputs & {
  primary_limiter?: string | null;
  current_week?: number | null;
  /** Phase label e.g. "Accumulation" | "Intensification" | "Overreach" | "Deload" */
  phase?: string | null;
  /** Macrocycle e.g. "GPP" | "SPP" | "Recovery" */
  macrocycle?: string | null;
};

function getPhaseIntent(phase: string, macrocycle: string): string {
  if (phase === "Deload") return "Recovery — reduced volume and intensity to consolidate and supercompensate.";
  if (phase === "Overreach") return "SPP — short overreach before taper or deload.";
  if (phase === "Intensification") return "SPP — intensity emphasis, volume moderated.";
  if (macrocycle === "GPP") return "GPP — building aerobic floor and work capacity.";
  return "Accumulation — volume and work capacity focus.";
}

/**
 * Generate the weekly brief object for WeeklyBrief component.
 * Coach-voice: "This week biases aerobic density while stabilising neural output. Sleep variability narrowed recovery bandwidth."
 */
export function generateWeeklyBrief(profile: WeeklyBriefInputs): WeeklyBriefData {
  const phase = profile.phase ?? "Accumulation";
  const macrocycle = profile.macrocycle ?? "GPP";
  const phaseIntent = getPhaseIntent(phase, macrocycle);
  const systemBias = systemBiasPhrase(profile);
  const primaryLimiter = profile.primary_limiter ?? "—";
  const recoveryBandwidth = recoveryBandwidthLabel(profile);
  const risk = getRiskSignals(profile);

  let whyThisWeek: string;
  if (recoveryBandwidth.startsWith("Critical") || recoveryBandwidth === "Compressed") {
    whyThisWeek = "Recovery bandwidth is limited. Volume and intensity are moderated to protect adaptation and reduce injury risk. ";
  } else if (risk.recoveryCompression === "decreasing") {
    whyThisWeek = "This week biases aerobic density while stabilising neural output. Sleep variability narrowed recovery bandwidth. ";
  } else if (risk.overloadRisk === "moderate" || risk.overloadRisk === "high") {
    whyThisWeek = "Load is sitting high relative to recovery. This week holds structure and prioritises quality over density. ";
  } else {
    whyThisWeek = "This week maintains the planned structure. Recovery bandwidth supports the planned load. ";
  }
  whyThisWeek += `${phaseIntent} ${systemBias}.`;

  return {
    phaseIntent,
    systemBias,
    primaryLimiter,
    recoveryBandwidth,
    whyThisWeek,
    weekNumber: profile.current_week ?? undefined,
  };
}
