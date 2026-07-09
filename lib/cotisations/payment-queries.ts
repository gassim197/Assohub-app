import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { cotisationTypes, cotisations, payments } from "@/lib/db/cotisations-schema";
import { associationMembers } from "@/lib/db/members-schema";

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
