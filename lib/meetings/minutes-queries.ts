import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { minutes } from "@/lib/db/meetings-schema";

export type MinutesRow = typeof minutes.$inferSelect;

/**
 * PV « courant » d'une réunion : le PV non-archivé s'il existe (au plus un,
 * règle du schéma §6.5), sinon le plus récent PV archivé à titre de dernière
 * trace. `null` si aucun PV n'a jamais été créé pour cette réunion.
 *
 * Un meeting n'a jamais plus de 2-3 PV en pratique (contrainte applicative,
 * pas de volume) : on récupère tout et on choisit en JS plutôt qu'une requête
 * SQL à tri conditionnel, plus simple à lire et à maintenir.
 */
export async function getCurrentMinutesForMeeting(
  organizationId: string,
  meetingId: string,
): Promise<MinutesRow | null> {
  const rows = await db
    .select()
    .from(minutes)
    .where(
      and(
        eq(minutes.organizationId, organizationId),
        eq(minutes.meetingId, meetingId),
        isNull(minutes.deletedAt),
      ),
    )
    .orderBy(desc(minutes.createdAt));

  if (rows.length === 0) return null;

  return rows.find((row) => row.status !== "archive") ?? rows[0]!;
}
