import { createId } from "@paralleldrive/cuid2";

/**
 * Générateur d'identifiants des tables métier.
 *
 * Le schéma (schema-design §1.4) impose des PK cuid2 : plus courtes qu'un UUID,
 * triables, cryptographiquement sûres. Les tables Better-Auth génèrent leurs
 * propres IDs en interne — ce helper ne concerne que les tables métier
 * (`association_members`, `cotisations`, etc.).
 */
export function newId(): string {
  return createId();
}
