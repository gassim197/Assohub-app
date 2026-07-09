import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// ─── Fréquence (schema-design §5.1) ──────────────────────────────────────────

export const COTISATION_FREQUENCIES = [
  "one_time",
  "monthly",
  "quarterly",
  "annually",
] as const;

export type CotisationFrequency = (typeof COTISATION_FREQUENCIES)[number];

export const DEFAULT_COTISATION_FREQUENCY: CotisationFrequency = "monthly";

/** Fréquences éligibles à la génération automatique lazy (5A §2). */
export const RECURRING_FREQUENCIES = [
  "monthly",
  "quarterly",
  "annually",
] as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export function isCotisationFrequency(
  value: string,
): value is CotisationFrequency {
  return (COTISATION_FREQUENCIES as readonly string[]).includes(value);
}

export function isRecurringFrequency(
  value: string,
): value is RecurringFrequency {
  return (RECURRING_FREQUENCIES as readonly string[]).includes(value);
}

// ─── Statut d'une cotisation (schema-design §5.2) ────────────────────────────
// paye et partiel n'existent qu'à partir de la 5B (paiements). En 5A, seuls
// en_attente et en_retard sont produits par la génération.

export const COTISATION_STATUSES = [
  "en_attente",
  "partiel",
  "paye",
  "en_retard",
] as const;

export type CotisationStatus = (typeof COTISATION_STATUSES)[number];

export const STATUS_I18N_KEY: Record<CotisationStatus, string> = {
  en_attente: "pending",
  partiel: "partial",
  paye: "paid",
  en_retard: "late",
};

export const STATUS_BADGE_VARIANT: Record<CotisationStatus, BadgeVariant> = {
  en_attente: "info",
  partiel: "warning",
  paye: "success",
  en_retard: "destructive",
};

export function isCotisationStatus(value: string): value is CotisationStatus {
  return (COTISATION_STATUSES as readonly string[]).includes(value);
}

export const COTISATIONS_PAGE_SIZE = 20;
