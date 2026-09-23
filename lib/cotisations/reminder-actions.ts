"use server";

import { revalidatePath } from "next/cache";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { paymentReminders } from "@/lib/db/cotisations-schema";
import { formatCurrency } from "@/lib/currency";
import {
  sendBulkPaymentReminderEmails,
  sendPaymentReminderEmail,
  type BulkReminderRecipient,
  type MultiPaymentReminderEmailParams,
  type PaymentReminderEmailParams,
} from "@/lib/email/reminder-email";
import { isCotisationFrequency } from "./constants";
import { formatPeriodLabel } from "./period";
import { groupRemindableByMember, type RemindableMemberGroup } from "./reminder-groups";
import {
  getRemindableCotisationById,
  getRemindableCotisations,
  type RemindableCotisationRow,
} from "./reminder-queries";

export type ReminderActionResult =
  | { ok: true }
  | { ok: false; error: "notRemindable" | "noEmail" | "sendFailed" | "unknown" };

export interface BulkReminderResult {
  ok: true;
  sentCount: number;
  failedCount: number;
  noEmailCount: number;
}

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
 * Paramètres de l'email de relance groupée d'un membre : l'email individuel
 * habituel s'il n'a qu'une cotisation relançable, sinon un récapitulatif de
 * toutes ses cotisations relançables en un seul email.
 */
function buildMemberReminderParams(
  group: RemindableMemberGroup,
  organizationName: string,
): PaymentReminderEmailParams | MultiPaymentReminderEmailParams {
  if (group.cotisations.length === 1) {
    return buildReminderParams(group.cotisations[0]!, organizationName);
  }

  return {
    to: group.memberEmail!,
    memberFullName: group.memberFullName,
    organizationName,
    lines: group.cotisations.map((row) => {
      const frequency = isCotisationFrequency(row.frequency) ? row.frequency : "monthly";
      return {
        cotisationTypeName: row.typeName,
        periodLabel: formatPeriodLabel(row.periodStart, frequency, "fr"),
        remainingAmountLabel: formatCurrency(Math.max(0, row.dueAmount - row.paidAmount), "fr"),
      };
    }),
    totalRemainingLabel: formatCurrency(group.remainingTotal, "fr"),
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

/**
 * Envoie un rappel à chaque membre ayant au moins une cotisation relançable
 * et un email (session 5C §4, checkpoint 2) — un seul email par membre,
 * récapitulant toutes ses cotisations relançables. Les compteurs renvoyés
 * sont des nombres de membres. Récupère systématiquement l'état frais des
 * cotisations relançables (jamais une liste fournie par le client) : aucun
 * paramètre autre que `orgSlug`, par construction.
 *
 * N'écrit une ligne `payment_reminders` que pour les envois confirmés
 * réussis (cf. `sendBulkPaymentReminderEmails` pour la logique de lot/échecs
 * partiels) — un seul `INSERT` multi-lignes, atomique nativement en Postgres
 * pour ce lot de succès. Une ligne par cotisation couverte par l'email : l'historique
 * de relance reste consultable cotisation par cotisation.
 */
export async function sendBulkPaymentReminders(
  orgSlug: string,
): Promise<BulkReminderResult | { ok: false; error: "unknown" }> {
  const { organizationId, userId, organization } = await requireOrgAccess(orgSlug);

  let remindable: RemindableCotisationRow[];
  try {
    remindable = await getRemindableCotisations(organizationId);
  } catch {
    return { ok: false, error: "unknown" };
  }

  const groups = groupRemindableByMember(remindable);
  const withEmail = groups.filter((group) => group.memberEmail);
  const noEmailCount = groups.length - withEmail.length;

  if (withEmail.length === 0) {
    return { ok: true, sentCount: 0, failedCount: 0, noEmailCount };
  }

  const recipients: BulkReminderRecipient[] = withEmail.map((group) => ({
    memberId: group.memberId,
    email: buildMemberReminderParams(group, organization.name),
  }));

  let outcomes;
  try {
    outcomes = await sendBulkPaymentReminderEmails(recipients);
  } catch {
    return { ok: false, error: "unknown" };
  }

  const succeeded = outcomes.filter((o) => o.ok);
  const failedCount = outcomes.length - succeeded.length;

  if (succeeded.length > 0) {
    const byMemberId = new Map(withEmail.map((group) => [group.memberId, group]));
    try {
      await db.insert(paymentReminders).values(
        succeeded
          .flatMap((outcome) => byMemberId.get(outcome.memberId)?.cotisations ?? [])
          .map((row) => ({
            id: newId(),
            organizationId,
            cotisationId: row.id,
            memberId: row.memberId,
            sentByUserId: userId,
            channel: "email" as const,
          })),
      );
    } catch {
      // Les emails sont partis (Resend a confirmé), seule la trace groupée
      // échoue à s'écrire — même tolérance résiduelle que ci-dessus.
    }
  }

  revalidatePath(`/${orgSlug}/cotisations`);

  return {
    ok: true,
    sentCount: succeeded.length,
    failedCount,
    noEmailCount,
  };
}
