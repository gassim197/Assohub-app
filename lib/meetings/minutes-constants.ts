import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// ─── Statut de PV (schema-design §6.5/6.6) ────────────────────────────────────

export const MINUTES_STATUSES = ["brouillon", "publie", "archive"] as const;

export type MinutesStatus = (typeof MINUTES_STATUSES)[number];

export const DEFAULT_MINUTES_STATUS: MinutesStatus = "brouillon";

export function isMinutesStatus(value: string): value is MinutesStatus {
  return (MINUTES_STATUSES as readonly string[]).includes(value);
}

export const MINUTES_STATUS_BADGE_VARIANT: Record<MinutesStatus, BadgeVariant> = {
  brouillon: "outline",
  publie: "success",
  archive: "secondary",
};
