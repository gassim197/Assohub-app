import { EMAIL_FROM, resend } from "./client";
import { escapeHtml } from "./escape-html";

const FONT_STACK =
  "'Geist Sans', 'Segoe UI', system-ui, -apple-system, sans-serif";

export interface PaymentReminderEmailParams {
  to: string;
  memberFullName: string;
  organizationName: string;
  cotisationTypeName: string;
  /** Déjà formaté et localisé côté appelant (ex. "Juillet 2026"). */
  periodLabel: string;
  /** Montants déjà formatés (ex. "20 000 GNF"). */
  dueAmountLabel: string;
  remainingAmountLabel: string;
  /** `null` si aucun paiement partiel (cotisation `en_retard`, jamais payée). */
  paidAmountLabel: string | null;
}

/** Une ligne du récapitulatif d'un rappel portant sur plusieurs cotisations. */
export interface ReminderEmailLine {
  cotisationTypeName: string;
  /** Déjà formaté et localisé côté appelant (ex. "Juillet 2026"). */
  periodLabel: string;
  /** Montant déjà formaté (ex. "20 000 GNF"). */
  remainingAmountLabel: string;
}

/**
 * Rappel unique récapitulant plusieurs cotisations d'un même membre (relance
 * groupée : un seul email par membre, jamais un par cotisation).
 */
export interface MultiPaymentReminderEmailParams {
  to: string;
  memberFullName: string;
  organizationName: string;
  lines: ReminderEmailLine[];
  /** Total restant dû, déjà formaté. */
  totalRemainingLabel: string;
}

/**
 * Textes FR (défaut V1) et EN (préparé, non câblé — aucune préférence de
 * langue par organisation n'existe encore ; session 5C §5, point 6 : bake
 * seulement, pas d'automatisation).
 */
const STRINGS = {
  fr: {
    subject: (orgName: string) => `Rappel de cotisation — ${orgName}`,
    title: "Rappel de cotisation",
    greeting: (firstName: string) => `Bonjour ${firstName},`,
    body: (type: string, period: string, amount: string, orgName: string) =>
      `Nous espérons que vous allez bien. Nous vous rappelons que votre cotisation <strong>${type}</strong> pour <strong>${period}</strong> d'un montant de <strong>${amount}</strong> reste à régler.<br /><br />Merci de votre engagement envers ${orgName}.`,
    bodyMultiple: (count: number, amount: string, orgName: string) =>
      `Nous espérons que vous allez bien. Nous vous rappelons que <strong>${count} cotisations</strong> restent à régler, pour un total de <strong>${amount}</strong>.<br /><br />Merci de votre engagement envers ${orgName}.`,
    dueAmount: "Montant dû",
    paidAmount: "Déjà payé",
    remaining: "Restant à régler",
    totalRemaining: "Total restant à régler",
    period: "Période",
    signature: (orgName: string) => `À bientôt,<br />L'équipe de ${orgName}`,
    footer: "AssoHub — L'infrastructure numérique des organisations africaines",
  },
  en: {
    subject: (orgName: string) => `Contribution reminder — ${orgName}`,
    title: "Contribution reminder",
    greeting: (firstName: string) => `Hello ${firstName},`,
    body: (type: string, period: string, amount: string, orgName: string) =>
      `We hope you are doing well. This is a reminder that your <strong>${type}</strong> contribution for <strong>${period}</strong>, amounting to <strong>${amount}</strong>, is still outstanding.<br /><br />Thank you for your commitment to ${orgName}.`,
    bodyMultiple: (count: number, amount: string, orgName: string) =>
      `We hope you are doing well. This is a reminder that <strong>${count} contributions</strong> are still outstanding, for a total of <strong>${amount}</strong>.<br /><br />Thank you for your commitment to ${orgName}.`,
    dueAmount: "Amount due",
    paidAmount: "Already paid",
    remaining: "Remaining balance",
    totalRemaining: "Total remaining",
    period: "Period",
    signature: (orgName: string) => `See you soon,<br />The ${orgName} team`,
    footer: "AssoHub — The digital infrastructure for African organizations",
  },
} as const;

type ReminderLocale = keyof typeof STRINGS;

/** Premier prénom d'un nom complet, pour la formule de politesse. */
function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** Ligne libellé / valeur de l'encart informatif. Arguments déjà échappés. */
function detailRow(label: string, value: string, valueColor?: string): string {
  const color = valueColor ? `color:${valueColor};` : "";
  return `<tr>
                          <td style="padding:4px 0;color:#64748b;">${label}</td>
                          <td style="padding:4px 0;text-align:right;font-weight:bold;${color}">${value}</td>
                        </tr>`;
}

