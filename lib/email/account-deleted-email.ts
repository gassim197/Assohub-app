import { EMAIL_FROM, resend } from "./client";

const FONT_STACK =
  "'Geist Sans', 'Segoe UI', system-ui, -apple-system, sans-serif";

export interface AccountDeletedEmailParams {
  to: string;
}

/**
 * Textes FR (défaut V1) et EN (préparé, non câblé — même convention que
 * `verification-email.ts`).
 */
const STRINGS = {
  fr: {
    subject: "Votre compte AssoHub a été supprimé",
    title: "Compte supprimé",
    body: "Votre compte AssoHub a bien été supprimé, à votre demande. Vos informations personnelles ont été anonymisées et vous avez été retiré de toutes vos organisations.",
    footerNote: "Si vous n'êtes pas à l'origine de cette suppression, contactez notre support au plus vite.",
    signature: "L'équipe AssoHub",
    footer: "AssoHub — L'infrastructure numérique des organisations africaines",
  },
  en: {
    subject: "Your AssoHub account has been deleted",
    title: "Account deleted",
    body: "Your AssoHub account has been deleted, as requested. Your personal information has been anonymized and you've been removed from all your organizations.",
    footerNote: "If you didn't request this deletion, please contact our support as soon as possible.",
    signature: "The AssoHub team",
    footer: "AssoHub — The digital infrastructure for African organizations",
  },
} as const;

type AccountDeletedLocale = keyof typeof STRINGS;

/**
 * Template de l'email de confirmation de suppression de compte (chantier
 * "zone de danger") — même patron visuel que `verification-email.ts` : header
 * navy + logo, corps clair, footer AssoHub. Pas de CTA (rien à cliquer, le
 * compte n'existe plus).
 */
function accountDeletedEmailHtml(locale: AccountDeletedLocale): string {
  const s = STRINGS[locale];

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
                  ${s.body}
                </p>
                <p style="margin:0;font-size:12px;color:#6B7280;font-family:${FONT_STACK};">
                  <small>${s.footerNote}</small>
                </p>
                <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#334155;font-family:${FONT_STACK};">
                  ${s.signature}
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
 * Envoie l'email de confirmation de suppression, vers l'adresse d'origine
 * (à capturer AVANT l'anonymisation par l'appelant — après anonymisation
 * `user.email` ne pointe plus vers l'ancienne adresse). Best-effort : ne doit
 * jamais faire échouer la suppression elle-même si Resend échoue.
 */
export async function sendAccountDeletedEmail(
  params: AccountDeletedEmailParams,
  locale: AccountDeletedLocale = "fr",
): Promise<void> {
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: STRINGS[locale].subject,
    html: accountDeletedEmailHtml(locale),
  });
  console.log("[settings] Resend response (account deleted email)", { to: params.to, data, error });

  if (error) {
    throw new Error(`Resend error: ${error.name} — ${error.message}`);
  }
}
