import { and, eq, isNull, lt, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { cotisationTypes, cotisations } from "@/lib/db/cotisations-schema";
import { associationMembers } from "@/lib/db/members-schema";
import { todayISO } from "./period";

export interface RemindableCotisationRow {
  id: string;
  memberId: string;
  memberFullName: string;
  memberEmail: string | null;
  memberPhone: string;
  typeName: string;
  frequency: string;
  periodStart: string;
  periodLabel: string;
  dueAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
}

const remindableSelection = {
  id: cotisations.id,
  memberId: cotisations.memberId,
  memberFullName: associationMembers.fullName,
  memberEmail: associationMembers.email,
  memberPhone: associationMembers.phoneNumber,
  typeName: cotisationTypes.name,
  frequency: cotisationTypes.frequency,
  periodStart: cotisations.periodStart,
  periodLabel: cotisations.periodLabel,
  dueAmount: cotisations.dueAmount,
  paidAmount: cotisations.paidAmount,
  status: cotisations.status,
  dueDate: cotisations.dueDate,
};

/**
 * Prédicat de relançabilité (session 5C §1) : `en_retard`, ou `partiel` dont
 * l'échéance est dépassée (un partiel à jour n'est jamais en retard — même
 * règle de priorité que le calcul de statut, 5B décision A). Le membre
 * bénéficiaire ne doit pas être archivé (`deleted_at IS NULL`, le même sens
 * qu'ailleurs dans le code — cf. `softDeleteMember`).
 */
function remindableConditions(organizationId: string) {
  return and(
    eq(cotisations.organizationId, organizationId),
    isNull(cotisations.deletedAt),
    isNull(associationMembers.deletedAt),
    or(
      eq(cotisations.status, "en_retard"),
      and(eq(cotisations.status, "partiel"), lt(cotisations.dueDate, todayISO())),
    ),
  );
}

/**
 * Toutes les cotisations relançables d'une organisation, avec les infos du
 * membre nécessaires à l'envoi (email, téléphone). Multi-tenant strict.
 */
export async function getRemindableCotisations(
  organizationId: string,
): Promise<RemindableCotisationRow[]> {
  return db
    .select(remindableSelection)
    .from(cotisations)
    .innerJoin(associationMembers, eq(cotisations.memberId, associationMembers.id))
    .innerJoin(cotisationTypes, eq(cotisations.cotisationTypeId, cotisationTypes.id))
    .where(remindableConditions(organizationId));
}

/**
 * Une cotisation relançable par son id — même filtre que
 * `getRemindableCotisations`, utilisé par `sendPaymentReminder` pour
 * revérifier la relançabilité côté serveur au moment de l'envoi (jamais de
 * confiance dans un état affiché côté client, potentiellement périmé).
 */
export async function getRemindableCotisationById(
  organizationId: string,
  cotisationId: string,
): Promise<RemindableCotisationRow | null> {
  const [row] = await db
    .select(remindableSelection)
    .from(cotisations)
    .innerJoin(associationMembers, eq(cotisations.memberId, associationMembers.id))
    .innerJoin(cotisationTypes, eq(cotisations.cotisationTypeId, cotisationTypes.id))
    .where(and(remindableConditions(organizationId), eq(cotisations.id, cotisationId)))
    .limit(1);

  return row ?? null;
}
