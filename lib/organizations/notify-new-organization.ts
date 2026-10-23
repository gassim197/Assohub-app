import { count } from "drizzle-orm";
import { after } from "next/server";

import { db } from "@/lib/db";
import { organization as organizationTable } from "@/lib/db/auth-schema";
import { sendNewOrganizationEmail } from "@/lib/email/new-organization-email";

/**
 * Suivi des inscriptions : prévient le fondateur d'AssoHub à chaque nouvelle
 * organisation. Appelé depuis le hook Better-Auth `afterCreateOrganization`.
 *
 * - Destinataire : variable d'environnement `ADMIN_NOTIFICATION_EMAIL`. Si elle
 *   est absente (dev, preview), rien n'est envoyé.
 * - Best-effort : n'échoue jamais. L'organisation est déjà créée quand le hook
 *   s'exécute ; une panne de Resend ne doit ni bloquer ni faire échouer
 *   l'onboarding.
 * - Non bloquant : l'envoi est planifié avec `after()` (exécuté après la
 *   réponse, la fonction Vercel reste active jusqu'à la fin de l'envoi). Hors
 *   d'une requête Next.js (script), `after()` lève : on envoie alors
 *   directement.
 */
export function notifyNewOrganization(params: {
  organization: { name: string; slug: string; createdAt?: Date | null };
  user: { name: string | null; email: string | null };
}): void {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (!to) return;

  const createdAt = params.organization.createdAt ?? new Date();

  const send = async () => {
    try {
      let totalOrganizations: number | null = null;
      try {
        const [row] = await db.select({ n: count() }).from(organizationTable);
        totalOrganizations = row?.n ?? null;
      } catch (error) {
        console.error("[admin] Comptage des organisations impossible", error);
      }

      await sendNewOrganizationEmail({
        to,
        organizationName: params.organization.name,
        organizationSlug: params.organization.slug,
        creatorName: params.user.name ?? "(sans nom)",
        creatorEmail: params.user.email ?? "(sans email)",
        createdAt,
        totalOrganizations,
      });
    } catch (error) {
      console.error("[admin] Notification « nouvelle organisation » non envoyée", error);
    }
  };

  try {
    after(send);
  } catch {
    void send();
  }
}
