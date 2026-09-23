import type { RemindableCotisationRow } from "./reminder-queries";

/** Un membre relançable et toutes ses cotisations relançables. */
export interface RemindableMemberGroup {
  memberId: string;
  memberFullName: string;
  memberEmail: string | null;
  memberPhone: string;
  cotisations: RemindableCotisationRow[];
  /** Somme des restants dus (due - paid) de toutes ses cotisations relançables. */
  remainingTotal: number;
}

/**
 * Regroupe les cotisations relançables par membre : la relance groupée
 * envoie un seul rappel par membre (récapitulant toutes ses cotisations en
 * retard), jamais un par cotisation. L'ordre d'apparition des membres est
 * conservé.
 */
export function groupRemindableByMember(
  rows: RemindableCotisationRow[],
): RemindableMemberGroup[] {
  const groups = new Map<string, RemindableMemberGroup>();

  for (const row of rows) {
    const remaining = Math.max(0, row.dueAmount - row.paidAmount);
    const group = groups.get(row.memberId);
    if (group) {
      group.cotisations.push(row);
      group.remainingTotal += remaining;
    } else {
      groups.set(row.memberId, {
        memberId: row.memberId,
        memberFullName: row.memberFullName,
        memberEmail: row.memberEmail,
        memberPhone: row.memberPhone,
        cotisations: [row],
        remainingTotal: remaining,
      });
    }
  }

  for (const group of groups.values()) {
    group.cotisations.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  }

  return [...groups.values()];
}
