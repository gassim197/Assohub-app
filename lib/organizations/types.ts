/**
 * Types d'organisation disponibles à l'onboarding et dans les Paramètres.
 * Centralisé ici pour éviter la duplication entre `onboarding-form.tsx`
 * (Client Component) et `invitations/queries.ts` (lecture côté serveur).
 */
export const ORG_TYPES = [
  "student",
  "ngo",
  "community",
  "network",
  "other",
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export function isOrgType(value: string): value is OrgType {
  return (ORG_TYPES as readonly string[]).includes(value);
}
