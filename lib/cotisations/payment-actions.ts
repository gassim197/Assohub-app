"use server";

import { revalidatePath } from "next/cache";

import { and, eq, isNull } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { payments } from "@/lib/db/cotisations-schema";
import { transactions } from "@/lib/db/transactions-schema";
import { centimesToGnf, gnfToCentimes } from "@/lib/currency";
import { isCotisationFrequency } from "./constants";
import { formatPeriodLabel } from "./period";
import { recalculateCotisationStatement } from "./payment-recalc";
import { getCotisationSummary, getPaymentById } from "./payment-queries";
import { paymentServerSchema } from "./payment-schema";

export type PaymentActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "notFound" | "exceedsRemaining" | "unknown";
      /** Montant restant dû, en GNF — fourni uniquement pour `exceedsRemaining`. */
      remaining?: number;
    };

/**
 * Enregistre un paiement (session 5B §1, cœur du module financier).
 *
 * Atomicité : `neon-http` ne supporte pas `db.transaction()` (confirmé dans
 * le driver — même contrainte que l'ADR-0002). `db.batch()` s'appuie sur le
 * vrai `client.transaction()` du SDK Neon HTTP (BEGIN...COMMIT serveur, un
 * aller-retour) : si une des 3 écritures échoue, tout le batch est annulé.
 * `paymentId` est généré avant le batch (cuid2, comme partout dans le projet)
 * — jamais besoin de relire un résultat intermédiaire entre deux requêtes.
 *
 * Le dépassement du montant dû est vérifié ici, après re-fetch serveur de la
 * cotisation (jamais de confiance dans une valeur client) — fenêtre de course
 * résiduelle assumée (pas de verrou interactif possible avec `neon-http`,
 * négligeable sur le profil d'usage réel d'une association).
 */
export async function recordPayment(
  orgSlug: string,
  cotisationId: string,
  raw: unknown,
): Promise<PaymentActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const parsed = paymentServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const summary = await getCotisationSummary(organizationId, cotisationId);
  if (!summary) {
    return { ok: false, error: "notFound" };
  }

  const amountCentimes = gnfToCentimes(data.amount);
  const remainingCentimes = summary.dueAmount - summary.paidAmount;
  if (amountCentimes > remainingCentimes) {
    return {
      ok: false,
      error: "exceedsRemaining",
      remaining: centimesToGnf(Math.max(0, remainingCentimes)),
    };
  }

  const paymentId = newId();
  const frequency = isCotisationFrequency(summary.frequency)
    ? summary.frequency
    : "monthly";
  // Description toujours en français : ligne de grand livre comptable, pas un
  // libellé re-localisable par lecteur comme `period_label` (décision 5A).
  const periodLabelFr = formatPeriodLabel(summary.periodStart, frequency, "fr");
  const description = `Cotisation ${summary.typeName} — ${summary.memberFullName} — ${periodLabelFr}`;

  try {
    await db.batch([
      db.insert(payments).values({
        id: paymentId,
        organizationId,
        cotisationId,
        memberId: summary.memberId,
        recordedByUserId: userId,
        amount: amountCentimes,
        paidAt: data.paidAt,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference ?? null,
        note: data.note ?? null,
      }),
      db.insert(transactions).values({
        id: newId(),
        organizationId,
        recordedByUserId: userId,
        type: "revenue",
        category: "cotisations",
        amount: amountCentimes,
        occurredAt: data.paidAt,
        paymentId,
        description,
      }),
      recalculateCotisationStatement(cotisationId, organizationId),
    ]);
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/cotisations`);
  revalidatePath(`/${orgSlug}/cotisations/${cotisationId}`);
  return { ok: true };
}

/**
 * Corrige un paiement existant (session 5B, checkpoint 2) : méthode,
 * référence, note, date, montant. `cotisationId`/`memberId` restent fixes
 * (pas de réaffectation d'un paiement à une autre cotisation).
 *
 * Le dépassement du montant dû est revérifié en excluant ce paiement de son
 * propre calcul (`paid_amount actuel - montant actuel du paiement + nouveau
 * montant`), pour ne pas se pénaliser lui-même dans la comparaison.
 *
 * Même garantie d'atomicité que `recordPayment` : `payments` + `transactions`
 * (montant, date resynchronisés) + recalcul, dans un seul `db.batch()`.
 */
export async function updatePayment(
  orgSlug: string,
  paymentId: string,
  raw: unknown,
): Promise<PaymentActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = paymentServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const existingPayment = await getPaymentById(organizationId, paymentId);
  if (!existingPayment) {
    return { ok: false, error: "notFound" };
  }

  const summary = await getCotisationSummary(organizationId, existingPayment.cotisationId);
  if (!summary) {
    return { ok: false, error: "notFound" };
  }

  const amountCentimes = gnfToCentimes(data.amount);
  const otherPaidCentimes = summary.paidAmount - existingPayment.amount;
  const remainingCentimes = summary.dueAmount - otherPaidCentimes;
  if (amountCentimes > remainingCentimes) {
    return {
      ok: false,
      error: "exceedsRemaining",
      remaining: centimesToGnf(Math.max(0, remainingCentimes)),
    };
  }

  try {
    await db.batch([
      db
        .update(payments)
        .set({
          amount: amountCentimes,
          paidAt: data.paidAt,
          paymentMethod: data.paymentMethod,
          paymentReference: data.paymentReference ?? null,
          note: data.note ?? null,
        })
        .where(
          and(
            eq(payments.id, paymentId),
            eq(payments.organizationId, organizationId),
            isNull(payments.deletedAt),
          ),
        ),
      db
        .update(transactions)
        .set({
          amount: amountCentimes,
          occurredAt: data.paidAt,
        })
        .where(
          and(
            eq(transactions.paymentId, paymentId),
            eq(transactions.organizationId, organizationId),
            isNull(transactions.deletedAt),
          ),
        ),
      recalculateCotisationStatement(existingPayment.cotisationId, organizationId),
    ]);
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/cotisations`);
  revalidatePath(`/${orgSlug}/cotisations/${existingPayment.cotisationId}`);
  return { ok: true };
}

/**
 * Annule un paiement (soft delete, session 5B checkpoint 2). La transaction
 * comptable liée est soft-deletée dans le même `db.batch()`, et `paid_amount`/
 * `status` de la cotisation sont recalculés (la ligne exclue du `SUM` dès que
 * `deleted_at` est posé, avant que la requête de recalcul ne s'exécute — même
 * batch, exécution séquentielle).
 */
export async function softDeletePayment(
  orgSlug: string,
  paymentId: string,
): Promise<PaymentActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const existingPayment = await getPaymentById(organizationId, paymentId);
  if (!existingPayment) {
    return { ok: false, error: "notFound" };
  }

  const now = new Date();

  try {
    await db.batch([
      db
        .update(payments)
        .set({ deletedAt: now })
        .where(
          and(
            eq(payments.id, paymentId),
            eq(payments.organizationId, organizationId),
            isNull(payments.deletedAt),
          ),
        ),
      db
        .update(transactions)
        .set({ deletedAt: now })
        .where(
          and(
            eq(transactions.paymentId, paymentId),
            eq(transactions.organizationId, organizationId),
            isNull(transactions.deletedAt),
          ),
        ),
      recalculateCotisationStatement(existingPayment.cotisationId, organizationId),
    ]);
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/cotisations`);
  revalidatePath(`/${orgSlug}/cotisations/${existingPayment.cotisationId}`);
  return { ok: true };
}
