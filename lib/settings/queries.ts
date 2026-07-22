import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { account, organization, user } from "@/lib/db/auth-schema";
import { parseOrganizationType } from "@/lib/invitations/queries";

export interface OrganizationSettings {
  name: string;
  type: string | null;
}

/** Nom + type courants de l'organisation, pour préremplir le formulaire Paramètres. */
export async function getOrganizationSettings(
  organizationId: string,
): Promise<OrganizationSettings | null> {
  const [row] = await db
    .select({ name: organization.name, metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!row) return null;
  return { name: row.name, type: parseOrganizationType(row.metadata) };
}

export interface UserProfile {
  name: string;
  email: string;
}

/** Nom + email courants de l'utilisateur, pour préremplir le formulaire Profil. */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const [row] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row ?? null;
}

/**
 * Un utilisateur inscrit uniquement via Google n'a pas de compte
 * `credential` (email/mot de passe) — utilisé pour afficher "Changer le mot
 * de passe" (a déjà un mot de passe) vs "Définir un mot de passe" (Google-only).
 */
export async function hasCredentialAccount(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  return Boolean(row);
}
