import { and, asc, eq, isNull, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { associationMembers } from "@/lib/db/members-schema";
import { meetingAttendance } from "@/lib/db/meetings-schema";
import { DEFAULT_RSVP_STATUS, isRsvpStatus, type RsvpStatus } from "./constants";

export interface MemberAttendanceRow {
  memberId: string;
  fullName: string;
  rsvpStatus: RsvpStatus;
  attended: boolean | null;
  /**
   * `true` si le membre n'est plus actif (statut changé ou fiche
   * supprimée) depuis la saisie de sa présence. Ligne historique en lecture
   * seule — jamais proposée pour une nouvelle saisie (schema-design §6.4).
   */
  isArchived: boolean;
}

/**
 * État de présence complet d'une réunion (checkpoint 1) : jointure entre
 * TOUS les membres actifs de l'organisation et les lignes `meeting_attendance`
 * existantes pour cette réunion. Un membre actif sans ligne apparaît avec les
 * valeurs par défaut (`no_response`, `attended: null`) — aucune écriture
 * n'est faite ici, l'upsert lazy est réservé aux Server Actions.
 *
 * Complétée par les lignes `meeting_attendance` de membres devenus non-actifs
 * (statut changé ou fiche supprimée) *après* avoir été saisis pour cette
 * réunion : leur présence historique reste affichée (`isArchived: true`,
 * lecture seule côté UI) au lieu de disparaître silencieusement.
 *
 * Deux requêtes indexées plutôt qu'un UNION SQL : plus simple à typer côté
 * Drizzle, et le volume (dizaines à ~200 membres par organisation) rend le
 * coût de la seconde requête négligeable.
 */
export async function getMeetingAttendance(
  organizationId: string,
  meetingId: string,
): Promise<MemberAttendanceRow[]> {
  const [activeRows, archivedRows] = await Promise.all([
    db
      .select({
        memberId: associationMembers.id,
        fullName: associationMembers.fullName,
        rsvpStatus: meetingAttendance.rsvpStatus,
        attended: meetingAttendance.attended,
      })
      .from(associationMembers)
      .leftJoin(
        meetingAttendance,
        and(
          eq(meetingAttendance.memberId, associationMembers.id),
          eq(meetingAttendance.meetingId, meetingId),
          isNull(meetingAttendance.deletedAt),
        ),
      )
      .where(
        and(
          eq(associationMembers.organizationId, organizationId),
          eq(associationMembers.status, "actif"),
          isNull(associationMembers.deletedAt),
        ),
      )
      .orderBy(asc(associationMembers.fullName)),

    db
      .select({
        memberId: associationMembers.id,
        fullName: associationMembers.fullName,
        rsvpStatus: meetingAttendance.rsvpStatus,
        attended: meetingAttendance.attended,
      })
      .from(meetingAttendance)
      .innerJoin(
        associationMembers,
        eq(associationMembers.id, meetingAttendance.memberId),
      )
      .where(
        and(
          eq(meetingAttendance.organizationId, organizationId),
          eq(meetingAttendance.meetingId, meetingId),
          isNull(meetingAttendance.deletedAt),
          or(
            ne(associationMembers.status, "actif"),
            sql`${associationMembers.deletedAt} IS NOT NULL`,
          ),
        ),
      )
      .orderBy(asc(associationMembers.fullName)),
  ]);

  const toRow = (
    row: {
      memberId: string;
      fullName: string;
      rsvpStatus: string | null;
      attended: boolean | null;
    },
    isArchived: boolean,
  ): MemberAttendanceRow => ({
    memberId: row.memberId,
    fullName: row.fullName,
    rsvpStatus: isRsvpStatus(row.rsvpStatus ?? "") ? (row.rsvpStatus as RsvpStatus) : DEFAULT_RSVP_STATUS,
    attended: row.attended,
    isArchived,
  });

  return [
    ...activeRows.map((row) => toRow(row, false)),
    ...archivedRows.map((row) => toRow(row, true)),
  ];
}
