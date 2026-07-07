import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { pendingInvitations } from "@/lib/db/members-schema";

export type PendingInvitationRow = typeof pendingInvitations.$inferSelect;

/**
 * Invitations non résolues d'une organisation (schema-design §4.4) : ni
 * acceptées, ni refusées, ni archivées. Inclut les invitations expirées (le
 * statut d'affichage — dont "expirée" — se calcule côté UI via
 * `invitationStatus`), pour que le président puisse les renvoyer/annuler.
 */
export async function listPendingInvitations(
  organizationId: string,
): Promise<PendingInvitationRow[]> {
  return db
    .select()
    .from(pendingInvitations)
    .where(
      and(
        eq(pendingInvitations.organizationId, organizationId),
        isNull(pendingInvitations.acceptedAt),
        isNull(pendingInvitations.declinedAt),
        isNull(pendingInvitations.deletedAt),
      ),
    )
    .orderBy(desc(pendingInvitations.createdAt));
}

/**
 * Compte les invitations réellement "en attente" (ni résolues, ni expirées) —
 * utilisé pour le badge compteur de l'onglet ("Invitations (N en attente)").
 */
export function countActuallyPending(rows: PendingInvitationRow[]): number {
  const now = Date.now();
  return rows.filter((row) => row.expiresAt.getTime() >= now).length;
}
