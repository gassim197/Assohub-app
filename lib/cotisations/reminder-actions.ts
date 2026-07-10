"use server";

import { revalidatePath } from "next/cache";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { paymentReminders } from "@/lib/db/cotisations-schema";
import { formatCurrency } from "@/lib/currency";
import {
  sendPaymentReminderEmail,
  type PaymentReminderEmailParams,
} from "@/lib/email/reminder-email";
import { isCotisationFrequency } from "./constants";
import { formatPeriodLabel } from "./period";
import { getRemindableCotisationById, type RemindableCotisationRow } from "./reminder-queries";

export type ReminderActionResult =
  | { ok: true }
  | { ok: false; error: "notRemindable" | "noEmail" | "sendFailed" | "unknown" };

/**
 * Construit les paramètres de l'email de relance à partir d'une cotisation
 * relançable. Les montants et la période sont formatés en français, figés au
 * moment de l'envoi — même décision que la description des transactions (5B) :
 * une ligne de communication déjà partie n'est pas re-localisable a posteriori.
 */
function buildReminderParams(
  row: RemindableCotisationRow,
  organizationName: string,
): PaymentReminderEmailParams {
  const frequency = isCotisationFrequency(row.frequency) ? row.frequency : "monthly";
  const remaining = Math.max(0, row.dueAmount - row.paidAmount);

  return {
    to: row.memberEmail!,
    memberFullName: row.memberFullName,
    organizationName,
    cotisationTypeName: row.typeName,
    periodLabel: formatPeriodLabel(row.periodStart, frequency, "fr"),
    dueAmountLabel: formatCurrency(row.dueAmount, "fr"),
    remainingAmountLabel: formatCurrency(remaining, "fr"),
    paidAmountLabel: row.paidAmount > 0 ? formatCurrency(row.paidAmount, "fr") : null,
  };
}

/**
 * Envoie un rappel de cotisation individuel (session 5C §3).
 *
 * La relançabilité est revérifiée ici via `getRemindableCotisationById`
 * (jamais de confiance dans l'état affiché côté client, potentiellement
 * périmé entre le chargement de la page et le clic). La ligne
 * `payment_reminders` n'est créée qu'après confirmation d'envoi par Resend —
 * jamais avant, pour ne pas tracer un rappel qui n'est jamais parti.
 */
export async function sendPaymentReminder(
  orgSlug: string,
  cotisationId: string,
): Promise<ReminderActionResult> {
  const { organizationId, userId, organization } = await requireOrgAccess(orgSlug);

  const cotisation = await getRemindableCotisationById(organizationId, cotisationId);
  if (!cotisation) {
    return { ok: false, error: "notRemindable" };
  }

  if (!cotisation.memberEmail) {
    return { ok: false, error: "noEmail" };
  }

  try {
    await sendPaymentReminderEmail(buildReminderParams(cotisation, organization.name));
  } catch {
    return { ok: false, error: "sendFailed" };
  }

  try {
    await db.insert(paymentReminders).values({
      id: newId(),
      organizationId,
      cotisationId,
      memberId: cotisation.memberId,
      sentByUserId: userId,
      channel: "email",
    });
  } catch {
    // L'email est parti (Resend a confirmé), seule la trace échoue à
    // s'écrire — cas résiduel rare, pas de retry ici (cf. décisions de
    // tolérance similaires en 5A/5B face aux contraintes de neon-http).
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/cotisations`);
  return { ok: true };
}
