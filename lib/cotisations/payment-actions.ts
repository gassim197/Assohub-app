"use server";

import { revalidatePath } from "next/cache";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { payments } from "@/lib/db/cotisations-schema";
import { transactions } from "@/lib/db/transactions-schema";
import { centimesToGnf, gnfToCentimes } from "@/lib/currency";
import { isCotisationFrequency } from "./constants";
import { formatPeriodLabel } from "./period";
import { recalculateCotisationStatement } from "./payment-recalc";
import { getCotisationSummary } from "./payment-queries";
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
