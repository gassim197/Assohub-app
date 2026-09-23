import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizationStorageUsage } from "@/lib/db/documents-schema";
import { MAX_ORGANIZATION_STORAGE_BYTES } from "./constants";

/**
 * Compteur d'octets utilisés par organisation (`organization_storage_usage`,
 * une ligne par org, créée à la volée). Lecture O(1) par clé primaire — jamais
 * de `SUM(size_bytes)` sur `documents` à l'affichage, comme demandé
 * (checkpoint validé).
 */
export async function getOrganizationStorageUsage(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ usedBytes: organizationStorageUsage.usedBytes })
    .from(organizationStorageUsage)
    .where(eq(organizationStorageUsage.organizationId, organizationId))
    .limit(1);

  return row?.usedBytes ?? 0;
}

export const ORGANIZATION_STORAGE_QUOTA_BYTES = MAX_ORGANIZATION_STORAGE_BYTES;

/**
 * Incrémente le compteur (upload réussi). Upsert : crée la ligne au premier
 * upload de l'organisation.
 *
 * Pas de transaction interactive possible sur `neon-http` : une fenêtre de
 * course existe entre la vérification du quota (dans `uploadDocument`) et cet
 * incrément si deux uploads sont strictement simultanés à la limite. Risque
 * accepté sciemment (usage associatif, pas de concurrence élevée attendue) —
 * cf. plan validé.
 */
export async function incrementOrganizationStorageUsage(
  organizationId: string,
  deltaBytes: number,
): Promise<void> {
  await db
    .insert(organizationStorageUsage)
    .values({ organizationId, usedBytes: deltaBytes })
    .onConflictDoUpdate({
      target: organizationStorageUsage.organizationId,
      set: {
        usedBytes: sql`${organizationStorageUsage.usedBytes} + ${deltaBytes}`,
        updatedAt: new Date(),
      },
    });
}

/** Décrémente le compteur (suppression de document), sans jamais passer sous zéro. */
export async function decrementOrganizationStorageUsage(
  organizationId: string,
  deltaBytes: number,
): Promise<void> {
  await db
    .update(organizationStorageUsage)
    .set({
      usedBytes: sql`GREATEST(0, ${organizationStorageUsage.usedBytes} - ${deltaBytes})`,
      updatedAt: new Date(),
    })
    .where(eq(organizationStorageUsage.organizationId, organizationId));
}
