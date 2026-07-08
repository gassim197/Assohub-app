import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { organization, user } from "@/lib/db/auth-schema";
import { organizationInviteLinks, pendingInvitations } from "@/lib/db/members-schema";

export type PendingInvitationRow = typeof pendingInvitations.$inferSelect;

/**
 * Invitations non résolues d'une organisation (schema-design §4.4) : ni
 * acceptées, ni refusées, ni archivées. Inclut les invitations expirées (le
 * statut d'affichage — dont "expirée" — se calcule côté UI via
 * `invitationStatus`), pour que le président puisse les renvoyer/annuler.
 */
export async function listPendingInvitations(
  organizationId: string,
): Promise<PendingInvitationRow[]> {
  return db
    .select()
    .from(pendingInvitations)
    .where(
      and(
        eq(pendingInvitations.organizationId, organizationId),
        isNull(pendingInvitations.acceptedAt),
        isNull(pendingInvitations.declinedAt),
        isNull(pendingInvitations.deletedAt),
      ),
    )
    .orderBy(desc(pendingInvitations.createdAt));
}

/**
 * Compte les invitations réellement "en attente" (ni résolues, ni expirées) —
 * utilisé pour le badge compteur de l'onglet ("Invitations (N en attente)").
 */
export function countActuallyPending(rows: PendingInvitationRow[]): number {
  const now = Date.now();
  return rows.filter((row) => row.expiresAt.getTime() >= now).length;
}

export interface InvitationWithContext {
  invitation: PendingInvitationRow;
  organization: { id: string; name: string; slug: string; metadata: string | null } | null;
  inviterName: string | null;
}

/**
 * Résout un token public d'invitation (route `/invitations/accept/[token]`,
 * volet 2 de la 4B) : le token est la SEULE clé d'autorisation de cette page,
 * il n'y a délibérément aucun `requireOrgAccess` ici. `organization` est
 * `leftJoin`é (jamais `null` en pratique tant que la FK l'empêche, mais on ne
 * fait pas confiance à cette contrainte pour l'affichage — cf. cas d'erreur
 * "organisation supprimée").
 */
export async function getInvitationByToken(
  token: string,
): Promise<InvitationWithContext | null> {
  const [row] = await db
    .select({
      invitation: pendingInvitations,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        metadata: organization.metadata,
      },
      inviterName: user.name,
    })
    .from(pendingInvitations)
    .leftJoin(organization, eq(pendingInvitations.organizationId, organization.id))
    .leftJoin(user, eq(pendingInvitations.invitedByUserId, user.id))
    .where(and(eq(pendingInvitations.token, token), isNull(pendingInvitations.deletedAt)))
    .limit(1);

  return row ?? null;
}

// Miroir de `ORG_TYPES` dans `app/(auth)/onboarding/page.tsx` — dupliqué ici
// plutôt qu'importé depuis un Client Component. Garde nécessaire : un type
// inconnu ferait planter `t("onboarding.orgTypes.<type>")` côté page.
const KNOWN_ORG_TYPES = ["student", "ngo", "community", "network", "other"] as const;

/** Type d'organisation saisi à l'onboarding, stocké en JSON dans `organization.metadata`. */
export function parseOrganizationType(metadata: string | null): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { type?: unknown };
    return (KNOWN_ORG_TYPES as readonly string[]).includes(parsed.type as string)
      ? (parsed.type as string)
      : null;
  } catch {
    return null;
  }
}

/** Existe-t-il déjà un compte AssoHub pour cet email ? Pilote le CTA intelligent. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return row?.id ?? null;
}

export type OrganizationInviteLinkRow = typeof organizationInviteLinks.$inferSelect;

/**
 * Lien d'invitation partageable actif d'une organisation (volet 3 de la 4B,
 * checkpoint 1) : au plus un à la fois (garanti côté écriture par
 * `generateOrganizationInviteLink`, qui révoque l'ancien avant d'insérer le
 * nouveau). Un lien expiré ou épuisé (quota atteint) mais pas encore révoqué
 * est traité comme "aucun lien actif" — l'UI propose alors d'en régénérer un.
 */
export async function getActiveOrganizationInviteLink(
  organizationId: string,
): Promise<OrganizationInviteLinkRow | null> {
  const [row] = await db
    .select()
    .from(organizationInviteLinks)
    .where(
      and(
        eq(organizationInviteLinks.organizationId, organizationId),
        isNull(organizationInviteLinks.revokedAt),
        isNull(organizationInviteLinks.deletedAt),
      ),
    )
    .orderBy(desc(organizationInviteLinks.createdAt))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
  if (row.maxUses !== null && row.usesCount >= row.maxUses) return null;
  return row;
}
