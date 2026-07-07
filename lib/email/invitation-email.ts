import { getAppUrl } from "@/lib/url";
import { EMAIL_FROM, resend } from "./client";

const FONT_STACK =
  "'Geist Sans', 'Segoe UI', system-ui, -apple-system, sans-serif";

export interface InvitationEmailParams {
  to: string;
  organizationName: string;
  inviterName: string;
  roleLabel: string;
  personalMessage: string | null;
  acceptUrl: string;
}

// Les valeurs interpolées (nom de l'org, de l'inviteur, message perso) viennent
// de saisies utilisateur : on échappe avant de les injecter dans le HTML de
// l'email pour éviter toute casse de structure ou injection de balises.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Template basique de l'email d'invitation (volet 1). Sobre et fonctionnel :
 * header avec le nom AssoHub, corps clair, CTA emerald, footer minimal.
 * Peaufiné visuellement au volet 5 (CP5).
 */
function invitationEmailHtml(params: InvitationEmailParams): string {
  const organizationName = escapeHtml(params.organizationName);
  const inviterName = escapeHtml(params.inviterName);
  const roleLabel = escapeHtml(params.roleLabel);
  const personalMessage = params.personalMessage
    ? escapeHtml(params.personalMessage)
    : null;
  const { acceptUrl } = params;
  const logoUrl = `${getAppUrl()}/brand/logo-mark-dark.svg`;

  return `
<!doctype html>
<html lang="fr">
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
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:10px;vertical-align:middle;">
                      <img src="${logoUrl}" width="28" height="28" alt="" style="display:block;border:0;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="color:#ffffff;font-size:18px;font-weight:bold;font-family:${FONT_STACK};">AssoHub</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;color:#0F172A;">
                <h1 style="margin:0 0 20px;font-size:20px;font-family:${FONT_STACK};">Vous êtes invité(e) à rejoindre ${organizationName}</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;font-family:${FONT_STACK};">
                  ${inviterName} vous invite à rejoindre <strong>${organizationName}</strong> sur AssoHub, en tant que <strong>${roleLabel}</strong>.
                </p>
                ${
                  personalMessage
                    ? `<p style="margin:0 0 16px;padding:14px 16px;background-color:#f8fafc;border-left:3px solid #10B981;font-size:14px;line-height:1.6;color:#334155;font-style:italic;font-family:${FONT_STACK};">${personalMessage}</p>`
                    : ""
                }
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                  <tr>
                    <td style="border-radius:6px;background-color:#10B981;">
                      <a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;font-family:${FONT_STACK};">
                        Accepter l'invitation
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;color:#6B7280;font-family:${FONT_STACK};">
                  <small>Ce lien expire dans 30 jours. Si vous ne vous attendiez pas à cette invitation, vous pouvez ignorer cet email.</small>
                </p>
                <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#334155;font-family:${FONT_STACK};">
                  À bientôt sur AssoHub,<br />
                  L'équipe AssoHub
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#f8fafc;text-align:center;">
                <span style="font-size:11px;color:#94a3b8;font-family:${FONT_STACK};">AssoHub — L'infrastructure numérique des organisations africaines</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendInvitationEmail(
  params: InvitationEmailParams,
): Promise<void> {
  console.log("[invitations] Sending invitation email to", params.to);
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `Invitation à rejoindre ${params.organizationName} sur AssoHub`,
    html: invitationEmailHtml(params),
  });
  console.log("[invitations] Resend response", { data, error });

  // Le SDK Resend ne lève pas d'exception pour les erreurs API (clé
  // invalide, domaine non vérifié, destinataire hors sandbox...) : il
  // faut inspecter `error` explicitement pour que l'appelant puisse
  // logguer/gérer l'échec via son propre try/catch.
  if (error) {
    throw new Error(`Resend error: ${error.name} — ${error.message}`);
  }
}
