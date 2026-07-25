import { EMAIL_FROM, resend } from "./client";
import { escapeHtml } from "./escape-html";

const FONT_STACK =
  "'Geist Sans', 'Segoe UI', system-ui, -apple-system, sans-serif";

export interface VerificationEmailParams {
  to: string;
  verifyUrl: string;
}

/**
 * Textes FR (défaut V1) et EN (préparé, non câblé — même convention que
 * `reminder-email.ts` : aucune préférence de langue par utilisateur n'existe
 * encore, bake seulement).
 */
const STRINGS = {
  fr: {
    subject: "Confirmez votre adresse email — AssoHub",
    title: "Bienvenue sur AssoHub !",
    body: "Confirmez votre adresse email pour activer votre compte.",
    cta: "Vérifier mon adresse email",
    expiry: "Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email.",
    signature: "À bientôt sur AssoHub,<br />L'équipe AssoHub",
    footer: "AssoHub — L'infrastructure numérique des organisations africaines",
  },
  en: {
    subject: "Confirm your email address — AssoHub",
    title: "Welcome to AssoHub!",
    body: "Confirm your email address to activate your account.",
    cta: "Verify my email address",
    expiry: "This link expires in 24 hours. If you didn't request this sign-up, you can safely ignore this email.",
    signature: "See you soon on AssoHub,<br />The AssoHub team",
    footer: "AssoHub — The digital infrastructure for African organizations",
  },
} as const;

type VerificationLocale = keyof typeof STRINGS;

/**
 * Template de l'email de vérification (volet auth, chantier 3) — même patron
 * visuel que `invitation-email.ts` : header navy + logo, corps clair, CTA
 * emerald, footer AssoHub.
 */
function verificationEmailHtml(
  params: VerificationEmailParams,
  locale: VerificationLocale,
): string {
  const s = STRINGS[locale];
  const { verifyUrl } = params;

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
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                  <tr>
                    <td style="border-radius:6px;background-color:#10B981;">
                      <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;font-family:${FONT_STACK};">
                        ${s.cta}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;color:#6B7280;font-family:${FONT_STACK};">
                  <small>${s.expiry}</small>
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
 * Envoie l'email de vérification (volet auth, chantier 3). Même gestion
 * d'erreur que `sendInvitationEmail`/`sendPaymentReminderEmail` : le SDK
 * Resend ne lève pas d'exception pour les erreurs API, il faut inspecter
 * `error` explicitement.
 */
export async function sendVerificationEmail(
  params: VerificationEmailParams,
  locale: VerificationLocale = "fr",
): Promise<void> {
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: STRINGS[locale].subject,
    html: verificationEmailHtml(params, locale),
  });
  console.log("[auth] Resend response (verification email)", { to: params.to, data, error });

  if (error) {
    throw new Error(`Resend error: ${error.name} — ${error.message}`);
  }
}
