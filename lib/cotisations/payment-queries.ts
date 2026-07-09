import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { cotisationTypes, cotisations, payments } from "@/lib/db/cotisations-schema";
import { associationMembers } from "@/lib/db/members-schema";
import { user } from "@/lib/db/auth-schema";

export type PaymentRow = typeof payments.$inferSelect;

export interface CotisationSummary {
  id: string;
  organizationId: string;
  memberId: string;
  memberFullName: string;
  cotisationTypeId: string;
  typeName: string;
  frequency: string;
  periodStart: string;
  periodLabel: string;
  dueAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
}

/**
 * Résumé d'une cotisation (membre + type joints), utilisé par la modal
 * d'encaissement et la page de détail. Multi-tenant strict : un `cotisationId`
 * d'une autre organisation renvoie `null`.
 */
export async function getCotisationSummary(
  organizationId: string,
  cotisationId: string,
): Promise<CotisationSummary | null> {
  const [row] = await db
    .select({
      id: cotisations.id,
      organizationId: cotisations.organizationId,
      memberId: cotisations.memberId,
      memberFullName: associationMembers.fullName,
      cotisationTypeId: cotisations.cotisationTypeId,
      typeName: cotisationTypes.name,
      frequency: cotisationTypes.frequency,
      periodStart: cotisations.periodStart,
      periodLabel: cotisations.periodLabel,
      dueAmount: cotisations.dueAmount,
      paidAmount: cotisations.paidAmount,
      status: cotisations.status,
      dueDate: cotisations.dueDate,
    })
    .from(cotisations)
    .innerJoin(associationMembers, eq(cotisations.memberId, associationMembers.id))
    .innerJoin(cotisationTypes, eq(cotisations.cotisationTypeId, cotisationTypes.id))
    .where(
      and(
        eq(cotisations.id, cotisationId),
        eq(cotisations.organizationId, organizationId),
        isNull(cotisations.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

// ─── Historique des paiements (checkpoint 2) ─────────────────────────────────

export interface PaymentWithRecorderRow {
  id: string;
  cotisationId: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  paymentReference: string | null;
  note: string | null;
  recordedByName: string;
  createdAt: Date;
}

/**
 * Historique des paiements d'une cotisation, plus récent d'abord, avec le nom
 * de la personne qui a enregistré chaque paiement. Multi-tenant strict.
 */
export async function listPaymentsForCotisation(
  organizationId: string,
  cotisationId: string,
): Promise<PaymentWithRecorderRow[]> {
  return db
    .select({
      id: payments.id,
      cotisationId: payments.cotisationId,
      amount: payments.amount,
      paidAt: payments.paidAt,
      paymentMethod: payments.paymentMethod,
      paymentReference: payments.paymentReference,
      note: payments.note,
      recordedByName: user.name,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .innerJoin(user, eq(payments.recordedByUserId, user.id))
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.cotisationId, cotisationId),
        isNull(payments.deletedAt),
      ),
    )
    .orderBy(desc(payments.paidAt), desc(payments.createdAt));
}

/**
 * Récupère un paiement par son id, borné à l'organisation et hors supprimés.
 * Un `paymentId` d'une autre organisation renvoie `null`.
 */
export async function getPaymentById(
  organizationId: string,
  paymentId: string,
): Promise<PaymentRow | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.organizationId, organizationId),
        isNull(payments.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}
