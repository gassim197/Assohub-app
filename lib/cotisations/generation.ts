import { and, eq, isNull, lt, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { cotisationTypes, cotisations } from "@/lib/db/cotisations-schema";
import { associationMembers } from "@/lib/db/members-schema";
import { isRecurringFrequency, type RecurringFrequency } from "./constants";
import { getCurrentPeriod, todayISO, type Period } from "./period";

/**
 * Bascule `en_attente` → `en_retard` pour toute cotisation dont l'échéance est
 * dépassée (schema-design §5.2). Aucun cron en 5A : ce sweep tourne à chaque
 * appel de `ensureCotisationsGenerated`, donc à chaque ouverture de la page
 * Cotisations. Idempotent par nature (ré-appliquer `en_retard` est un no-op).
 */
async function refreshOverdueStatuses(organizationId: string): Promise<void> {
  await db
    .update(cotisations)
    .set({ status: "en_retard" })
    .where(
      and(
        eq(cotisations.organizationId, organizationId),
        eq(cotisations.status, "en_attente"),
        lt(cotisations.dueDate, todayISO()),
        isNull(cotisations.deletedAt),
      ),
    );
}

/**
 * Génère les cotisations manquantes de la période courante pour un type
 * récurrent donné. Une requête anti-jointure identifie les membres actifs
 * éligibles (schema-design §5.1, pas de proration : `joined_at <= period_start`)
 * sans cotisation déjà créée pour `(type, period_start, member)` ; l'insertion
 * en lot s'appuie en plus sur l'index unique partiel
 * `cotisations_type_period_member_unique_idx` (`ON CONFLICT DO NOTHING`) pour
 * rester idempotente même sous une course entre deux ouvertures concurrentes
 * de la page (neon-http ne supporte pas les transactions interactives).
 */
async function generateForType(
  organizationId: string,
  type: typeof cotisationTypes.$inferSelect,
  period: Period,
): Promise<void> {
  const eligibleMembers = await db
    .select({ id: associationMembers.id })
    .from(associationMembers)
    .leftJoin(
      cotisations,
      and(
        eq(cotisations.memberId, associationMembers.id),
        eq(cotisations.cotisationTypeId, type.id),
        eq(cotisations.periodStart, period.periodStart),
        isNull(cotisations.deletedAt),
      ),
    )
    .where(
      and(
        eq(associationMembers.organizationId, organizationId),
        eq(associationMembers.status, "actif"),
        isNull(associationMembers.deletedAt),
        lte(associationMembers.joinedAt, period.periodStart),
        isNull(cotisations.id),
      ),
    );

  if (eligibleMembers.length === 0) return;

  await db
    .insert(cotisations)
    .values(
      eligibleMembers.map((member) => ({
        id: newId(),
        organizationId,
        cotisationTypeId: type.id,
        memberId: member.id,
        dueAmount: type.defaultAmount,
        periodLabel: period.canonicalLabel,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        dueDate: period.periodEnd,
        status: "en_attente" as const,
      })),
    )
    .onConflictDoNothing({
      target: [
        cotisations.cotisationTypeId,
        cotisations.periodStart,
        cotisations.memberId,
      ],
      where: sql`deleted_at IS NULL`,
    });
}

/**
 * Génération lazy des cotisations dues (session 5A, checkpoint 2).
 *
 * Appelée en Server Component avant le rendu de la page Cotisations. Pour
 * chaque type actif avec `auto_generate = true` et une fréquence récurrente
 * (`monthly` | `quarterly` | `annually`), crée les cotisations manquantes de
 * la période courante. Les types `one_time` ne sont jamais générés ici (créés
 * manuellement par le trésorier en 5B). Rafraîchit aussi les statuts en retard
 * avant de générer, pour que la page affiche toujours un état à jour.
 */
export async function ensureCotisationsGenerated(
  organizationId: string,
): Promise<void> {
  await refreshOverdueStatuses(organizationId);

  const activeTypes = await db
    .select()
    .from(cotisationTypes)
    .where(
      and(
        eq(cotisationTypes.organizationId, organizationId),
        eq(cotisationTypes.isActive, true),
        eq(cotisationTypes.autoGenerate, true),
        isNull(cotisationTypes.deletedAt),
      ),
    );

  const recurringTypes = activeTypes.filter((type) =>
    isRecurringFrequency(type.frequency),
  );
  if (recurringTypes.length === 0) return;

  const referenceDate = new Date();

  for (const type of recurringTypes) {
    const period = getCurrentPeriod(
      type.frequency as RecurringFrequency,
      referenceDate,
    );
    await generateForType(organizationId, type, period);
  }
}
