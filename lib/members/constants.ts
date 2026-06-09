import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// ─── Rôles (liste fixe globale, schema-design §4.2) ─────────────────────────────
// Valeurs ASCII stockées telles quelles en base et réutilisées comme clés i18n.

export const MEMBER_ROLES = [
  "president",
  "vice_president",
  "tresorier",
  "secretaire",
  "charge_communication",
  "membre",
  "administrateur",
  "autre",
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export const DEFAULT_MEMBER_ROLE: MemberRole = "membre";

// ─── Statuts (schema-design §4.3) ───────────────────────────────────────────────
// /!\ Valeurs stockées AVEC accents, conformément à la spec et au commentaire du
// schéma Drizzle. `en_attente_validation` existe en base mais est réservé au flux
// d'invitation (4B) — il n'est pas exposé dans le CRUD manuel de la 4A.

export const MEMBER_STATUSES = [
  "actif",
  "démissionné",
  "exclu",
  "suspendu",
  "décédé",
] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const DEFAULT_MEMBER_STATUS: MemberStatus = "actif";

// Statuts qui matérialisent une sortie : on remplit `left_at` au passage. La
// suspension est réversible et ne remplit PAS `left_at` (schema-design §4.1).
export const EXIT_STATUSES: readonly MemberStatus[] = [
  "démissionné",
  "exclu",
  "décédé",
];

// Valeurs accentuées peu pratiques comme clés JSON : on mappe vers des clés ASCII.
export const STATUS_I18N_KEY: Record<MemberStatus, string> = {
  actif: "active",
  démissionné: "resigned",
  exclu: "excluded",
  suspendu: "suspended",
  décédé: "deceased",
};

// Mapping statut → variante de Badge (tokens du design system uniquement).
export const STATUS_BADGE_VARIANT: Record<MemberStatus, BadgeVariant> = {
  actif: "success",
  démissionné: "secondary",
  exclu: "destructive",
  suspendu: "warning",
  décédé: "outline",
};

export function isMemberStatus(value: string): value is MemberStatus {
  return (MEMBER_STATUSES as readonly string[]).includes(value);
}

export function isMemberRole(value: string): value is MemberRole {
  return (MEMBER_ROLES as readonly string[]).includes(value);
}

export const MEMBERS_PAGE_SIZE = 20;
