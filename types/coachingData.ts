/**
 * Data structure for Performance Pathfinder Coaching System.
 * Recommended tables / types for users, athletes, teams, organisations, tests, capacity_scores, programmes, sessions, exercises, readiness_logs.
 */

import type { CapacityProfile } from "./capacity";
import type { UserRole } from "./coachingRoles";
import type { ReadinessInputs, ReadinessScore } from "./readinessModel";
import type { SessionType, SessionStructure } from "./session";
import type { EquipmentEnvironment } from "./equipment";

export type User = {
  id: string;
  email?: string;
  role: UserRole;
  organisationId?: string | null;
};

export type Athlete = {
  id: string;
  userId: string;
  teamIds?: string[];
  coachIds?: string[];
};

export type Team = {
  id: string;
  organisationId: string;
  name: string;
};

export type Organisation = {
  id: string;
  name: string;
};

export type Test = {
  id: string;
  athleteId: string;
  type: string;
  result: Record<string, unknown>;
  testedAt: string;
};

export type CapacityScoresRecord = {
  id: string;
  athleteId: string;
  profile: CapacityProfile;
  recordedAt: string;
};

export type Programme = {
  id: string;
  athleteId: string;
  name: string;
  periodisationModel: string;
  blockLengthWeeks: number;
  startDate: string;
  endDate?: string;
};

export type SessionRecord = {
  id: string;
  programmeId: string;
  sessionType: SessionType;
  structure: SessionStructure;
  scheduledDate: string;
  completedAt?: string | null;
};

export type ExerciseRecord = {
  id: string;
  name: string;
  movementPattern: string;
  capacityTrained: string;
  equipmentRequired: EquipmentEnvironment[];
  fatigueCost: number;
  skillComplexity: number;
};

export type ReadinessLog = {
  id: string;
  athleteId: string;
  inputs: ReadinessInputs;
  score: ReadinessScore;
  loggedAt: string;
};
