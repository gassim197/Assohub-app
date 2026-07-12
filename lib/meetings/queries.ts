import { and, asc, desc, eq, gte, isNull, lt, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { meetings } from "@/lib/db/meetings-schema";

export type MeetingRow = typeof meetings.$inferSelect;

export interface ListMeetingsParams {
  organizationId: string;
  /** Filtre additif "YYYY-MM-DD" (calendrier, checkpoint 2) — ne remplace jamais le filtrage strict. */
  day?: string;
}

/**
 * Prochaines réunions (schema-design §6.1, règle critique — bug historique à
 * ne pas reproduire) : `scheduled_at >= NOW()` calculé à chaque appel, jamais
 * mis en cache, et `status IN ('planifiee', 'reportee')`. Triées par date
 * croissante (la plus proche en premier). Multi-tenant strict.
 */
export async function listUpcomingMeetings({
  organizationId,
  day,
}: ListMeetingsParams): Promise<MeetingRow[]> {
  const conditions = [
    eq(meetings.organizationId, organizationId),
    isNull(meetings.deletedAt),
    gte(meetings.scheduledAt, new Date()),
    or(eq(meetings.status, "planifiee"), eq(meetings.status, "reportee")),
  ];

  if (day) {
    conditions.push(sql`${meetings.scheduledAt}::date = ${day}::date`);
  }

  return db
    .select()
    .from(meetings)
    .where(and(...conditions))
    .orderBy(asc(meetings.scheduledAt));
}

/**
 * Réunions passées : `scheduled_at < NOW() OR status = 'tenue'`, en excluant
 * explicitement `annulee` (décision 6A : une réunion annulée n'apparaît dans
 * aucune des deux vues par défaut, même si sa date est passée — le filtre
 * littéral de schema-design.md ne l'excluait pas, corrigé ici avec
 * confirmation). Triées par date décroissante (la plus récente en premier).
 */
export async function listPastMeetings({
  organizationId,
  day,
}: ListMeetingsParams): Promise<MeetingRow[]> {
  const conditions = [
    eq(meetings.organizationId, organizationId),
    isNull(meetings.deletedAt),
    ne(meetings.status, "annulee"),
    or(lt(meetings.scheduledAt, new Date()), eq(meetings.status, "tenue")),
  ];

  if (day) {
    conditions.push(sql`${meetings.scheduledAt}::date = ${day}::date`);
  }

  return db
    .select()
    .from(meetings)
    .where(and(...conditions))
    .orderBy(desc(meetings.scheduledAt));
}
