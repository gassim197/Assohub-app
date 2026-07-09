import { and, eq, isNull, lt, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { cotisationTypes, cotisations } from "@/lib/db/cotisations-schema";
import { associationMembers } from "@/lib/db/members-schema";
import {
  isRecurringFrequency,
  type CotisationFrequency,
  type RecurringFrequency,
} from "./constants";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Date du jour au format `YYYY-MM-DD`, en UTC (= Africa/Conakry, GMT+0 sans DST). */
export function todayISO(referenceDate: Date = new Date()): string {
  return toDateString(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );
}

/**
 * Bornes calendaires d'un mois, indépendamment de toute fréquence de
 * cotisation — utilisé par le filtre "période" de l'onglet Cotisations dues
 * (`monthOffset = 0` mois courant, `-1` mois dernier).
 */
export function getMonthRange(
  referenceDate: Date,
  monthOffset = 0,
): { from: string; to: string } {
  const base = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + monthOffset, 1),
  );
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  return {
    from: toDateString(year, month, 1),
    to: toDateString(year, month, lastDayOfMonth(year, month)),
  };
}

export interface Period {
  periodStart: string;
  periodEnd: string;
  /**
   * Forme canonique neutre stockée en base ("2026-07", "2026-Q3", "2026") —
   * jamais un libellé figé dans une langue (schema-design §5.2, décision 5A).
   */
  canonicalLabel: string;
}

/**
 * Détermine la période courante pour une fréquence récurrente donnée.
 * Calcul en UTC : Africa/Conakry est GMT+0 toute l'année (pas de DST), donc
 * les getters UTC de `Date` donnent directement la date locale de l'organisation.
 */
export function getCurrentPeriod(
  frequency: RecurringFrequency,
  referenceDate: Date = new Date(),
): Period {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth(); // 0-11

  if (frequency === "monthly") {
    return {
      periodStart: toDateString(year, month, 1),
      periodEnd: toDateString(year, month, lastDayOfMonth(year, month)),
      canonicalLabel: `${year}-${pad(month + 1)}`,
    };
  }

  if (frequency === "quarterly") {
    const quarterIndex = Math.floor(month / 3); // 0-3
    const startMonth = quarterIndex * 3;
    const endMonth = startMonth + 2;
    return {
      periodStart: toDateString(year, startMonth, 1),
      periodEnd: toDateString(year, endMonth, lastDayOfMonth(year, endMonth)),
      canonicalLabel: `${year}-Q${quarterIndex + 1}`,
    };
  }

  // annually
  return {
    periodStart: toDateString(year, 0, 1),
    periodEnd: toDateString(year, 11, 31),
    canonicalLabel: `${year}`,
  };
}

/**
 * Libellé de période affichable, calculé à la lecture à partir de `period_start`
 * (jamais depuis le `period_label` canonique stocké) : le cookie `NEXT_LOCALE`
 * est par navigateur, pas par organisation, donc l'affichage doit rester
 * calculable dans n'importe quelle locale à tout moment.
 */
export function formatPeriodLabel(
  periodStart: string,
  frequency: CotisationFrequency,
  locale: string,
): string {
  const [yearStr, monthStr, dayStr] = periodStart.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const date = new Date(Date.UTC(year, monthIndex, Number(dayStr)));

  if (frequency === "annually") {
    return String(year);
  }

  if (frequency === "quarterly") {
    const quarter = Math.floor(monthIndex / 3) + 1;
    const prefix = locale.startsWith("fr") ? "T" : "Q";
    return `${prefix}${quarter} ${year}`;
  }

  if (frequency === "monthly") {
    const formatted = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // one_time (5B) : pas de génération auto, mais l'affichage doit rester défini.
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

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
