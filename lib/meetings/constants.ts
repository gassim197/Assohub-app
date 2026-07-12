import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// ─── Type de réunion (schema-design §6.2, 8 valeurs fixes) ───────────────────
// Pas de champ libre : une asso qui veut préciser le met dans title/description.

export const MEETING_TYPES = [
  "ag",
  "bureau",
  "ca",
  "commission",
  "formation",
  "atelier",
  "evenement",
  "autre",
] as const;

export type MeetingType = (typeof MEETING_TYPES)[number];

export const DEFAULT_MEETING_TYPE: MeetingType = "bureau";

export function isMeetingType(value: string): value is MeetingType {
  return (MEETING_TYPES as readonly string[]).includes(value);
}

// Seulement 7 variantes de Badge existent dans le design system pour 8 types :
// réutilisation raisonnée (décision validée session 6A), pas 8 couleurs uniques.
export const MEETING_TYPE_BADGE_VARIANT: Record<MeetingType, BadgeVariant> = {
  ag: "default",
  bureau: "info",
  ca: "secondary",
  commission: "outline",
  formation: "success",
  atelier: "warning",
  evenement: "info",
  autre: "outline",
};

// ─── Statut de réunion (schema-design §6.3) ──────────────────────────────────

export const MEETING_STATUSES = [
  "planifiee",
  "tenue",
  "annulee",
  "reportee",
] as const;

export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const DEFAULT_MEETING_STATUS: MeetingStatus = "planifiee";

export function isMeetingStatus(value: string): value is MeetingStatus {
  return (MEETING_STATUSES as readonly string[]).includes(value);
}

/**
 * Le RSVP reste saisissable tant que la réunion n'est pas annulée (les gens
 * confirment à l'avance, y compris pour une réunion `reportee`). Seule une
 * réunion `annulee` bloque toute saisie de présence — RSVP compris, puisque
 * confirmer sa venue à un événement qui n'aura pas lieu n'a plus de sens
 * (session 6B, point tranché explicitement).
 */
export function canRecordRsvp(status: string): boolean {
  return status !== "annulee";
}

/**
 * La présence effective n'a de sens qu'une fois la réunion passée : `tenue`
 * (peu importe la date, ex. saisie tardive) ou date déjà écoulée. Une
 * réunion `reportee` est traitée comme future (colonne grisée) tant qu'elle
 * n'a pas de nouveau statut.
 */
export function canRecordAttendance(
  status: string,
  scheduledAt: Date,
  now: Date = new Date(),
): boolean {
  if (status === "annulee") return false;
  if (status === "tenue") return true;
  return scheduledAt <= now;
}

export const MEETING_STATUS_BADGE_VARIANT: Record<MeetingStatus, BadgeVariant> = {
  planifiee: "info",
  tenue: "success",
  annulee: "destructive",
  reportee: "warning",
};

// ─── RSVP (schema-design §6.4) ────────────────────────────────────────────────

export const RSVP_STATUSES = ["yes", "no", "maybe", "no_response"] as const;

export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const DEFAULT_RSVP_STATUS: RsvpStatus = "no_response";

export function isRsvpStatus(value: string): value is RsvpStatus {
  return (RSVP_STATUSES as readonly string[]).includes(value);
}

export const RSVP_BADGE_VARIANT: Record<RsvpStatus, BadgeVariant> = {
  yes: "success",
  no: "destructive",
  maybe: "warning",
  no_response: "outline",
};
