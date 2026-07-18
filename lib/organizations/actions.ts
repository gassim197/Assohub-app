"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export type SwitchOrganizationResult = {
  ok: false;
  error: "notMember" | "unknown";
};

/**
 * Bascule l'organisation active de l'utilisateur (switcher d'organisations,
 * session 8B) — passe intégralement par l'API native Better-Auth
 * (`auth.api.setActiveOrganization`), jamais de manipulation manuelle de la
 * session. Cette API vérifie déjà en interne que l'utilisateur est membre de
 * l'organisation cible et lève une `APIError` sinon — aucune vérification
 * de membership à dupliquer ici (même patron `try/catch` que
 * `auth.api.signUpEmail` dans `lib/invitations/actions.ts`).
 */
export async function switchActiveOrganization(
  organizationId: string,
): Promise<SwitchOrganizationResult | void> {
  let organization;
  try {
    organization = await auth.api.setActiveOrganization({
      headers: await headers(),
      body: { organizationId },
    });
  } catch {
    return { ok: false, error: "notMember" };
  }

  if (!organization) {
    return { ok: false, error: "unknown" };
  }

  redirect(`/${organization.slug}`);
}
