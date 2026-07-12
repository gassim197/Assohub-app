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

export const MEETING_STATUS_BADGE_VARIANT: Record<MeetingStatus, BadgeVariant> = {
  planifiee: "info",
  tenue: "success",
  annulee: "destructive",
  reportee: "warning",
};
