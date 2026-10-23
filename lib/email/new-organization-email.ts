import { EMAIL_FROM, resend } from "./client";
import { escapeHtml } from "./escape-html";

const FONT_STACK =
  "'Geist Sans', 'Segoe UI', system-ui, -apple-system, sans-serif";

export interface NewOrganizationEmailParams {
  to: string;
  organizationName: string;
  organizationSlug: string;
  creatorName: string;
  creatorEmail: string;
  createdAt: Date;
  /** Nombre total d'organisations en base, celle-ci comprise (null si le comptage a échoué). */
  totalOrganizations: number | null;
}

/**
 * Email interne envoyé au fondateur d'AssoHub à chaque nouvelle organisation
 * (suivi des inscriptions). Destinataire unique et interne : texte FR seul,
 * pas de version EN.
 */
function newOrganizationEmailHtml(params: NewOrganizationEmailParams): string {
  const createdAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Conakry",
  }).format(params.createdAt);

  const rows: Array<[string, string]> = [
    ["Organisation", params.organizationName],
    ["Identifiant (slug)", params.organizationSlug],
    ["Créée par", `${params.creatorName} — ${params.creatorEmail}`],
    ["Date", `${createdAt} (heure de Conakry)`],
  ];
  if (params.totalOrganizations !== null) {
    rows.push(["Total des organisations", String(params.totalOrganizations)]);
  }

  const rowsHtml = rows
    .map(
      ([label, value]) => `
                  <tr>
                    <td style="padding:8px 12px 8px 0;font-size:13px;color:#6B7280;white-space:nowrap;vertical-align:top;font-family:${FONT_STACK};">${escapeHtml(label)}</td>
                    <td style="padding:8px 0;font-size:14px;color:#0F172A;font-family:${FONT_STACK};">${escapeHtml(value)}</td>
                  </tr>`,
    )
    .join("");

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
              <td style="padding:32px 32px 24px;color:#0F172A;">
                <h1 style="margin:0 0 20px;font-size:20px;font-family:${FONT_STACK};">Nouvelle organisation inscrite</h1>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${rowsHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#f8fafc;text-align:center;">
                <span style="font-size:11px;color:#94a3b8;font-family:${FONT_STACK};">Notification interne — suivi des inscriptions AssoHub</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function newOrganizationEmailText(params: NewOrganizationEmailParams): string {
  const createdAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Conakry",
  }).format(params.createdAt);
  return [
    "Nouvelle organisation inscrite sur AssoHub",
    "",
    `Organisation : ${params.organizationName}`,
    `Identifiant (slug) : ${params.organizationSlug}`,
    `Créée par : ${params.creatorName} — ${params.creatorEmail}`,
    `Date : ${createdAt} (heure de Conakry)`,
    ...(params.totalOrganizations !== null ? [`Total des organisations : ${params.totalOrganizations}`] : []),
  ].join("\n");
}

/**
 * Envoie l'alerte « nouvelle organisation ». Même gestion d'erreur que les
 * autres emails : le SDK Resend ne lève pas d'exception pour les erreurs API,
 * on inspecte `error` et on lève nous-mêmes — c'est l'appelant
 * (`notifyNewOrganization`) qui rend l'envoi best-effort.
 */
export async function sendNewOrganizationEmail(params: NewOrganizationEmailParams): Promise<void> {
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `Nouvelle organisation : ${params.organizationName}`,
    html: newOrganizationEmailHtml(params),
    text: newOrganizationEmailText(params),
  });
  console.log("[admin] Resend response (new organization email)", { data, error });

  if (error) {
    throw new Error(`Resend error: ${error.name} — ${error.message}`);
  }
}
