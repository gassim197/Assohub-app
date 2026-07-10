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
    dueAmount: "Montant dû",
    paidAmount: "Déjà payé",
    remaining: "Restant à régler",
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
    dueAmount: "Amount due",
    paidAmount: "Already paid",
    remaining: "Remaining balance",
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

/**
 * Template de l'email de relance (session 5C §5), même patron visuel que
 * l'email d'invitation (`invitation-email.ts`) : header navy + logo texte,
 * corps clair, encart informatif, footer AssoHub. Volontairement **sans**
 * CTA « payer en ligne » — le paiement en ligne n'existe pas en V1, le
 * rappel informe, il n'encaisse pas.
 */
function reminderEmailHtml(
  params: PaymentReminderEmailParams,
  locale: ReminderLocale,
): string {
  const s = STRINGS[locale];
  const memberFirstName = escapeHtml(firstName(params.memberFullName));
  const organizationName = escapeHtml(params.organizationName);
  const cotisationTypeName = escapeHtml(params.cotisationTypeName);
  const periodLabel = escapeHtml(params.periodLabel);
  const remainingAmountLabel = escapeHtml(params.remainingAmountLabel);
  const dueAmountLabel = escapeHtml(params.dueAmountLabel);
  const paidAmountLabel = params.paidAmountLabel
    ? escapeHtml(params.paidAmountLabel)
    : null;

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
                  ${s.body(cotisationTypeName, periodLabel, remainingAmountLabel, organizationName)}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f8fafc;border-radius:6px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;font-family:${FONT_STACK};color:#334155;">
                        <tr>
                          <td style="padding:4px 0;color:#64748b;">${s.period}</td>
                          <td style="padding:4px 0;text-align:right;font-weight:bold;">${periodLabel}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;color:#64748b;">${s.dueAmount}</td>
                          <td style="padding:4px 0;text-align:right;font-weight:bold;">${dueAmountLabel}</td>
                        </tr>
                        ${
                          paidAmountLabel
                            ? `<tr>
                          <td style="padding:4px 0;color:#64748b;">${s.paidAmount}</td>
                          <td style="padding:4px 0;text-align:right;font-weight:bold;">${paidAmountLabel}</td>
                        </tr>`
                            : ""
                        }
                        <tr>
                          <td style="padding:4px 0;color:#64748b;">${s.remaining}</td>
                          <td style="padding:4px 0;text-align:right;font-weight:bold;color:#10B981;">${remainingAmountLabel}</td>
                        </tr>
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