/**
 * Gabarit de l'email de relance (session 5C §5), même patron visuel que
 * l'email d'invitation (`invitation-email.ts`) : header navy + logo texte,
 * corps clair, encart informatif, footer AssoHub. Volontairement **sans**
 * CTA « payer en ligne » — le paiement en ligne n'existe pas en V1, le
 * rappel informe, il n'encaisse pas. `bodyHtml` et `rowsHtml` sont déjà
 * échappés par l'appelant.
 */
function reminderEmailShell(
  locale: ReminderLocale,
  memberFullName: string,
  organizationName: string,
  bodyHtml: string,
  rowsHtml: string,
): string {
  const s = STRINGS[locale];
  const memberFirstName = escapeHtml(firstName(memberFullName));

  return `
<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#0F172A;padding:28px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;font-family:${FONT_STACK};">AssoHub</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;color:#0F172A;">
                <h1 style="margin:0 0 20px;font-size:20px;font-family:${FONT_STACK};">${s.title}</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;font-family:${FONT_STACK};">
                  ${s.greeting(memberFirstName)}
                </p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;font-family:${FONT_STACK};">
                  ${bodyHtml}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f8fafc;border-radius:6px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;font-family:${FONT_STACK};color:#334155;">
                        ${rowsHtml}
                      </table>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;font-family:${FONT_STACK};">
                  ${s.signature(organizationName)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#f8fafc;text-align:center;">
                <span style="font-size:11px;color:#94a3b8;font-family:${FONT_STACK};">${s.footer}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Email de relance portant sur une seule cotisation. */
function reminderEmailHtml(
  params: PaymentReminderEmailParams,
  locale: ReminderLocale,
): string {
  const s = STRINGS[locale];
  const organizationName = escapeHtml(params.organizationName);
  const cotisationTypeName = escapeHtml(params.cotisationTypeName);
  const periodLabel = escapeHtml(params.periodLabel);
  const remainingAmountLabel = escapeHtml(params.remainingAmountLabel);

  const rows = [
    detailRow(s.period, periodLabel),
    detailRow(s.dueAmount, escapeHtml(params.dueAmountLabel)),
    params.paidAmountLabel
      ? detailRow(s.paidAmount, escapeHtml(params.paidAmountLabel))
      : "",
    detailRow(s.remaining, remainingAmountLabel, "#10B981"),
  ].join("");

  return reminderEmailShell(
    locale,
    params.memberFullName,
    organizationName,
    s.body(cotisationTypeName, periodLabel, remainingAmountLabel, organizationName),
    rows,
  );
}

/** Email de relance récapitulant plusieurs cotisations d'un même membre. */
function multiReminderEmailHtml(
  params: MultiPaymentReminderEmailParams,
  locale: ReminderLocale,
): string {
  const s = STRINGS[locale];
  const organizationName = escapeHtml(params.organizationName);
  const totalRemainingLabel = escapeHtml(params.totalRemainingLabel);

  const rows = [
    ...params.lines.map((line) =>
      detailRow(
        `${escapeHtml(line.cotisationTypeName)} — ${escapeHtml(line.periodLabel)}`,
        escapeHtml(line.remainingAmountLabel),
      ),
    ),
    detailRow(s.totalRemaining, totalRemainingLabel, "#10B981"),
  ].join("");

  return reminderEmailShell(
    locale,
    params.memberFullName,
    organizationName,
    s.bodyMultiple(params.lines.length, totalRemainingLabel, organizationName),
    rows,
  );
}

/**
 * Envoie un rappel de cotisation individuel (session 5C §3). Même patron
 * que `sendInvitationEmail` : le SDK Resend ne lève pas d'exception pour les
 * erreurs API, il faut inspecter `error` explicitement.
 */
export async function sendPaymentReminderEmail(
  params: PaymentReminderEmailParams,
  locale: ReminderLocale = "fr",
): Promise<void> {
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: STRINGS[locale].subject(params.organizationName),
    html: reminderEmailHtml(params, locale),
  });
  console.log("[reminders] Resend response", { to: params.to, data, error });

  if (error) {
    throw new Error(`Resend error: ${error.name} — ${error.message}`);
  }
}

/**
 * Un destinataire de la relance groupée = un membre (un seul email par
 * membre). `email` porte soit une seule cotisation, soit le récapitulatif de
 * plusieurs (`lines`).
 */
export interface BulkReminderRecipient {
  /** Sert à faire correspondre le succès/échec de chaque envoi à son destinataire d'origine. */
  memberId: string;
  email: PaymentReminderEmailParams | MultiPaymentReminderEmailParams;
}

export interface BulkSendOutcome {
  memberId: string;
  ok: boolean;
}

function bulkRecipientHtml(
  recipient: BulkReminderRecipient,
  locale: ReminderLocale,
): string {
  return "lines" in recipient.email
    ? multiReminderEmailHtml(recipient.email, locale)
    : reminderEmailHtml(recipient.email, locale);
}

/**
 * Limite documentée de l'API batch Resend (jusqu'à 100 emails par appel).
 * @link https://resend.com/docs/dashboard/emails/batch-sending#limitations
 */
const RESEND_BATCH_MAX = 100;
/** Pause entre deux lots, uniquement utile si >100 destinataires (rare pour une association). */
const RESEND_BATCH_DELAY_MS = 600;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Envoie des rappels en masse via l'API batch de Resend (session 5C §4,
 * checkpoint 2) — un seul aller-retour HTTP pour jusqu'à 100 destinataires,
 * plutôt qu'une boucle d'envois individuels qui se ferait throttler.
 *
 * `batchValidation: 'permissive'` : un destinataire invalide ne fait pas
 * échouer les autres — Resend renvoie les échecs par index dans `errors[]`.
 * On détermine le succès de chaque destinataire par son **absence** de
 * `errors[]`, plutôt que par sa présence dans `data[]` dont la forme exacte
 * sous validation permissive n'est pas garantie de correspondre 1:1 à
 * l'ordre d'entrée — cette approche reste correcte quelle que soit cette forme.
 *
 * Si plus de 100 destinataires (improbable pour une association), on
 * découpe en lots avec une courte pause entre chaque appel.
 *
 * Limite vérifiée en conditions réelles (session 5C) : `errors[]` ne couvre
 * que les échecs de **validation de payload** (champ manquant, email mal
 * formé — cf. doc Resend), pas les rejets de **restriction de compte**. En
 * mode test (domaine non vérifié), un envoi vers une adresse autre que celle
 * vérifiée du compte est accepté par l'API batch (aucune entrée dans
 * `errors[]`, un `id` renvoyé comme pour un succès) puis échoue silencieusement
 * à la livraison — visible seulement dans le dashboard Resend, jamais dans
 * cette réponse synchrone. `sentCount` signifie donc « accepté par l'API »,
 * pas « confirmé délivré » : cohérent avec `payment_reminders.delivered_at`
 * qui reste `NULL` en V1 (réservé à une future intégration webhook, jamais
 * renseigné aujourd'hui). Cette restriction disparaît en production dès
 * qu'un domaine d'envoi est vérifié — un vrai destinataire y est toujours
 * livrable, seule la vérification de payload s'applique alors.
 */
export async function sendBulkPaymentReminderEmails(
  recipients: BulkReminderRecipient[],
  locale: ReminderLocale = "fr",
): Promise<BulkSendOutcome[]> {
  const outcomes: BulkSendOutcome[] = [];
  const batches = chunk(recipients, RESEND_BATCH_MAX);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]!;

    try {
      const { data, error } = await resend.batch.send(
        batch.map((recipient) => ({
          from: EMAIL_FROM,
          to: recipient.email.to,
          subject: STRINGS[locale].subject(recipient.email.organizationName),
          html: bulkRecipientHtml(recipient, locale),
        })),
        { batchValidation: "permissive" },
      );
      console.log("[reminders] Resend batch response", {
        batchIndex,
        size: batch.length,
        dataCount: data?.data?.length,
        errors: data?.errors,
        error,
      });

      if (error) {
        // Échec du lot entier (ex. clé API invalide) : tous les destinataires
        // de ce lot sont marqués en échec, les autres lots continuent.
        for (const recipient of batch) {
          outcomes.push({ memberId: recipient.memberId, ok: false });
        }
      } else {
        const failedIndexes = new Set((data?.errors ?? []).map((e) => e.index));
        batch.forEach((recipient, index) => {
          outcomes.push({
            memberId: recipient.memberId,
            ok: !failedIndexes.has(index),
          });
        });
      }
    } catch {
      for (const recipient of batch) {
        outcomes.push({ memberId: recipient.memberId, ok: false });
      }
    }

    if (batchIndex < batches.length - 1) {
      await sleep(RESEND_BATCH_DELAY_MS);
    }
  }

  return outcomes;
}
