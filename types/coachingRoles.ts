/**
 * User roles and organisation structure.
 * Organisation → Teams → Coaches → Athletes.
 */

export const USER_ROLES = ["admin", "coach", "athlete"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type Organisation = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  organisationId: string;
  name: string;
};

export type CoachAthleteRelation = {
  coachId: string;
  athleteId: string;
  teamId?: string;
};
