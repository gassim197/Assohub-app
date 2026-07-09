import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { cotisationTypes } from "@/lib/db/cotisations-schema";

export type CotisationTypeRow = typeof cotisationTypes.$inferSelect;

/**
 * Liste des types de cotisations d'une organisation, non archivés.
 * Multi-tenant strict : borné à `organizationId` + `deleted_at IS NULL`.
 */
export async function getCotisationTypes(
  organizationId: string,
): Promise<CotisationTypeRow[]> {
  return db
    .select()
    .from(cotisationTypes)
    .where(
      and(
        eq(cotisationTypes.organizationId, organizationId),
        isNull(cotisationTypes.deletedAt),
      ),
    )
    .orderBy(desc(cotisationTypes.createdAt));
}

/**
 * Récupère un type de cotisation par son id, borné à l'organisation et hors
 * archivés. Un `typeId` d'une autre organisation renvoie `null`.
 */
export async function getCotisationTypeById(
  organizationId: string,
  typeId: string,
): Promise<CotisationTypeRow | null> {
  const [row] = await db
    .select()
    .from(cotisationTypes)
    .where(
      and(
        eq(cotisationTypes.id, typeId),
        eq(cotisationTypes.organizationId, organizationId),
        isNull(cotisationTypes.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}
